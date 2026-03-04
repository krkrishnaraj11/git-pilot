use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

// ─── Model catalog ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct ModelInfo {
    pub id: String,
    pub display_name: String,
    pub filename: String,
    pub url: String,
    pub size_bytes: u64,
    pub param_count: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
    pub speed_mbps: f64,
}

pub struct DownloadCancelFlag(pub Arc<AtomicBool>);

fn model_catalog() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "qwen2.5-coder-0.5b".to_string(),
            display_name: "Qwen 2.5 Coder 0.5B".to_string(),
            filename: "qwen2.5-coder-0.5b-instruct-q4_k_m.gguf".to_string(),
            url: "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf".to_string(),
            size_bytes: 400_000_000,
            param_count: "0.5B".to_string(),
            description: "Fastest, good for quick commits".to_string(),
        },
        ModelInfo {
            id: "qwen2.5-coder-1.5b".to_string(),
            display_name: "Qwen 2.5 Coder 1.5B".to_string(),
            filename: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf".to_string(),
            url: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf".to_string(),
            size_bytes: 1_000_000_000,
            param_count: "1.5B".to_string(),
            description: "Balanced speed and quality".to_string(),
        },
        ModelInfo {
            id: "qwen2.5-coder-3b".to_string(),
            display_name: "Qwen 2.5 Coder 3B".to_string(),
            filename: "qwen2.5-coder-3b-instruct-q4_k_m.gguf".to_string(),
            url: "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf".to_string(),
            size_bytes: 2_000_000_000,
            param_count: "3B".to_string(),
            description: "Recommended, great quality".to_string(),
        },
        ModelInfo {
            id: "qwen2.5-coder-7b".to_string(),
            display_name: "Qwen 2.5 Coder 7B".to_string(),
            filename: "qwen2.5-coder-7b-instruct-q4_k_m.gguf".to_string(),
            url: "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf".to_string(),
            size_bytes: 4_400_000_000,
            param_count: "7B".to_string(),
            description: "Best quality, slower".to_string(),
        },
    ]
}

fn get_models_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let models_dir = app_dir.join("models");
    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models dir: {}", e))?;
    Ok(models_dir)
}

pub fn get_model_path(app: &AppHandle, model_id: &str) -> Result<std::path::PathBuf, String> {
    let catalog = model_catalog();
    let model = catalog
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Unknown model: {}", model_id))?;
    let models_dir = get_models_dir(app)?;
    Ok(models_dir.join(&model.filename))
}

// ─── llama-server binary management ─────────────────────────

fn get_bin_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let bin_dir = app_dir.join("bin");
    std::fs::create_dir_all(&bin_dir)
        .map_err(|e| format!("Failed to create bin dir: {}", e))?;
    Ok(bin_dir)
}

/// Returns the path to a working llama-server binary, or None.
pub fn find_llama_server(app: &AppHandle) -> Option<String> {
    // 1. Check app data bin dir (downloaded by setup)
    if let Ok(bin_dir) = get_bin_dir(app) {
        let bundled = bin_dir.join("llama-server");
        if bundled.exists() {
            return Some(bundled.to_string_lossy().to_string());
        }
    }

    // 2. Check PATH
    if let Ok(output) = std::process::Command::new("which")
        .arg("llama-server")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }

    None
}

fn get_llama_server_download_url() -> (&'static str, &'static str) {
    // Returns (url, archive_binary_name) for the current platform
    if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
        (
            "https://github.com/ggml-org/llama.cpp/releases/latest/download/llama-server-v1.29.2-bin-macos-arm64.zip",
            "llama-server",
        )
    } else if cfg!(target_os = "macos") && cfg!(target_arch = "x86_64") {
        (
            "https://github.com/ggml-org/llama.cpp/releases/latest/download/llama-server-v1.29.2-bin-macos-x64.zip",
            "llama-server",
        )
    } else if cfg!(target_os = "linux") && cfg!(target_arch = "x86_64") {
        (
            "https://github.com/ggml-org/llama.cpp/releases/latest/download/llama-server-v1.29.2-bin-ubuntu-x64.zip",
            "llama-server",
        )
    } else {
        ("", "llama-server")
    }
}

