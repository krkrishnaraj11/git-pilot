use crate::backup;
use crate::db::{self, AuditEntry, DbState};
use git2::{MergeAnalysis, Repository};
use serde::{Deserialize, Serialize};
use tauri::State;

const OLLAMA_BASE: &str = "http://localhost:11434";

// ─── Types ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct MergePreview {
    pub can_fast_forward: bool,
    pub has_conflicts: bool,
    pub conflict_files: Vec<ConflictFile>,
    pub files_changed: usize,
    pub commits_to_merge: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConflictFile {
    pub path: String,
    pub current_content: String,
    pub incoming_content: String,
    pub base_content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MergeResult {
    pub success: bool,
    pub has_conflicts: bool,
    pub conflict_files: Vec<String>,
    pub commit_hash: Option<String>,
    pub error: Option<String>,
    pub backup_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConflictResolution {
    pub resolved_content: String,
    pub reasoning: String,
    pub confidence: String,
}

fn make_audit(action: &str, repo_path: &str, details: &str) -> AuditEntry {
    AuditEntry {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        action: action.to_string(),
        identity_id: None,
        identity_label: None,
        repo_path: Some(repo_path.to_string()),
        details: Some(details.to_string()),
    }
}

// ═══════════════════════════════════════════════════════════════
// 1. preview_merge
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn preview_merge(
    repo_path: String,
    source_branch: String,
    target_branch: String,
) -> Result<MergePreview, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Resolve source branch to annotated commit
    let source_ref = repo
        .find_branch(&source_branch, git2::BranchType::Local)
        .map_err(|e| format!("Source branch '{}' not found: {}", source_branch, e))?;
    let source_oid = source_ref
        .get()
        .target()
        .ok_or("Source branch has no target")?;
    let source_annotated = repo
        .find_annotated_commit(source_oid)
        .map_err(|e| e.to_string())?;

    // Check merge analysis
    let (analysis, _) = repo
        .merge_analysis(&[&source_annotated])
        .map_err(|e| e.to_string())?;

    let can_fast_forward = analysis.contains(MergeAnalysis::ANALYSIS_FASTFORWARD);

    // Count commits to merge
    let target_ref = repo
        .find_branch(&target_branch, git2::BranchType::Local)
        .map_err(|e| format!("Target branch '{}' not found: {}", target_branch, e))?;
    let target_oid = target_ref
        .get()
        .target()
        .ok_or("Target branch has no target")?;

    let merge_base = repo
        .merge_base(target_oid, source_oid)
        .unwrap_or(source_oid);

    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push(source_oid).map_err(|e| e.to_string())?;
    let commits_to_merge = revwalk
        .take_while(|oid| oid.as_ref().map(|o| *o != merge_base).unwrap_or(false))
        .count();

    // Try in-memory merge to detect conflicts
    let source_commit = repo.find_commit(source_oid).map_err(|e| e.to_string())?;
    let target_commit = repo.find_commit(target_oid).map_err(|e| e.to_string())?;
    let ancestor = repo
        .find_commit(merge_base)
        .ok()
        .and_then(|c| c.tree().ok());

    let source_tree = source_commit.tree().map_err(|e| e.to_string())?;
    let target_tree = target_commit.tree().map_err(|e| e.to_string())?;

    let mut merge_opts = git2::MergeOptions::new();
    let index = repo
        .merge_trees(
            ancestor.as_ref().unwrap_or(&target_tree),
            &target_tree,
            &source_tree,
            Some(&mut merge_opts),
        )
        .map_err(|e| e.to_string())?;

    let has_conflicts = index.has_conflicts();
    let mut conflict_files = Vec::new();

    if has_conflicts {
        if let Ok(conflicts) = index.conflicts() {
            for conflict in conflicts {
                if let Ok(conflict) = conflict {
                    let path = conflict
                        .our
                        .as_ref()
                        .or(conflict.their.as_ref())
                        .or(conflict.ancestor.as_ref())
                        .and_then(|e| String::from_utf8(e.path.clone()).ok())
                        .unwrap_or_default();

                    let get_blob_content = |entry: &Option<git2::IndexEntry>| -> String {
                        entry
                            .as_ref()
                            .and_then(|e| repo.find_blob(e.id).ok())
                            .map(|b| String::from_utf8_lossy(b.content()).to_string())
                            .unwrap_or_default()
                    };

                    conflict_files.push(ConflictFile {
                        path,
                        current_content: get_blob_content(&conflict.our),
                        incoming_content: get_blob_content(&conflict.their),
                        base_content: get_blob_content(&conflict.ancestor),
                    });
                }
            }
        }
    }

    // Count files changed
    let diff = repo
        .diff_tree_to_tree(Some(&target_tree), Some(&source_tree), None)
        .map_err(|e| e.to_string())?;
    let files_changed = diff.deltas().len();

    Ok(MergePreview {
        can_fast_forward,
        has_conflicts,
        conflict_files,
        files_changed,
        commits_to_merge,
    })
}

// ═══════════════════════════════════════════════════════════════
// 2. execute_merge
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn execute_merge(
    state: State<DbState>,
    repo_path: String,
    source_branch: String,
    do_backup: bool,
) -> Result<MergeResult, String> {
    let backup_branch = if do_backup {
        match backup::create_backup(state.clone(), repo_path.clone(), "merge".to_string()) {
            Ok(info) => Some(info.backup_branch),
            Err(e) => return Err(format!("Backup failed: {}", e)),
        }
    } else {
        None
    };

    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let source_ref = repo
        .find_branch(&source_branch, git2::BranchType::Local)
        .map_err(|e| format!("Source branch '{}' not found: {}", source_branch, e))?;
    let source_oid = source_ref
        .get()
        .target()
        .ok_or("Source branch has no target")?;
    let source_annotated = repo
        .find_annotated_commit(source_oid)
        .map_err(|e| e.to_string())?;

    let (analysis, _) = repo
        .merge_analysis(&[&source_annotated])
        .map_err(|e| e.to_string())?;

    // Fast-forward if possible
    if analysis.contains(MergeAnalysis::ANALYSIS_FASTFORWARD) {
        let source_commit = repo.find_commit(source_oid).map_err(|e| e.to_string())?;
        let obj = source_commit.as_object();
        repo.checkout_tree(obj, None).map_err(|e| e.to_string())?;

        let mut head_ref = repo.head().map_err(|e| e.to_string())?;
        head_ref
            .set_target(source_oid, &format!("Fast-forward merge {}", source_branch))
            .map_err(|e| e.to_string())?;

        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let entry = make_audit(
            "merge",
            &repo_path,
            &format!("Fast-forward merged {} ({})", source_branch, &source_oid.to_string()[..8]),
        );
        let _ = db::log_action(&conn, &entry);

        return Ok(MergeResult {
            success: true,
            has_conflicts: false,
            conflict_files: vec![],
            commit_hash: Some(source_oid.to_string()),
            error: None,
            backup_branch,
        });
    }

    // Normal merge
    if analysis.contains(MergeAnalysis::ANALYSIS_NORMAL) {
        let source_commit = repo.find_commit(source_oid).map_err(|e| e.to_string())?;

        repo.merge(&[&source_annotated], None, None)
            .map_err(|e| e.to_string())?;

        let index = repo.index().map_err(|e| e.to_string())?;

        if index.has_conflicts() {
            // Collect conflict file paths
            let mut conflict_files = Vec::new();
            if let Ok(conflicts) = index.conflicts() {
                for conflict in conflicts {
                    if let Ok(c) = conflict {
                        let path = c
                            .our
                            .as_ref()
                            .or(c.their.as_ref())
                            .and_then(|e| String::from_utf8(e.path.clone()).ok())
                            .unwrap_or_default();
                        conflict_files.push(path);
                    }
                }
            }

            let conn = state.0.lock().map_err(|e| e.to_string())?;
            let entry = make_audit(
                "merge",
                &repo_path,
                &format!(
                    "Merge of {} has {} conflict(s)",
                    source_branch,
                    conflict_files.len()
                ),
            );
            let _ = db::log_action(&conn, &entry);

            return Ok(MergeResult {
                success: false,
                has_conflicts: true,
                conflict_files,
                commit_hash: None,
                error: None,
                backup_branch,
            });
        }

        // No conflicts — auto-commit
        let mut index = repo.index().map_err(|e| e.to_string())?;
        let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
        let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

        let head_commit = repo
            .head()
            .map_err(|e| e.to_string())?
            .peel_to_commit()
            .map_err(|e| e.to_string())?;

        let config = repo.config().map_err(|e| e.to_string())?;
        let name = config
            .get_string("user.name")
            .unwrap_or_else(|_| "Unknown".to_string());
        let email = config
            .get_string("user.email")
            .unwrap_or_else(|_| "unknown@unknown".to_string());
        let sig = git2::Signature::now(&name, &email).map_err(|e| e.to_string())?;

        let msg = format!("Merge branch '{}'", source_branch);
        let oid = repo
            .commit(
                Some("HEAD"),
                &sig,
                &sig,
                &msg,
                &tree,
                &[&head_commit, &source_commit],
            )
            .map_err(|e| e.to_string())?;

        // Clean up merge state
        repo.cleanup_state().map_err(|e| e.to_string())?;

        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let entry = make_audit(
            "merge",
            &repo_path,
            &format!("Merged {} — {}", source_branch, &oid.to_string()[..8]),
        );
        let _ = db::log_action(&conn, &entry);

        return Ok(MergeResult {
            success: true,
            has_conflicts: false,
            conflict_files: vec![],
            commit_hash: Some(oid.to_string()),
            error: None,
            backup_branch,
        });
    }

    Ok(MergeResult {
        success: false,
        has_conflicts: false,
        conflict_files: vec![],
        commit_hash: None,
        error: Some("Nothing to merge — already up to date".to_string()),
        backup_branch,
    })
}

// ═══════════════════════════════════════════════════════════════
// 3. resolve_conflict
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn resolve_conflict(
    repo_path: String,
    file_path: String,
    resolution: String,
) -> Result<bool, String> {
    let full_path = std::path::Path::new(&repo_path).join(&file_path);
    std::fs::write(&full_path, &resolution)
        .map_err(|e| format!("Failed to write resolution: {}", e))?;

    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 4. abort_merge
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn abort_merge(
    state: State<DbState>,
    repo_path: String,
) -> Result<bool, String> {
    let output = std::process::Command::new("git")
        .args(["merge", "--abort"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to abort merge: {}", stderr));
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let entry = make_audit("merge_abort", &repo_path, "Merge aborted");
    let _ = db::log_action(&conn, &entry);

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 5. ai_resolve_conflict
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn ai_resolve_conflict(
    repo_path: String,
    file_path: String,
) -> Result<AiConflictResolution, String> {
    let full_path = std::path::Path::new(&repo_path).join(&file_path);
    let content = std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Parse conflict markers
    let mut ours = String::new();
    let mut theirs = String::new();
    let mut base = String::new();
    let mut section = "none"; // none, ours, base, theirs

    for line in content.lines() {
        if line.starts_with("<<<<<<<") {
            section = "ours";
        } else if line.starts_with("|||||||") {
            section = "base";
        } else if line.starts_with("=======") {
            section = "theirs";
        } else if line.starts_with(">>>>>>>") {
            section = "none";
        } else {
            match section {
                "ours" => {
                    ours.push_str(line);
                    ours.push('\n');
                }
                "base" => {
                    base.push_str(line);
                    base.push('\n');
                }
                "theirs" => {
                    theirs.push_str(line);
                    theirs.push('\n');
                }
                _ => {}
            }
        }
    }

    let system = "You are a git merge conflict resolver. You analyze conflicting code \
        and produce a clean merged result. Respond ONLY with valid JSON in this exact format:\n\
        {\"resolved_content\": \"<merged code>\", \"reasoning\": \"<why this resolution>\", \"confidence\": \"high|medium|low\"}\n\
        Rules:\n\
        - Preserve functionality from both sides when possible\n\
        - Keep the code syntactically correct\n\
        - Do not add comments about the merge\n\
        - Choose the most complete/correct version when they conflict";

    let prompt = format!(
        "Resolve this git merge conflict for file '{}':\n\n\
         CURRENT (ours):\n```\n{}\n```\n\n\
         INCOMING (theirs):\n```\n{}\n```\n\n\
         {}Produce the merged result as JSON.",
        file_path,
        ours.trim(),
        theirs.trim(),
        if !base.is_empty() {
            format!("BASE (common ancestor):\n```\n{}\n```\n\n", base.trim())
        } else {
            String::new()
        }
    );

    // Get active model
    let model = get_active_model();

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "model": model,
        "system": system,
        "prompt": prompt,
        "stream": false,
        "format": "json",
        "options": {
            "temperature": 0.3,
            "top_p": 0.85,
            "repeat_penalty": 1.8,
            "num_predict": 2000
        }
    });

    let resp = client
        .post(&format!("{}/api/generate", OLLAMA_BASE))
        .json(&body)
        .send()
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama returned status {}", resp.status()));
    }

    #[derive(Deserialize)]
    struct OllamaResponse {
        response: Option<String>,
    }

    let gen: OllamaResponse = resp
        .json()
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    let response_text = gen
        .response
        .ok_or("No response from Ollama")?;

    let resolution: AiConflictResolution = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse AI response as JSON: {}. Raw: {}", e, response_text))?;

    Ok(resolution)
}

fn get_active_model() -> String {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .ok();

    if let Some(client) = client {
        if let Ok(resp) = client
            .get(&format!("{}/api/tags", OLLAMA_BASE))
            .send()
        {
            #[derive(Deserialize)]
            struct Tags {
                models: Option<Vec<Model>>,
            }
            #[derive(Deserialize)]
            struct Model {
                name: String,
            }

            if let Ok(tags) = resp.json::<Tags>() {
                if let Some(models) = tags.models {
                    for m in &models {
                        if m.name.contains("qwen2.5-coder") {
                            return m.name.clone();
                        }
                    }
                    if let Some(first) = models.first() {
                        return first.name.clone();
                    }
                }
            }
        }
    }

    "qwen2.5-coder:7b".to_string()
}
