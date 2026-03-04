use git2::Repository;
use serde::{Deserialize, Serialize};
use std::io::BufRead;
use tauri::Emitter;

const LLAMA_SERVER_BASE: &str = "http://localhost:8847";
const MAX_DIFF_CHARS: usize = 4000;
const MAX_FILES_FULL_DIFF: usize = 5;

// ─── Types ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct AiStatus {
    pub running: bool,
    pub model_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct AiCommitResult {
    pub success: bool,
    pub message: Option<String>,
    pub model_used: String,
    pub error: Option<String>,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Option<Vec<ChatChoice>>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: Option<ChatMessage>,
    delta: Option<ChatDelta>,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[derive(Deserialize)]
struct ChatDelta {
    content: Option<String>,
}

// ─── Helpers ────────────────────────────────────────────────

fn get_staged_diff_text(repo_path: &str) -> Result<String, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;
    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());

    let diff = repo
        .diff_tree_to_index(head_tree.as_ref(), None, None)
        .map_err(|e| e.to_string())?;

    let stats = diff.stats().map_err(|e| e.to_string())?;
    let num_files = stats.files_changed();

    let mut file_summaries: Vec<String> = Vec::new();
    for i in 0..diff.deltas().len() {
        let delta = diff.get_delta(i).unwrap();
        let status = match delta.status() {
            git2::Delta::Added => "A",
            git2::Delta::Deleted => "D",
            git2::Delta::Modified => "M",
            git2::Delta::Renamed => "R",
            git2::Delta::Copied => "C",
            _ => "?",
        };
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());
        file_summaries.push(format!("{} {}", status, path));
    }

    if num_files <= MAX_FILES_FULL_DIFF {
        let mut text = String::new();
        text.push_str(&format!("Files changed ({}):\n", num_files));
        for s in &file_summaries {
            text.push_str(&format!("  {}\n", s));
        }
        text.push('\n');

        diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
            if text.len() > MAX_DIFF_CHARS {
                return false;
            }
            let prefix = match line.origin() {
                '+' => "+",
                '-' => "-",
                _ => " ",
            };
            let content = String::from_utf8_lossy(line.content());
            text.push_str(prefix);
            text.push_str(&content);
            true
        })
        .map_err(|e| e.to_string())?;

        if text.len() > MAX_DIFF_CHARS {
            text.truncate(MAX_DIFF_CHARS);
            text.push_str("\n... (truncated)");
        }
        Ok(text)
    } else {
        let mut text = String::new();
        text.push_str(&format!(
            "Large changeset: {} files changed, +{} -{}\n\nFiles:\n",
            num_files,
            stats.insertions(),
            stats.deletions()
        ));
        for s in &file_summaries {
            text.push_str(&format!("  {}\n", s));
        }
        Ok(text)
    }
}

fn build_system_prompt(style: &str) -> String {
    let style_instruction = match style {
        "gitmoji" => {
            "Format: <emoji> type(scope): subject\n\
             Example:\n\u{2728} feat(auth): add OAuth2 login flow\n\n- implement token refresh\n- add login page component"
        }
        "simple" => {
            "Write a clear, plain English commit message in 1-3 lines. No special format.\n\
             Example:\nAdd user authentication with OAuth2 support"
        }
        _ => {
            "Format: type(scope): subject\n\n- details\n\
             Types: feat, fix, chore, refactor, docs, style, test, perf, ci, build\n\
             Example:\nfeat(auth): add OAuth2 login flow\n\n- implement token refresh\n- add login page component"
        }
    };

    format!(
        "You are a git commit message generator. You output ONLY the commit message, nothing else. No explanations, no markdown fences, no preamble.\n\n\
         Rules:\n\
         - Respond ONLY in English\n\
         - Subject line under 72 characters, imperative mood\n\
         - No period at end of subject line\n\
         - Be specific about WHAT changed\n\
         - Do NOT repeat words\n\
         - Keep it concise: 1 subject line + up to 5 bullet points max\n\
         - STOP after the commit message is complete\n\n\
         {}",
        style_instruction
    )
}

fn build_prompt(diff: &str, _style: &str) -> String {
    format!(
        "Generate a commit message for this diff:\n\n{}\n\nCommit message:",
        diff
    )
}

// ═══════════════════════════════════════════════════════════════
// 1. check_ai_status
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn check_ai_status(
    state: tauri::State<crate::sidecar::LlamaServerState>,
) -> AiStatus {
    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            return AiStatus {
                running: false,
                model_id: None,
            }
        }
    };

    let healthy = client
        .get(&format!("{}/health", LLAMA_SERVER_BASE))
        .send()
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    let model_id = state
        .model_path
        .lock()
        .ok()
        .and_then(|p| p.clone());

    AiStatus {
        running: healthy,
        model_id,
    }
}