// ─── Commands ───────────────────────────────────────────────

#[tauri::command]
pub fn check_llama_server_binary(app: AppHandle) -> bool {
    find_llama_server(&app).is_some()
}

#[tauri::command]
pub fn ensure_llama_server(app: AppHandle) -> Result<String, String> {
    // Already available?
    if let Some(path) = find_llama_server(&app) {
        return Ok(path);
    }

    let (url, _binary_name) = get_llama_server_download_url();
    if url.is_empty() {
        return Err("No llama-server binary available for this platform. Install llama.cpp manually.".to_string());
    }

    let bin_dir = get_bin_dir(&app)?;
    let target_path = bin_dir.join("llama-server");

    let _ = app.emit("llama-server-download-status", "Downloading AI engine...");

    // Download the zip
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(url)
        .send()
        .map_err(|e| format!("Failed to download llama-server: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Download failed with status {}", resp.status()));
    }

    let bytes = resp.bytes().map_err(|e| format!("Failed to read download: {}", e))?;

    let _ = app.emit("llama-server-download-status", "Extracting AI engine...");

    // Extract zip to temp dir, then copy llama-server binary
    let temp_dir = bin_dir.join("_extract_tmp");
    let _ = std::fs::remove_dir_all(&temp_dir);
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let zip_path = temp_dir.join("llama-server.zip");
    std::fs::write(&zip_path, &bytes)
        .map_err(|e| format!("Failed to write zip: {}", e))?;

    // Extract using system unzip
    let output = std::process::Command::new("unzip")
        .arg("-o")
        .arg(&zip_path)
        .arg("-d")
        .arg(&temp_dir)
        .output()
        .map_err(|e| format!("Failed to extract zip: {}", e))?;

    if !output.status.success() {
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Err(format!(
            "Failed to extract: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Find llama-server binary in extracted files
    let mut found = false;
    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Check inside subdirectory (e.g., build/bin/llama-server)
                let candidates = [
                    path.join("llama-server"),
                    path.join("bin").join("llama-server"),
                    path.join("build").join("bin").join("llama-server"),
                ];
                for candidate in &candidates {
                    if candidate.exists() {
                        std::fs::copy(candidate, &target_path)
                            .map_err(|e| format!("Failed to copy binary: {}", e))?;
                        found = true;
                        break;
                    }
                }
            } else if path.file_name().map(|n| n == "llama-server").unwrap_or(false) {
                std::fs::copy(&path, &target_path)
                    .map_err(|e| format!("Failed to copy binary: {}", e))?;
                found = true;
            }
            if found {
                break;
            }
        }
    }

    // Cleanup temp
    let _ = std::fs::remove_dir_all(&temp_dir);

    if !found {
        return Err("Could not find llama-server binary in downloaded archive".to_string());
    }

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&target_path, std::fs::Permissions::from_mode(0o755));
    }

    let _ = app.emit("llama-server-download-status", "AI engine ready");

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_available_models() -> Vec<ModelInfo> {
    model_catalog()
}

#[tauri::command]
pub fn get_downloaded_models(app: AppHandle) -> Result<Vec<String>, String> {
    let models_dir = get_models_dir(&app)?;
    let catalog = model_catalog();
    let mut downloaded = Vec::new();
    for model in &catalog {
        if models_dir.join(&model.filename).exists() {
            downloaded.push(model.id.clone());
        }
    }
    Ok(downloaded)
}

#[tauri::command]
pub fn delete_model(app: AppHandle, model_id: String) -> Result<(), String> {
    let path = get_model_path(&app, &model_id)?;
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Failed to delete model: {}", e))?;
    }
    // Also remove .part file if present
    let part_path = path.with_extension("gguf.part");
    if part_path.exists() {
        let _ = std::fs::remove_file(&part_path);
    }
    Ok(())
}

