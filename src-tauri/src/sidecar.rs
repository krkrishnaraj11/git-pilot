use serde::Serialize;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::AppHandle;

use crate::model_manager;

pub const LLAMA_SERVER_PORT: u16 = 8847;

pub struct LlamaServerState {
    pub process: Mutex<Option<Child>>,
    pub port: u16,
    pub model_path: Mutex<Option<String>>,
}

impl LlamaServerState {
    pub fn new() -> Self {
        Self {
            process: Mutex::new(None),
            port: LLAMA_SERVER_PORT,
            model_path: Mutex::new(None),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LlamaServerStatus {
    pub running: bool,
    pub model_id: Option<String>,
    pub port: u16,
}

fn find_llama_server_binary(app: &AppHandle) -> Result<String, String> {
    model_manager::find_llama_server(app)
        .ok_or_else(|| "llama-server not found. Run setup to download it.".to_string())
}

fn is_server_healthy() -> bool {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .ok();

    if let Some(client) = client {
        if let Ok(resp) = client
            .get(&format!("http://localhost:{}/health", LLAMA_SERVER_PORT))
            .send()
        {
            return resp.status().is_success();
        }
    }
    false
}

#[tauri::command]
pub fn start_llama_server(
    app: AppHandle,
    state: tauri::State<LlamaServerState>,
    model_id: String,
) -> Result<LlamaServerStatus, String> {
    let mut guard = state.process.lock().map_err(|e| e.to_string())?;

    // If already running, check if it's alive
    if let Some(ref mut child) = *guard {
        match child.try_wait() {
            Ok(None) => {
                // Already running
                return Ok(LlamaServerStatus {
                    running: true,
                    model_id: state
                        .model_path
                        .lock()
                        .ok()
                        .and_then(|p| p.clone())
                        .map(|_| model_id),
                    port: state.port,
                });
            }
            _ => {
                *guard = None;
            }
        }
    }

    // Resolve model path
    let model_path = model_manager::get_model_path(&app, &model_id)?;
    if !model_path.exists() {
        return Err(format!(
            "Model file not found: {}. Download it first.",
            model_path.display()
        ));
    }

    let binary = find_llama_server_binary(&app)?;
    let model_path_str = model_path.to_string_lossy().to_string();

    let child = Command::new(&binary)
        .arg("-m")
        .arg(&model_path_str)
        .arg("--port")
        .arg(state.port.to_string())
        .arg("--ctx-size")
        .arg("2048")
        .arg("--log-disable")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start llama-server: {}. Is it installed?", e))?;

    *guard = Some(child);

    // Store model path
    if let Ok(mut mp) = state.model_path.lock() {
        *mp = Some(model_id.clone());
    }

    // Poll for readiness (up to 10 seconds)
    drop(guard); // Release lock while polling
    for _ in 0..20 {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if is_server_healthy() {
            return Ok(LlamaServerStatus {
                running: true,
                model_id: Some(model_id),
                port: state.port,
            });
        }
    }

    Ok(LlamaServerStatus {
        running: false,
        model_id: Some(model_id),
        port: state.port,
    })
}

#[tauri::command]
pub fn stop_llama_server(state: tauri::State<LlamaServerState>) -> Result<(), String> {
    let mut guard = state.process.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut child) = *guard {
        // Try graceful shutdown first
        let _ = child.kill();
        // Wait up to 3 seconds
        let start = std::time::Instant::now();
        loop {
            match child.try_wait() {
                Ok(Some(_)) => break,
                Ok(None) => {
                    if start.elapsed() > std::time::Duration::from_secs(3) {
                        let _ = child.kill();
                        let _ = child.wait();
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                Err(_) => break,
            }
        }
    }
    *guard = None;
    if let Ok(mut mp) = state.model_path.lock() {
        *mp = None;
    }
    Ok(())
}

#[tauri::command]
pub fn restart_llama_server(
    app: AppHandle,
    state: tauri::State<LlamaServerState>,
    model_id: String,
) -> Result<LlamaServerStatus, String> {
    stop_llama_server(state.clone())?;
    std::thread::sleep(std::time::Duration::from_millis(500));
    start_llama_server(app, state, model_id)
}

#[tauri::command]
pub fn get_llama_server_status(
    state: tauri::State<LlamaServerState>,
) -> LlamaServerStatus {
    let process_alive = state
        .process
        .lock()
        .ok()
        .map(|guard| {
            if let Some(ref _child) = *guard {
                true
            } else {
                false
            }
        })
        .unwrap_or(false);

    let healthy = is_server_healthy();
    let model_id = state
        .model_path
        .lock()
        .ok()
        .and_then(|p| p.clone());

    LlamaServerStatus {
        running: process_alive && healthy,
        model_id,
        port: state.port,
    }
}
