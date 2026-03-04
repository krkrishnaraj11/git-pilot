use crate::backup;
use crate::db::{self, AuditEntry, DbState};
use crate::git_ops::CommitInfo;
use git2::Repository;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct RebasePreview {
    pub commits_to_replay: Vec<CommitInfo>,
    pub onto_commit: String,
    pub potential_conflicts: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct RebaseResult {
    pub success: bool,
    pub completed: bool,
    pub current_step: usize,
    pub total_steps: usize,
    pub conflict_files: Vec<String>,
    pub error: Option<String>,
    pub backup_branch: Option<String>,
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
// 1. preview_rebase
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn preview_rebase(
    repo_path: String,
    onto_branch: String,
) -> Result<RebasePreview, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let head = repo.head().map_err(|e| e.to_string())?;
    let head_oid = head.target().ok_or("HEAD has no target")?;

    let onto_ref = repo
        .find_branch(&onto_branch, git2::BranchType::Local)
        .map_err(|e| format!("Branch '{}' not found: {}", onto_branch, e))?;
    let onto_oid = onto_ref
        .get()
        .target()
        .ok_or("Onto branch has no target")?;

    let onto_commit_str = onto_oid.to_string();

    let merge_base = repo
        .merge_base(head_oid, onto_oid)
        .map_err(|e| format!("Failed to find merge base: {}", e))?;

    // Collect commits to replay (from HEAD back to merge base)
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push(head_oid).map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(git2::Sort::TIME)
        .map_err(|e| e.to_string())?;

    let mut commits_to_replay = Vec::new();
    for rev_oid in revwalk {
        let rev_oid = rev_oid.map_err(|e| e.to_string())?;
        if rev_oid == merge_base {
            break;
        }
        let c = repo.find_commit(rev_oid).map_err(|e| e.to_string())?;
        let hash = c.id().to_string();
        let short_hash = hash[..8.min(hash.len())].to_string();
        let secs = c.time().seconds();
        let date = chrono::DateTime::from_timestamp(secs, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

        commits_to_replay.push(CommitInfo {
            hash,
            short_hash,
            message: c.message().unwrap_or("").to_string(),
            author_name: c.author().name().unwrap_or("").to_string(),
            author_email: c.author().email().unwrap_or("").to_string(),
            date,
        });
    }

    // Check for potential conflicts by trying an in-memory merge
    let head_commit = repo.find_commit(head_oid).map_err(|e| e.to_string())?;
    let onto_commit = repo.find_commit(onto_oid).map_err(|e| e.to_string())?;
    let base_commit = repo.find_commit(merge_base).map_err(|e| e.to_string())?;

    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;
    let onto_tree = onto_commit.tree().map_err(|e| e.to_string())?;
    let base_tree = base_commit.tree().map_err(|e| e.to_string())?;

    let potential_conflicts = repo
        .merge_trees(&base_tree, &head_tree, &onto_tree, None)
        .map(|idx| idx.has_conflicts())
        .unwrap_or(false);

    Ok(RebasePreview {
        commits_to_replay,
        onto_commit: onto_commit_str,
        potential_conflicts,
    })
}

// ═══════════════════════════════════════════════════════════════
// 2. execute_rebase
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn execute_rebase(
    state: State<DbState>,
    repo_path: String,
    onto_branch: String,
    do_backup: bool,
) -> Result<RebaseResult, String> {
    let backup_branch = if do_backup {
        match backup::create_backup(state.clone(), repo_path.clone(), "rebase".to_string()) {
            Ok(info) => Some(info.backup_branch),
            Err(e) => return Err(format!("Backup failed: {}", e)),
        }
    } else {
        None
    };

    let output = std::process::Command::new("git")
        .args(["rebase", &onto_branch])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let entry = make_audit(
            "rebase",
            &repo_path,
            &format!("Rebased onto {}", onto_branch),
        );
        let _ = db::log_action(&conn, &entry);

        return Ok(RebaseResult {
            success: true,
            completed: true,
            current_step: 0,
            total_steps: 0,
            conflict_files: vec![],
            error: None,
            backup_branch,
        });
    }

    // Parse rebase output for conflicts
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let combined = format!("{}\n{}", stdout, stderr);

    // Check if rebase stopped due to conflicts
    if combined.contains("CONFLICT") || combined.contains("could not apply") {
        let conflict_files = parse_conflict_files(&repo_path);
        let (current_step, total_steps) = parse_rebase_progress(&repo_path);

        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let entry = make_audit(
            "rebase",
            &repo_path,
            &format!(
                "Rebase onto {} has conflicts at step {}/{}",
                onto_branch, current_step, total_steps
            ),
        );
        let _ = db::log_action(&conn, &entry);

        return Ok(RebaseResult {
            success: false,
            completed: false,
            current_step,
            total_steps,
            conflict_files,
            error: None,
            backup_branch,
        });
    }

    Ok(RebaseResult {
        success: false,
        completed: false,
        current_step: 0,
        total_steps: 0,
        conflict_files: vec![],
        error: Some(stderr),
        backup_branch,
    })
}

// ═══════════════════════════════════════════════════════════════
// 3. continue_rebase
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn continue_rebase(
    state: State<DbState>,
    repo_path: String,
) -> Result<RebaseResult, String> {
    let output = std::process::Command::new("git")
        .args(["rebase", "--continue"])
        .current_dir(&repo_path)
        .env("GIT_EDITOR", "true") // skip editor for commit message
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let entry = make_audit("rebase", &repo_path, "Rebase completed");
        let _ = db::log_action(&conn, &entry);

        return Ok(RebaseResult {
            success: true,
            completed: true,
            current_step: 0,
            total_steps: 0,
            conflict_files: vec![],
            error: None,
            backup_branch: None,
        });
    }

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let combined = format!("{}\n{}", stdout, stderr);

    if combined.contains("CONFLICT") {
        let conflict_files = parse_conflict_files(&repo_path);
        let (current_step, total_steps) = parse_rebase_progress(&repo_path);

        return Ok(RebaseResult {
            success: false,
            completed: false,
            current_step,
            total_steps,
            conflict_files,
            error: None,
            backup_branch: None,
        });
    }

    Ok(RebaseResult {
        success: false,
        completed: false,
        current_step: 0,
        total_steps: 0,
        conflict_files: vec![],
        error: Some(stderr),
        backup_branch: None,
    })
}

