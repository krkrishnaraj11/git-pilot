use crate::db::{self, AuditEntry, DbState};
use git2::{
    BranchType, Delta, DiffFormat, DiffOptions, Repository, Signature, StatusOptions,
};
use serde::Serialize;
use std::path::Path;
use tauri::State;

// ─── Diff types ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct DiffResult {
    pub staged: Vec<FileDiff>,
    pub unstaged: Vec<FileDiff>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileDiff {
    pub path: String,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffHunk {
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffLine {
    pub content: String,
    pub line_type: String,
}

// ─── Commit types ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct CommitResult {
    pub success: bool,
    pub commit_hash: Option<String>,
    pub error: Option<String>,
    pub identity_mismatch: bool,
}

// ─── Push/Pull types ────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct PushResult {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PullResult {
    pub success: bool,
    pub error: Option<String>,
    pub commits_pulled: usize,
}

// ─── Branch types ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub last_commit_hash: Option<String>,
    pub last_commit_message: Option<String>,
    pub last_commit_date: Option<String>,
}

// ─── Commit log types ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct CommitInfo {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub date: String,
}

// ─── Stash types ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct StashInfo {
    pub index: usize,
    pub message: String,
    pub date: String,
}

// ─── Helper ─────────────────────────────────────────────────────

fn delta_to_status(delta: Delta) -> &'static str {
    match delta {
        Delta::Added | Delta::Untracked => "added",
        Delta::Deleted => "deleted",
        Delta::Modified => "modified",
        Delta::Renamed => "renamed",
        Delta::Copied => "copied",
        _ => "modified",
    }
}

fn collect_file_diffs(diff: &git2::Diff) -> Vec<FileDiff> {
    let mut files: Vec<FileDiff> = Vec::new();

    // First pass: collect file-level info
    for i in 0..diff.deltas().len() {
        let delta = diff.get_delta(i).unwrap();
        let path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        files.push(FileDiff {
            path,
            status: delta_to_status(delta.status()).to_string(),
            additions: 0,
            deletions: 0,
            hunks: Vec::new(),
        });
    }

    // Second pass: collect hunks and lines
    let mut file_idx: Option<usize> = None;

    let _ = diff.print(DiffFormat::Patch, |delta, hunk, line| {
        let current_path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        // Find matching file
        if file_idx.is_none()
            || files
                .get(file_idx.unwrap())
                .map(|f| f.path != current_path)
                .unwrap_or(true)
        {
            file_idx = files.iter().position(|f| f.path == current_path);
        }

        if let Some(idx) = file_idx {
            if let Some(h) = hunk {
                let header = String::from_utf8_lossy(h.header()).trim().to_string();
                // Ensure we have a hunk for this header
                if files[idx].hunks.is_empty()
                    || files[idx].hunks.last().map(|lh| lh.header != header).unwrap_or(true)
                {
                    files[idx].hunks.push(DiffHunk {
                        header,
                        lines: Vec::new(),
                    });
                }
            }

            let content = String::from_utf8_lossy(line.content()).to_string();
            let line_type = match line.origin() {
                '+' => {
                    files[idx].additions += 1;
                    "add"
                }
                '-' => {
                    files[idx].deletions += 1;
                    "delete"
                }
                _ => "context",
            };

            if let Some(last_hunk) = files[idx].hunks.last_mut() {
                last_hunk.lines.push(DiffLine {
                    content,
                    line_type: line_type.to_string(),
                });
            }
        }

        true
    });

    files
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
// 1. get_repo_diff
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn get_repo_diff(repo_path: String) -> Result<DiffResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Staged: index vs HEAD
    let head_tree = repo
        .head()
        .ok()
        .and_then(|h| h.peel_to_tree().ok());

    let staged_diff = repo
        .diff_tree_to_index(head_tree.as_ref(), None, None)
        .map_err(|e| e.to_string())?;

    // Unstaged: workdir vs index
    let mut opts = DiffOptions::new();
    opts.include_untracked(true);
    let unstaged_diff = repo
        .diff_index_to_workdir(None, Some(&mut opts))
        .map_err(|e| e.to_string())?;

    Ok(DiffResult {
        staged: collect_file_diffs(&staged_diff),
        unstaged: collect_file_diffs(&unstaged_diff),
    })
}

