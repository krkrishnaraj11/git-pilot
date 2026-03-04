use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct FsWatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub watched_path: Mutex<Option<String>>,
}

impl FsWatcherState {
    pub fn new() -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_path: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub fn start_watching(
    app: AppHandle,
    state: tauri::State<'_, FsWatcherState>,
    path: String,
) -> Result<(), String> {
    // Stop existing watcher first
    {
        let mut w = state.watcher.lock().unwrap();
        *w = None;
    }

    let watch_path = PathBuf::from(&path);
    if !watch_path.exists() {
        return Err("Path does not exist".to_string());
    }

    let (tx, rx) = channel::<Result<Event, notify::Error>>();

    let mut watcher = RecommendedWatcher::new(tx, Config::default())
        .map_err(|e| e.to_string())?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Store watched path
    {
        let mut wp = state.watched_path.lock().unwrap();
        *wp = Some(path);
    }

    // Spawn a thread to process events with debouncing
    std::thread::spawn(move || {
        let mut last_emit = Instant::now() - Duration::from_secs(10);
        let debounce = Duration::from_secs(3);

        loop {
            match rx.recv_timeout(Duration::from_secs(1)) {
                Ok(Ok(event)) => {
                    if should_trigger_rescan(&event) && last_emit.elapsed() >= debounce {
                        last_emit = Instant::now();
                        let _ = app.emit("fs-repos-changed", ());
                    }
                }
                Ok(Err(_)) => {}
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => continue,
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    // Store the watcher to keep it alive
    {
        let mut w = state.watcher.lock().unwrap();
        *w = Some(watcher);
    }

    Ok(())
}

#[tauri::command]
pub fn stop_watching(state: tauri::State<'_, FsWatcherState>) -> Result<(), String> {
    let mut w = state.watcher.lock().unwrap();
    *w = None;
    let mut wp = state.watched_path.lock().unwrap();
    *wp = None;
    Ok(())
}

/// Decide if a filesystem event should trigger a rescan.
/// We care about: new .git dirs, deleted .git dirs, changes to HEAD/refs/config in .git.
fn should_trigger_rescan(event: &Event) -> bool {
    match event.kind {
        EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(_) => {
            event.paths.iter().any(|p| {
                let s = p.to_string_lossy();
                // New or removed .git directory (new/deleted repo)
                s.ends_with(".git")
                    || s.ends_with(".git/HEAD")
                    || s.ends_with(".git/config")
                    // Changes to refs (new branches, commits pushed)
                    || s.contains(".git/refs/")
                    // Index changes (staging)
                    || s.ends_with(".git/index")
            })
        }
        _ => false,
    }
}