#[tauri::command]
pub fn cancel_download(cancel_flag: tauri::State<DownloadCancelFlag>) -> Result<(), String> {
    cancel_flag.0.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn download_model(
    app: AppHandle,
    model_id: String,
    cancel_flag: tauri::State<DownloadCancelFlag>,
) -> Result<(), String> {
    let catalog = model_catalog();
    let model = catalog
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Unknown model: {}", model_id))?
        .clone();

    let models_dir = get_models_dir(&app)?;
    let final_path = models_dir.join(&model.filename);
    let part_path = final_path.with_extension("gguf.part");

    // Reset cancel flag
    let cancel = cancel_flag.0.clone();
    cancel.store(false, Ordering::Relaxed);

    // Check if already downloaded
    if final_path.exists() {
        let _ = app.emit(
            "model-download-progress",
            DownloadProgress {
                downloaded: model.size_bytes,
                total: model.size_bytes,
                percent: 100.0,
                speed_mbps: 0.0,
            },
        );
        return Ok(());
    }

    // Check for partial download to support resume
    let existing_bytes = if part_path.exists() {
        std::fs::metadata(&part_path)
            .map(|m| m.len())
            .unwrap_or(0)
    } else {
        0
    };

    std::thread::spawn(move || {
        let client = match reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(3600))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("model-download-error", e.to_string());
                return;
            }
        };

        let mut request = client.get(&model.url);
        if existing_bytes > 0 {
            request = request.header("Range", format!("bytes={}-", existing_bytes));
        }

        let resp = match request.send() {
            Ok(r) => r,
            Err(e) => {
                let _ = app.emit("model-download-error", e.to_string());
                return;
            }
        };

        let status = resp.status();
        let total = if status == reqwest::StatusCode::PARTIAL_CONTENT {
            // Range request accepted
            resp.content_length().unwrap_or(0) + existing_bytes
        } else if status.is_success() {
            // Full download (server ignored range or fresh download)
            resp.content_length().unwrap_or(model.size_bytes)
        } else {
            let _ = app.emit(
                "model-download-error",
                format!("Download failed with status {}", status),
            );
            return;
        };

        use std::io::{Read, Write};
        let mut file = match if status == reqwest::StatusCode::PARTIAL_CONTENT && existing_bytes > 0
        {
            std::fs::OpenOptions::new()
                .append(true)
                .open(&part_path)
        } else {
            std::fs::File::create(&part_path).map(|f| f)
        } {
            Ok(f) => f,
            Err(e) => {
                let _ = app.emit("model-download-error", e.to_string());
                return;
            }
        };

        let mut downloaded = if status == reqwest::StatusCode::PARTIAL_CONTENT {
            existing_bytes
        } else {
            0
        };
        let mut reader = resp;
        let mut buf = [0u8; 65536];
        let start = std::time::Instant::now();

        loop {
            if cancel.load(Ordering::Relaxed) {
                let _ = app.emit("model-download-error", "Download cancelled".to_string());
                return;
            }

            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if let Err(e) = file.write_all(&buf[..n]) {
                        let _ = app.emit("model-download-error", e.to_string());
                        return;
                    }
                    downloaded += n as u64;

                    let elapsed = start.elapsed().as_secs_f64();
                    let speed_mbps = if elapsed > 0.0 {
                        (downloaded as f64 / 1_048_576.0) / elapsed
                    } else {
                        0.0
                    };
                    let percent = if total > 0 {
                        (downloaded as f64 / total as f64) * 100.0
                    } else {
                        0.0
                    };

                    let _ = app.emit(
                        "model-download-progress",
                        DownloadProgress {
                            downloaded,
                            total,
                            percent,
                            speed_mbps,
                        },
                    );
                }
                Err(e) => {
                    let _ = app.emit("model-download-error", e.to_string());
                    return;
                }
            }
        }

        // Rename .part to final
        if let Err(e) = std::fs::rename(&part_path, &final_path) {
            let _ = app.emit("model-download-error", e.to_string());
            return;
        }

        let _ = app.emit(
            "model-download-progress",
            DownloadProgress {
                downloaded: total,
                total,
                percent: 100.0,
                speed_mbps: 0.0,
            },
        );
    });

    Ok(())
}
