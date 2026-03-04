use crate::db::{self, AuditEntry, DbIdentity, DbState, IdentityRule};
use crate::matcher::{self, MatchResult};
use crate::scanner::{self, Identity, RepoInfo};
use serde::Serialize;
use tauri::State;

// --- Existing commands moved from lib.rs ---

#[tauri::command]
pub fn scan_directory(path: String) -> Vec<RepoInfo> {
    scanner::scan_directory(&path)
}

#[tauri::command]
pub fn get_identities(repos: Vec<RepoInfo>) -> Vec<Identity> {
    scanner::get_identities(repos)
}

#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    folder.map(|f| f.to_string())
}

// --- Identity commands ---

#[tauri::command]
pub fn save_identity(state: State<DbState>, identity: DbIdentity) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::save_identity(&conn, &identity)
}

#[tauri::command]
pub fn get_all_identities(state: State<DbState>) -> Result<Vec<DbIdentity>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_identities(&conn)
}

#[tauri::command]
pub fn delete_identity(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_identity(&conn, &id)
}

// --- Rule commands ---

#[tauri::command]
pub fn save_rule(state: State<DbState>, rule: IdentityRule) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::save_rule(&conn, &rule)
}

#[tauri::command]
pub fn get_rules_for_identity(
    state: State<DbState>,
    identity_id: String,
) -> Result<Vec<IdentityRule>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_rules_for_identity(&conn, &identity_id)
}

#[tauri::command]
pub fn get_all_rules(state: State<DbState>) -> Result<Vec<IdentityRule>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_rules(&conn)
}

#[tauri::command]
pub fn delete_rule(state: State<DbState>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::delete_rule(&conn, &id)
}

// --- Audit log commands ---

#[tauri::command]
pub fn log_action(state: State<DbState>, entry: AuditEntry) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::log_action(&conn, &entry)
}

#[tauri::command]
pub fn get_audit_log(
    state: State<DbState>,
    limit: Option<u32>,
) -> Result<Vec<AuditEntry>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_audit_log(&conn, limit)
}

// --- Settings commands ---

#[tauri::command]
pub fn set_setting(state: State<DbState>, key: String, value: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::set_setting(&conn, &key, &value)
}

#[tauri::command]
pub fn get_setting(state: State<DbState>, key: String) -> Result<Option<String>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_setting(&conn, &key)
}

// --- Matching commands ---

#[derive(Debug, Clone, Serialize)]
pub struct ScanWithMatchingResult {
    pub repos: Vec<RepoInfo>,
    pub identities: Vec<Identity>,
    pub matches: Vec<MatchResult>,
}

#[tauri::command]
pub fn scan_directory_with_matching(
    state: State<DbState>,
    path: String,
) -> Result<ScanWithMatchingResult, String> {
    let repos = scanner::scan_directory(&path);
    let identities = scanner::get_identities(repos.clone());

    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Save last scan path
    db::set_setting(&conn, "last_scan_path", &path)?;

    // Load DB identities and rules for matching
    let db_identities = db::get_all_identities(&conn)?;
    let rules = db::get_all_rules(&conn)?;

    // Resolve matches
    let matches = matcher::resolve_all(&repos, &rules, &db_identities);

    // Log mismatches to audit
    for m in &matches {
        if m.is_mismatch {
            if let Some(ref identity_id) = m.matched_identity_id {
                let label = db_identities
                    .iter()
                    .find(|i| i.id == *identity_id)
                    .map(|i| i.label.clone());

                let entry = AuditEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    action: "mismatch_detected".to_string(),
                    identity_id: Some(identity_id.clone()),
                    identity_label: label,
                    repo_path: Some(m.repo_path.clone()),
                    details: Some(format!(
                        "Expected identity from rule {:?}, but repo has different config",
                        m.rule_type
                    )),
                };
                let _ = db::log_action(&conn, &entry);
            }
        }
    }

    Ok(ScanWithMatchingResult {
        repos,
        identities,
        matches,
    })
}

#[tauri::command]
pub fn apply_identity_to_repo(
    state: State<DbState>,
    identity_id: String,
    repo_path: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let identity = db::get_identity(&conn, &identity_id)?
        .ok_or_else(|| format!("Identity {} not found", identity_id))?;

    // Open repo and set git config
    let repo =
        git2::Repository::open(&repo_path).map_err(|e| format!("Failed to open repo: {}", e))?;
    let mut config = repo
        .config()
        .map_err(|e| format!("Failed to get config: {}", e))?;

    config
        .set_str("user.name", &identity.git_name)
        .map_err(|e| format!("Failed to set user.name: {}", e))?;
    config
        .set_str("user.email", &identity.git_email)
        .map_err(|e| format!("Failed to set user.email: {}", e))?;

    // Log to audit
    let entry = AuditEntry {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        action: "identity_applied".to_string(),
        identity_id: Some(identity.id.clone()),
        identity_label: Some(identity.label.clone()),
        repo_path: Some(repo_path),
        details: Some(format!(
            "Set user.name='{}', user.email='{}'",
            identity.git_name, identity.git_email
        )),
    };
    db::log_action(&conn, &entry)?;

    Ok(())
}
