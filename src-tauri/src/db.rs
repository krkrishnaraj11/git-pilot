use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbIdentity {
    pub id: String,
    pub label: String,
    pub git_name: String,
    pub git_email: String,
    pub color: String,
    pub ssh_key_path: Option<String>,
    pub gpg_key_id: Option<String>,
    pub is_strict: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityRule {
    pub id: String,
    pub identity_id: String,
    pub rule_type: String, // path_prefix | remote_domain | remote_org
    pub value: String,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: String,
    pub action: String,
    pub identity_id: Option<String>,
    pub identity_label: Option<String>,
    pub repo_path: Option<String>,
    pub details: Option<String>,
}

pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app dir: {}", e))?;

    let db_path = app_dir.join("gitpilot.db");
    let conn =
        Connection::open(&db_path).map_err(|e| format!("Failed to open DB: {}", e))?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("Failed to set pragmas: {}", e))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS identities (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            git_name TEXT NOT NULL,
            git_email TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#8B5CF6',
            ssh_key_path TEXT,
            gpg_key_id TEXT,
            is_strict INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS repositories (
            path TEXT PRIMARY KEY,
            identity_id TEXT,
            last_scanned TEXT,
            FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS identity_rules (
            id TEXT PRIMARY KEY,
            identity_id TEXT NOT NULL,
            rule_type TEXT NOT NULL CHECK(rule_type IN ('path_prefix','remote_domain','remote_org')),
            value TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            action TEXT NOT NULL,
            identity_id TEXT,
            identity_label TEXT,
            repo_path TEXT,
            details TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY,
            repo_path TEXT NOT NULL,
            backup_branch TEXT NOT NULL,
            commit_hash TEXT NOT NULL,
            operation TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        ",
    )
    .map_err(|e| format!("Failed to create tables: {}", e))?;

    Ok(conn)
}

// --- Identity CRUD ---

pub fn save_identity(conn: &Connection, identity: &DbIdentity) -> Result<(), String> {
    conn.execute(
        "INSERT INTO identities (id, label, git_name, git_email, color, ssh_key_path, gpg_key_id, is_strict, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            label=excluded.label, git_name=excluded.git_name, git_email=excluded.git_email,
            color=excluded.color, ssh_key_path=excluded.ssh_key_path, gpg_key_id=excluded.gpg_key_id,
            is_strict=excluded.is_strict",
        params![
            identity.id,
            identity.label,
            identity.git_name,
            identity.git_email,
            identity.color,
            identity.ssh_key_path,
            identity.gpg_key_id,
            identity.is_strict as i32,
            identity.created_at,
        ],
    )
    .map_err(|e| format!("Failed to save identity: {}", e))?;
    Ok(())
}

pub fn get_all_identities(conn: &Connection) -> Result<Vec<DbIdentity>, String> {
    let mut stmt = conn
        .prepare("SELECT id, label, git_name, git_email, color, ssh_key_path, gpg_key_id, is_strict, created_at FROM identities ORDER BY label")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(DbIdentity {
                id: row.get(0)?,
                label: row.get(1)?,
                git_name: row.get(2)?,
                git_email: row.get(3)?,
                color: row.get(4)?,
                ssh_key_path: row.get(5)?,
                gpg_key_id: row.get(6)?,
                is_strict: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))
}

pub fn get_identity(conn: &Connection, id: &str) -> Result<Option<DbIdentity>, String> {
    let mut stmt = conn
        .prepare("SELECT id, label, git_name, git_email, color, ssh_key_path, gpg_key_id, is_strict, created_at FROM identities WHERE id = ?1")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let mut rows = stmt
        .query_map(params![id], |row| {
            Ok(DbIdentity {
                id: row.get(0)?,
                label: row.get(1)?,
                git_name: row.get(2)?,
                git_email: row.get(3)?,
                color: row.get(4)?,
                ssh_key_path: row.get(5)?,
                gpg_key_id: row.get(6)?,
                is_strict: row.get::<_, i32>(7)? != 0,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    match rows.next() {
        Some(Ok(identity)) => Ok(Some(identity)),
        Some(Err(e)) => Err(format!("Failed to read row: {}", e)),
        None => Ok(None),
    }
}

pub fn delete_identity(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM identities WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete identity: {}", e))?;
    Ok(())
}

// --- Rules CRUD ---

pub fn save_rule(conn: &Connection, rule: &IdentityRule) -> Result<(), String> {
    conn.execute(
        "INSERT INTO identity_rules (id, identity_id, rule_type, value, priority)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
            identity_id=excluded.identity_id, rule_type=excluded.rule_type,
            value=excluded.value, priority=excluded.priority",
        params![rule.id, rule.identity_id, rule.rule_type, rule.value, rule.priority],
    )
    .map_err(|e| format!("Failed to save rule: {}", e))?;
    Ok(())
}

pub fn get_rules_for_identity(
    conn: &Connection,
    identity_id: &str,
) -> Result<Vec<IdentityRule>, String> {
    let mut stmt = conn
        .prepare("SELECT id, identity_id, rule_type, value, priority FROM identity_rules WHERE identity_id = ?1 ORDER BY priority DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let rows = stmt
        .query_map(params![identity_id], |row| {
            Ok(IdentityRule {
                id: row.get(0)?,
                identity_id: row.get(1)?,
                rule_type: row.get(2)?,
                value: row.get(3)?,
                priority: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))
}

pub fn get_all_rules(conn: &Connection) -> Result<Vec<IdentityRule>, String> {
    let mut stmt = conn
        .prepare("SELECT id, identity_id, rule_type, value, priority FROM identity_rules ORDER BY priority DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(IdentityRule {
                id: row.get(0)?,
                identity_id: row.get(1)?,
                rule_type: row.get(2)?,
                value: row.get(3)?,
                priority: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))
}

pub fn delete_rule(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM identity_rules WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete rule: {}", e))?;
    Ok(())
}

// --- Audit Log ---

pub fn log_action(conn: &Connection, entry: &AuditEntry) -> Result<(), String> {
    conn.execute(
        "INSERT INTO audit_log (id, timestamp, action, identity_id, identity_label, repo_path, details)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            entry.id,
            entry.timestamp,
            entry.action,
            entry.identity_id,
            entry.identity_label,
            entry.repo_path,
            entry.details,
        ],
    )
    .map_err(|e| format!("Failed to log action: {}", e))?;
    Ok(())
}

pub fn get_audit_log(conn: &Connection, limit: Option<u32>) -> Result<Vec<AuditEntry>, String> {
    let limit = limit.unwrap_or(200);
    let mut stmt = conn
        .prepare("SELECT id, timestamp, action, identity_id, identity_label, repo_path, details FROM audit_log ORDER BY timestamp DESC LIMIT ?1")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(AuditEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                action: row.get(2)?,
                identity_id: row.get(3)?,
                identity_label: row.get(4)?,
                repo_path: row.get(5)?,
                details: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))
}

// --- Settings ---

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value],
    )
    .map_err(|e| format!("Failed to set setting: {}", e))?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let mut rows = stmt
        .query_map(params![key], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query: {}", e))?;

    match rows.next() {
        Some(Ok(val)) => Ok(Some(val)),
        Some(Err(e)) => Err(format!("Failed to read: {}", e)),
        None => Ok(None),
    }
}
