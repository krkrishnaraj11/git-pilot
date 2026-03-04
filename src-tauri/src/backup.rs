use crate::db::{self, AuditEntry, DbState};
use git2::Repository;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct BackupInfo {
    pub id: String,
    pub repo_path: String,
    pub backup_branch: String,
    pub commit_hash: String,
    pub operation: String,
    pub created_at: String,
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

#[tauri::command]
pub fn create_backup(
    state: State<DbState>,
    repo_path: String,
    operation: String,
) -> Result<BackupInfo, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let head = repo.head().map_err(|e| e.to_string())?;
    let commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let commit_hash = commit.id().to_string();

    let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_branch = format!("gitpilot/backup/{}-{}", operation, timestamp);

    repo.branch(&backup_branch, &commit, false)
        .map_err(|e| format!("Failed to create backup branch: {}", e))?;

    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO backups (id, repo_path, backup_branch, commit_hash, operation, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, repo_path, backup_branch, commit_hash, operation, created_at],
    )
    .map_err(|e| format!("Failed to save backup: {}", e))?;

    let entry = make_audit(
        "backup_created",
        &repo_path,
        &format!("Created backup branch {} at {}", backup_branch, &commit_hash[..8]),
    );
    let _ = db::log_action(&conn, &entry);

    Ok(BackupInfo {
        id,
        repo_path,
        backup_branch,
        commit_hash,
        operation,
        created_at,
    })
}

#[tauri::command]
pub fn restore_backup(
    state: State<DbState>,
    repo_path: String,
    backup_branch: String,
) -> Result<bool, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;

    let branch = repo
        .find_branch(&backup_branch, git2::BranchType::Local)
        .map_err(|e| format!("Backup branch not found: {}", e))?;

    let commit = branch
        .get()
        .peel_to_commit()
        .map_err(|e| e.to_string())?;

    let commit_hash = commit.id().to_string();

    // Hard reset to backup commit
    let obj = commit.as_object();
    repo.reset(obj, git2::ResetType::Hard, None)
        .map_err(|e| format!("Failed to restore backup: {}", e))?;

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let entry = make_audit(
        "backup_restored",
        &repo_path,
        &format!("Restored to backup {} ({})", backup_branch, &commit_hash[..8]),
    );
    let _ = db::log_action(&conn, &entry);

    Ok(true)
}

#[tauri::command]
pub fn list_backups(
    state: State<DbState>,
    repo_path: String,
) -> Result<Vec<BackupInfo>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, repo_path, backup_branch, commit_hash, operation, created_at
             FROM backups WHERE repo_path = ?1 ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let rows = stmt
        .query_map(params![repo_path], |row| {
            Ok(BackupInfo {
                id: row.get(0)?,
                repo_path: row.get(1)?,
                backup_branch: row.get(2)?,
                commit_hash: row.get(3)?,
                operation: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub fn cleanup_old_backups(
    state: State<DbState>,
    repo_path: String,
    max_age_days: i64,
) -> Result<usize, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let cutoff = chrono::Utc::now() - chrono::Duration::days(max_age_days);
    let cutoff_str = cutoff.to_rfc3339();

    // Get old backups
    let mut stmt = conn
        .prepare(
            "SELECT id, backup_branch FROM backups WHERE repo_path = ?1 AND created_at < ?2",
        )
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let old_backups: Vec<(String, String)> = stmt
        .query_map(params![repo_path, cutoff_str], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))?;

    let mut cleaned = 0;
    for (id, branch_name) in &old_backups {
        // Delete git branch
        if let Ok(mut branch) = repo.find_branch(branch_name, git2::BranchType::Local) {
            let _ = branch.delete();
        }
        // Delete DB row
        let _ = conn.execute("DELETE FROM backups WHERE id = ?1", params![id]);
        cleaned += 1;
    }

    if cleaned > 0 {
        let entry = make_audit(
            "backup_cleanup",
            &repo_path,
            &format!("Cleaned up {} old backup(s) older than {} days", cleaned, max_age_days),
        );
        let _ = db::log_action(&conn, &entry);
    }

    Ok(cleaned)
}
