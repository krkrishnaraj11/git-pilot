mod ai;
mod backup;
mod commands;
mod db;
mod git_ops;
mod matcher;
mod merge;
mod model_manager;
mod rebase;
mod scanner;
mod sidecar;

use db::DbState;
use model_manager::DownloadCancelFlag;
use sidecar::LlamaServerState;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let conn = db::init_db(&app.handle())
                .expect("Failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));
            app.manage(LlamaServerState::new());
            app.manage(DownloadCancelFlag(Arc::new(AtomicBool::new(false))));

            // Auto-start llama-server if setup is complete
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                // Check if setup_complete setting exists
                let db_state: tauri::State<DbState> = handle.state();
                let setup_complete = {
                    let conn = db_state.0.lock().unwrap();
                    conn.query_row(
                        "SELECT value FROM settings WHERE key = 'setup_complete'",
                        [],
                        |row| row.get::<_, String>(0),
                    )
                    .ok()
                };

                if setup_complete.as_deref() == Some("true") {
                    // Get the active model
                    let active_model = {
                        let conn = db_state.0.lock().unwrap();
                        conn.query_row(
                            "SELECT value FROM settings WHERE key = 'active_model'",
                            [],
                            |row| row.get::<_, String>(0),
                        )
                        .ok()
                    };

                    if let Some(model_id) = active_model {
                        let state: tauri::State<LlamaServerState> = handle.state();
                        let _ = sidecar::start_llama_server(
                            handle.clone(),
                            state,
                            model_id,
                        );
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Scanner
            commands::scan_directory,
            commands::get_identities,
            commands::pick_folder,
            // Identity CRUD
            commands::save_identity,
            commands::get_all_identities,
            commands::delete_identity,
            // Rules CRUD
            commands::save_rule,
            commands::get_rules_for_identity,
            commands::get_all_rules,
            commands::delete_rule,
            // Audit
            commands::log_action,
            commands::get_audit_log,
            // Settings
            commands::set_setting,
            commands::get_setting,
            // Matching
            commands::scan_directory_with_matching,
            commands::apply_identity_to_repo,
            // Git operations
            git_ops::get_repo_diff,
            git_ops::stage_files,
            git_ops::unstage_files,
            git_ops::stage_all,
            git_ops::commit,
            git_ops::push,
            git_ops::pull,
            git_ops::get_branches,
            git_ops::switch_branch,
            git_ops::create_branch,
            git_ops::delete_branch,
            git_ops::get_commit_log,
            git_ops::get_stashes,
            git_ops::stash_save,
            git_ops::stash_apply,
            git_ops::stash_drop,
            // AI
            ai::check_ai_status,
            ai::generate_commit_message,
            ai::generate_commit_message_stream,
            ai::explain_diff,
            // Llama server
            sidecar::start_llama_server,
            sidecar::stop_llama_server,
            sidecar::restart_llama_server,
            sidecar::get_llama_server_status,
            // Model manager
            model_manager::get_available_models,
            model_manager::get_downloaded_models,
            model_manager::download_model,
            model_manager::delete_model,
            model_manager::cancel_download,
            model_manager::check_llama_server_binary,
            model_manager::ensure_llama_server,
            // Backup
            backup::create_backup,
            backup::restore_backup,
            backup::list_backups,
            backup::cleanup_old_backups,
            // Merge
            merge::preview_merge,
            merge::execute_merge,
            merge::resolve_conflict,
            merge::abort_merge,
            merge::ai_resolve_conflict,
            // Rebase
            rebase::preview_rebase,
            rebase::execute_rebase,
            rebase::continue_rebase,
            rebase::abort_rebase,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state: tauri::State<LlamaServerState> = app.state();
                let _ = sidecar::stop_llama_server(state);
            }
        });
}