// ═══════════════════════════════════════════════════════════════
// 2. stage_files
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn stage_files(repo_path: String, file_paths: Vec<String>) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    for path in &file_paths {
        let rel = Path::new(path);
        // Check if file exists; if not, it was deleted — remove from index
        let full = Path::new(&repo_path).join(rel);
        if full.exists() {
            index.add_path(rel).map_err(|e| e.to_string())?;
        } else {
            index.remove_path(rel).map_err(|e| e.to_string())?;
        }
    }

    index.write().map_err(|e| e.to_string())?;
    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 3. unstage_files
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn unstage_files(repo_path: String, file_paths: Vec<String>) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Try to get HEAD as a commit object — this is what reset_default needs
    let head_commit = repo
        .head()
        .ok()
        .and_then(|h| h.peel(git2::ObjectType::Commit).ok());

    for path in &file_paths {
        match &head_commit {
            Some(obj) => {
                // Reset file to HEAD state in index
                repo.reset_default(Some(obj), [path.as_str()])
                    .map_err(|e| e.to_string())?;
            }
            None => {
                // No HEAD (initial commit) — remove from index
                let mut index = repo.index().map_err(|e| e.to_string())?;
                index
                    .remove_path(Path::new(path))
                    .map_err(|e| e.to_string())?;
                index.write().map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 4. stage_all
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn stage_all(repo_path: String) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    // Collect paths from status
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    for entry in statuses.iter() {
        if let Some(path) = entry.path() {
            let full = Path::new(&repo_path).join(path);
            if full.exists() {
                index
                    .add_path(Path::new(path))
                    .map_err(|e| e.to_string())?;
            } else {
                index
                    .remove_path(Path::new(path))
                    .map_err(|e| e.to_string())?;
            }
        }
    }

    index.write().map_err(|e| e.to_string())?;
    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 5. commit
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn commit(
    state: State<DbState>,
    repo_path: String,
    message: String,
    identity_id: Option<String>,
) -> Result<CommitResult, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let config = repo.config().map_err(|e| e.to_string())?;

    let name = config
        .get_string("user.name")
        .unwrap_or_else(|_| "Unknown".to_string());
    let email = config
        .get_string("user.email")
        .unwrap_or_else(|_| "unknown@unknown".to_string());

    // Check identity mismatch if identity_id provided
    let mut identity_mismatch = false;
    if let Some(ref id) = identity_id {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        if let Ok(Some(db_id)) = db::get_identity(&conn, id) {
            if db_id.git_name != name || db_id.git_email != email {
                identity_mismatch = true;
            }
        }
    }

    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();

    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| {
            return CommitResult {
                success: false,
                commit_hash: None,
                error: Some(e.to_string()),
                identity_mismatch,
            };
        });

    match oid {
        Ok(oid) => {
            let hash = oid.to_string();

            // Log to audit
            let conn = state.0.lock().map_err(|e| e.to_string())?;
            let entry = make_audit(
                "commit",
                &repo_path,
                &format!("Committed {} — {}", &hash[..8], message),
            );
            let _ = db::log_action(&conn, &entry);

            Ok(CommitResult {
                success: true,
                commit_hash: Some(hash),
                error: None,
                identity_mismatch,
            })
        }
        Err(result) => Ok(result),
    }
}

// ═══════════════════════════════════════════════════════════════
// 6. push — shells out to git CLI for auth support
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn push(state: State<DbState>, repo_path: String) -> Result<PushResult, String> {
    let output = std::process::Command::new("git")
        .args(["push"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    let success = output.status.success();
    let error = if success {
        None
    } else {
        Some(String::from_utf8_lossy(&output.stderr).to_string())
    };

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let detail = if success {
        "Push succeeded".to_string()
    } else {
        format!("Push failed: {}", error.as_deref().unwrap_or("unknown"))
    };
    let entry = make_audit("push", &repo_path, &detail);
    let _ = db::log_action(&conn, &entry);

    Ok(PushResult { success, error })
}

// ═══════════════════════════════════════════════════════════════
// 7. pull — fetch + merge via CLI
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn pull(state: State<DbState>, repo_path: String) -> Result<PullResult, String> {
    // Count commits before pull
    let before_count = count_commits(&repo_path);

    let output = std::process::Command::new("git")
        .args(["pull"])
        .current_dir(&repo_path)
        .output()
        .map_err(|e| e.to_string())?;

    let success = output.status.success();
    let error = if success {
        None
    } else {
        Some(String::from_utf8_lossy(&output.stderr).to_string())
    };

    let after_count = count_commits(&repo_path);
    let commits_pulled = after_count.saturating_sub(before_count);

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let detail = if success {
        format!("Pulled {} new commit(s)", commits_pulled)
    } else {
        format!("Pull failed: {}", error.as_deref().unwrap_or("unknown"))
    };
    let entry = make_audit("pull", &repo_path, &detail);
    let _ = db::log_action(&conn, &entry);

    Ok(PullResult {
        success,
        error,
        commits_pulled,
    })
}

fn count_commits(repo_path: &str) -> usize {
    Repository::open(repo_path)
        .ok()
        .and_then(|repo| {
            let head = repo.head().ok()?;
            let oid = head.target()?;
            let mut revwalk = repo.revwalk().ok()?;
            revwalk.push(oid).ok()?;
            Some(revwalk.count())
        })
        .unwrap_or(0)
}

// ═══════════════════════════════════════════════════════════════
// 8. get_branches
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn get_branches(repo_path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut branches = Vec::new();

    let current = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));

    for branch_result in repo
        .branches(None)
        .map_err(|e| e.to_string())?
    {
        let (branch, branch_type) = branch_result.map_err(|e| e.to_string())?;
        let name = branch
            .name()
            .map_err(|e| e.to_string())?
            .unwrap_or("unknown")
            .to_string();

        let is_remote = branch_type == BranchType::Remote;
        let is_current = current.as_deref() == Some(&name) && !is_remote;

        let (hash, msg, date) = branch
            .get()
            .peel_to_commit()
            .ok()
            .map(|c| {
                let h = c.id().to_string();
                let m = c.summary().unwrap_or("").to_string();
                let secs = c.time().seconds();
                let d = chrono::DateTime::from_timestamp(secs, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default();
                (Some(h), Some(m), Some(d))
            })
            .unwrap_or((None, None, None));

        branches.push(BranchInfo {
            name,
            is_current,
            is_remote,
            last_commit_hash: hash,
            last_commit_message: msg,
            last_commit_date: date,
        });
    }

    // Sort: current first, then local, then remote
    branches.sort_by(|a, b| {
        b.is_current
            .cmp(&a.is_current)
            .then(a.is_remote.cmp(&b.is_remote))
            .then(a.name.cmp(&b.name))
    });

    Ok(branches)
}

// ═══════════════════════════════════════════════════════════════
// 9. switch_branch
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn switch_branch(repo_path: String, branch_name: String) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let obj = repo
        .revparse_single(&format!("refs/heads/{}", branch_name))
        .map_err(|e| format!("Branch '{}' not found: {}", branch_name, e))?;

    repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 10. create_branch
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn create_branch(
    repo_path: String,
    branch_name: String,
    from_branch: Option<String>,
) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let target_commit = if let Some(ref from) = from_branch {
        let obj = repo
            .revparse_single(&format!("refs/heads/{}", from))
            .map_err(|e| format!("Source branch '{}' not found: {}", from, e))?;
        obj.peel_to_commit().map_err(|e| e.to_string())?
    } else {
        repo.head()
            .map_err(|e| e.to_string())?
            .peel_to_commit()
            .map_err(|e| e.to_string())?
    };

    repo.branch(&branch_name, &target_commit, false)
        .map_err(|e| e.to_string())?;

    // Auto-checkout the new branch
    let obj = repo
        .revparse_single(&format!("refs/heads/{}", branch_name))
        .map_err(|e| e.to_string())?;
    repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
    repo.set_head(&format!("refs/heads/{}", branch_name))
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 10b. checkout_remote_branch
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn checkout_remote_branch(repo_path: String, remote_branch: String) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // remote_branch is like "origin/feature-x" — extract the local name
    let local_name = remote_branch
        .split('/')
        .skip(1)
        .collect::<Vec<&str>>()
        .join("/");

    if local_name.is_empty() {
        return Err(format!("Invalid remote branch name: {}", remote_branch));
    }

    // Check if local branch already exists
    if repo.find_branch(&local_name, git2::BranchType::Local).is_ok() {
        // Just switch to it
        let obj = repo
            .revparse_single(&format!("refs/heads/{}", local_name))
            .map_err(|e| e.to_string())?;
        repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
        repo.set_head(&format!("refs/heads/{}", local_name))
            .map_err(|e| e.to_string())?;
        return Ok(true);
    }

    // Resolve the remote ref to a commit
    let remote_ref = repo
        .revparse_single(&format!("refs/remotes/{}", remote_branch))
        .map_err(|e| format!("Remote branch '{}' not found: {}", remote_branch, e))?;
    let commit = remote_ref.peel_to_commit().map_err(|e| e.to_string())?;

    // Create local branch tracking the remote
    let mut branch = repo
        .branch(&local_name, &commit, false)
        .map_err(|e| e.to_string())?;

    // Set upstream tracking
    branch
        .set_upstream(Some(&remote_branch))
        .map_err(|e| e.to_string())?;

    // Checkout the new branch
    let obj = repo
        .revparse_single(&format!("refs/heads/{}", local_name))
        .map_err(|e| e.to_string())?;
    repo.checkout_tree(&obj, None).map_err(|e| e.to_string())?;
    repo.set_head(&format!("refs/heads/{}", local_name))
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 11. delete_branch
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn delete_branch(repo_path: String, branch_name: String) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    // Refuse if it's the current branch
    let current = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));
    if current.as_deref() == Some(branch_name.as_str()) {
        return Err("Cannot delete the currently checked-out branch".to_string());
    }

    let mut branch = repo
        .find_branch(&branch_name, BranchType::Local)
        .map_err(|e| format!("Branch '{}' not found: {}", branch_name, e))?;

    branch.delete().map_err(|e| e.to_string())?;
    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 12. get_commit_log
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn get_commit_log(repo_path: String, limit: usize) -> Result<Vec<CommitInfo>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let oid = head.target().ok_or("HEAD has no target")?;

    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push(oid).map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(git2::Sort::TIME)
        .map_err(|e| e.to_string())?;

    let mut commits = Vec::new();
    for (i, rev_oid) in revwalk.enumerate() {
        if i >= limit {
            break;
        }
        let rev_oid = rev_oid.map_err(|e| e.to_string())?;
        let c = repo.find_commit(rev_oid).map_err(|e| e.to_string())?;
        let hash = c.id().to_string();
        let short_hash = hash[..8.min(hash.len())].to_string();
        let secs = c.time().seconds();
        let date = chrono::DateTime::from_timestamp(secs, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

        commits.push(CommitInfo {
            hash,
            short_hash,
            message: c.message().unwrap_or("").to_string(),
            author_name: c.author().name().unwrap_or("").to_string(),
            author_email: c.author().email().unwrap_or("").to_string(),
            date,
        });
    }

    Ok(commits)
}