// ═══════════════════════════════════════════════════════════════
// 2. generate_commit_message (blocking)
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn generate_commit_message(
    repo_path: String,
    style: String,
) -> AiCommitResult {
    let diff = match get_staged_diff_text(&repo_path) {
        Ok(d) => d,
        Err(e) => {
            return AiCommitResult {
                success: false,
                message: None,
                model_used: "llama-server".to_string(),
                error: Some(format!("Failed to get diff: {}", e)),
            }
        }
    };

    if diff.trim().is_empty() {
        return AiCommitResult {
            success: false,
            message: None,
            model_used: "llama-server".to_string(),
            error: Some("No staged changes to analyze".to_string()),
        };
    }

    let system = build_system_prompt(&style);
    let prompt = build_prompt(&diff, &style);

    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return AiCommitResult {
                success: false,
                message: None,
                model_used: "llama-server".to_string(),
                error: Some(format!("HTTP client error: {}", e)),
            }
        }
    };

    let body = serde_json::json!({
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": prompt }
        ],
        "stream": false,
        "temperature": 0.5,
        "top_p": 0.85,
        "max_tokens": 200,
        "stop": ["\n\n\n", "---", "```", "Commit message:"]
    });

    match client
        .post(&format!("{}/v1/chat/completions", LLAMA_SERVER_BASE))
        .json(&body)
        .send()
    {
        Ok(resp) => {
            if !resp.status().is_success() {
                return AiCommitResult {
                    success: false,
                    message: None,
                    model_used: "llama-server".to_string(),
                    error: Some(format!("AI server returned status {}", resp.status())),
                };
            }
            match resp.json::<ChatCompletionResponse>() {
                Ok(gen) => {
                    let content = gen
                        .choices
                        .and_then(|c| c.into_iter().next())
                        .and_then(|c| c.message)
                        .and_then(|m| m.content)
                        .map(|s| s.trim().to_string());

                    AiCommitResult {
                        success: content.is_some(),
                        message: content,
                        model_used: "llama-server".to_string(),
                        error: None,
                    }
                }
                Err(e) => AiCommitResult {
                    success: false,
                    message: None,
                    model_used: "llama-server".to_string(),
                    error: Some(format!("Failed to parse response: {}", e)),
                },
            }
        }
        Err(e) => AiCommitResult {
            success: false,
            message: None,
            model_used: "llama-server".to_string(),
            error: Some(format!(
                "AI request failed: {}. Is the AI engine running?",
                e
            )),
        },
    }
}

// ═══════════════════════════════════════════════════════════════
// 3. generate_commit_message_stream
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn generate_commit_message_stream(
    app: tauri::AppHandle,
    repo_path: String,
    style: String,
) -> Result<String, String> {
    let diff = get_staged_diff_text(&repo_path)?;

    if diff.trim().is_empty() {
        return Err("No staged changes to analyze".to_string());
    }

    let system = build_system_prompt(&style);
    let prompt = build_prompt(&diff, &style);

    std::thread::spawn(move || {
        let client = match reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("ai-error", e.to_string());
                let _ = app.emit("ai-done", ());
                return;
            }
        };

        let body = serde_json::json!({
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": prompt }
            ],
            "stream": true,
            "temperature": 0.4,
            "top_p": 0.9,
            "max_tokens": 300,
            "stop": ["\n\n\n", "---", "```"]
        });

        let resp = match client
            .post(&format!("{}/v1/chat/completions", LLAMA_SERVER_BASE))
            .json(&body)
            .send()
        {
            Ok(r) => r,
            Err(e) => {
                let _ = app.emit("ai-error", format!("AI request failed: {}", e));
                let _ = app.emit("ai-done", ());
                return;
            }
        };

        let reader = std::io::BufReader::new(resp);
        for line in reader.lines() {
            match line {
                Ok(line) => {
                    let line = line.trim().to_string();
                    if line.is_empty() {
                        continue;
                    }
                    // SSE format: "data: {...}" or "data: [DONE]"
                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" {
                            break;
                        }
                        if let Ok(chunk) = serde_json::from_str::<ChatCompletionResponse>(data) {
                            if let Some(choices) = chunk.choices {
                                for choice in choices {
                                    if let Some(delta) = choice.delta {
                                        if let Some(content) = delta.content {
                                            let _ = app.emit("ai-token", content);
                                        }
                                    }
                                    if choice.finish_reason.is_some() {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }

        let _ = app.emit("ai-done", ());
    });

    Ok("llama-server".to_string())
}

// ═══════════════════════════════════════════════════════════════
// 4. explain_diff
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn explain_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());

    let mut opts = git2::DiffOptions::new();
    opts.pathspec(&file_path);

    let diff = repo
        .diff_tree_to_index(head_tree.as_ref(), None, Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut diff_text = String::new();
    diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
        let prefix = match line.origin() {
            '+' => "+",
            '-' => "-",
            _ => " ",
        };
        diff_text.push_str(prefix);
        diff_text.push_str(&String::from_utf8_lossy(line.content()));
        true
    })
    .map_err(|e| e.to_string())?;

    if diff_text.trim().is_empty() {
        return Err("No changes found for this file".to_string());
    }

    let prompt = format!(
        "Explain the following git diff for the file '{}' in plain English. \
         Be concise (2-4 sentences). Focus on what changed and why it might matter.\n\n\
         ```\n{}\n```\n\nExplanation:",
        file_path, diff_text
    );

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful code reviewer. Explain diffs concisely in plain English."
            },
            { "role": "user", "content": prompt }
        ],
        "stream": false,
        "temperature": 0.4,
        "top_p": 0.9,
        "max_tokens": 200,
        "stop": ["\n\n\n", "---", "```"]
    });

    let resp = client
        .post(&format!("{}/v1/chat/completions", LLAMA_SERVER_BASE))
        .json(&body)
        .send()
        .map_err(|e| format!("AI request failed: {}", e))?;

    let gen: ChatCompletionResponse = resp
        .json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(gen
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.message)
        .and_then(|m| m.content)
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "No explanation generated".to_string()))
}