// ═══════════════════════════════════════════════════════════════
// 4. abort_rebase
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn abort_rebase(
    state: State<DbState>,
    repo_path: String,
) -> Result<bool, String> {
    let output = std::process::Command::new("git")
        .args(["rebase", "--abort"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to abort rebase: {}", stderr));
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let entry = make_audit("rebase_abort", &repo_path, "Rebase aborted");
    let _ = db::log_action(&conn, &entry);

    Ok(true)
}

// ─── Helpers ────────────────────────────────────────────────

fn parse_conflict_files(repo_path: &str) -> Vec<String> {
    let output = std::process::Command::new("git")
        .args(["diff", "--name-only", "--diff-filter=U"])
        .current_dir(repo_path)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout)
                .lines()
                .filter(|l| !l.is_empty())
                .map(|l| l.to_string())
                .collect()
        }
        _ => vec![],
    }
}

fn parse_rebase_progress(repo_path: &str) -> (usize, usize) {
    let rebase_dir = std::path::Path::new(repo_path).join(".git/rebase-merge");
    if !rebase_dir.exists() {
        let rebase_dir = std::path::Path::new(repo_path).join(".git/rebase-apply");
        if !rebase_dir.exists() {
            return (0, 0);
        }
        let current = std::fs::read_to_string(rebase_dir.join("next"))
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0);
        let total = std::fs::read_to_string(rebase_dir.join("last"))
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0);
        return (current, total);
    }

    let current = std::fs::read_to_string(rebase_dir.join("msgnum"))
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0);
    let total = std::fs::read_to_string(rebase_dir.join("end"))
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0);

    (current, total)
}