// ═══════════════════════════════════════════════════════════════
// 13. get_stashes
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn get_stashes(repo_path: String) -> Result<Vec<StashInfo>, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut stashes = Vec::new();

    repo.stash_foreach(|index, message, _oid| {
        stashes.push(StashInfo {
            index,
            message: message.to_string(),
            date: String::new(), // stash doesn't directly expose date easily
        });
        true
    })
    .map_err(|e| e.to_string())?;

    // Fill in dates by looking at stash commits
    for s in &mut stashes {
        if let Ok(stash_ref) = repo.revparse_single(&format!("stash@{{{}}}", s.index)) {
            if let Ok(c) = stash_ref.peel_to_commit() {
                let secs = c.time().seconds();
                s.date = chrono::DateTime::from_timestamp(secs, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_default();
            }
        }
    }

    Ok(stashes)
}

// ═══════════════════════════════════════════════════════════════
// 14. stash_save
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn stash_save(repo_path: String, message: Option<String>) -> Result<bool, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let config = repo.config().map_err(|e| e.to_string())?;
    let name = config
        .get_string("user.name")
        .unwrap_or_else(|_| "Unknown".to_string());
    let email = config
        .get_string("user.email")
        .unwrap_or_else(|_| "unknown@unknown".to_string());

    let sig = Signature::now(&name, &email).map_err(|e| e.to_string())?;
    let msg = message.as_deref().unwrap_or("WIP");

    repo.stash_save(&sig, msg, None)
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 15. stash_apply
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn stash_apply(repo_path: String, index: usize) -> Result<bool, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    repo.stash_apply(index, None)
        .map_err(|e| e.to_string())?;

    Ok(true)
}

// ═══════════════════════════════════════════════════════════════
// 16. stash_drop
// ═══════════════════════════════════════════════════════════════

#[tauri::command]
pub fn stash_drop(repo_path: String, index: usize) -> Result<bool, String> {
    let mut repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    repo.stash_drop(index).map_err(|e| e.to_string())?;

    Ok(true)
}
