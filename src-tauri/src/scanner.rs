use git2::Repository;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct RepoInfo {
    pub path: String,
    pub name: String,
    pub git_name: String,
    pub git_email: String,
    pub branch: String,
    pub remote_url: Option<String>,
    pub status: String,
    pub uncommitted_count: usize,
    pub staged_count: usize,
    pub ahead: usize,
    pub behind: usize,
    pub last_commit: Option<String>,
    pub language: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Identity {
    pub id: String,
    pub git_name: String,
    pub git_email: String,
    pub color: String,
    pub repos: Vec<RepoInfo>,
}

const IDENTITY_COLORS: &[&str] = &[
    "#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444",
    "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#06B6D4",
];

pub fn scan_directory(path: &str) -> Vec<RepoInfo> {
    let mut repos = Vec::new();
    let walker = WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            // Skip hidden dirs (except .git), node_modules, target, etc.
            if e.depth() > 0 && name.starts_with('.') && name != ".git" {
                return false;
            }
            if name == "node_modules" || name == "target" || name == ".build" || name == "vendor" {
                return false;
            }
            true
        });

    for entry in walker.flatten() {
        if entry.file_type().is_dir() && entry.file_name() == ".git" {
            if let Some(parent) = entry.path().parent() {
                if let Some(info) = analyze_repo(parent) {
                    repos.push(info);
                }
            }
        }
    }

    repos
}

fn analyze_repo(repo_path: &Path) -> Option<RepoInfo> {
    let repo = Repository::open(repo_path).ok()?;
    let path_str = repo_path.to_string_lossy().to_string();
    let name = repo_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Read git config (local first, then global fallback)
    let config = repo.config().ok();
    let git_name = config
        .as_ref()
        .and_then(|c| c.get_string("user.name").ok())
        .unwrap_or_default();
    let git_email = config
        .as_ref()
        .and_then(|c| c.get_string("user.email").ok())
        .unwrap_or_default();

    // Current branch
    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .unwrap_or_else(|| "HEAD".to_string());

    // Remote URL
    let remote_url = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(|u| u.to_string()));

    // Statuses
    let mut uncommitted_count = 0usize;
    let mut staged_count = 0usize;

    if let Ok(statuses) = repo.statuses(None) {
        for s in statuses.iter() {
            let st = s.status();
            if st.intersects(
                git2::Status::WT_MODIFIED
                    | git2::Status::WT_NEW
                    | git2::Status::WT_DELETED
                    | git2::Status::WT_RENAMED
                    | git2::Status::WT_TYPECHANGE,
            ) {
                uncommitted_count += 1;
            }
            if st.intersects(
                git2::Status::INDEX_MODIFIED
                    | git2::Status::INDEX_NEW
                    | git2::Status::INDEX_DELETED
                    | git2::Status::INDEX_RENAMED
                    | git2::Status::INDEX_TYPECHANGE,
            ) {
                staged_count += 1;
            }
        }
    }

    let has_local_changes = uncommitted_count > 0 || staged_count > 0;

    // Ahead/behind
    let (ahead, behind) = get_ahead_behind(&repo).unwrap_or((0, 0));

    // Determine status
    let status = if has_local_changes {
        "local_changes".to_string()
    } else if ahead > 0 {
        "committed".to_string()
    } else if remote_url.is_some() && ahead == 0 && behind == 0 {
        "pushed".to_string()
    } else {
        "clean".to_string()
    };

    // Last commit timestamp
    let last_commit = repo
        .head()
        .ok()
        .and_then(|h| h.peel_to_commit().ok())
        .map(|c| {
            let time = c.time();
            let secs = time.seconds();
            chrono::DateTime::from_timestamp(secs, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default()
        });

    // Detect primary language from file extensions in repo root
    let language = detect_language(repo_path);

    Some(RepoInfo {
        path: path_str,
        name,
        git_name,
        git_email,
        branch,
        remote_url,
        status,
        uncommitted_count,
        staged_count,
        ahead,
        behind,
        last_commit,
        language,
    })
}

fn get_ahead_behind(repo: &Repository) -> Option<(usize, usize)> {
    let head = repo.head().ok()?;
    let local_oid = head.target()?;

    let branch_name = head.shorthand()?;
    let upstream_name = format!("refs/remotes/origin/{}", branch_name);
    let upstream_ref = repo.find_reference(&upstream_name).ok()?;
    let upstream_oid = upstream_ref.target()?;

    repo.graph_ahead_behind(local_oid, upstream_oid).ok()
}

fn detect_language(repo_path: &Path) -> String {
    let mut ext_counts: HashMap<String, usize> = HashMap::new();

    let walker = WalkDir::new(repo_path)
        .max_depth(3)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.')
                && name != "node_modules"
                && name != "target"
                && name != "vendor"
                && name != "__pycache__"
                && name != "dist"
                && name != "build"
        });

    for entry in walker.flatten() {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                *ext_counts.entry(ext_str).or_insert(0) += 1;
            }
        }
    }

    let ext_to_lang: HashMap<&str, &str> = HashMap::from([
        ("rs", "Rust"),
        ("ts", "TypeScript"),
        ("tsx", "TypeScript"),
        ("js", "JavaScript"),
        ("jsx", "JavaScript"),
        ("py", "Python"),
        ("go", "Go"),
        ("java", "Java"),
        ("kt", "Kotlin"),
        ("swift", "Swift"),
        ("rb", "Ruby"),
        ("cpp", "C++"),
        ("c", "C"),
        ("h", "C"),
        ("cs", "C#"),
        ("php", "PHP"),
        ("vue", "Vue"),
        ("svelte", "Svelte"),
        ("dart", "Dart"),
        ("zig", "Zig"),
        ("ex", "Elixir"),
        ("exs", "Elixir"),
        ("hs", "Haskell"),
        ("lua", "Lua"),
        ("scala", "Scala"),
        ("r", "R"),
        ("sql", "SQL"),
        ("sh", "Shell"),
        ("bash", "Shell"),
        ("zsh", "Shell"),
    ]);

    // Aggregate by language
    let mut lang_counts: HashMap<&str, usize> = HashMap::new();
    for (ext, count) in &ext_counts {
        if let Some(lang) = ext_to_lang.get(ext.as_str()) {
            *lang_counts.entry(lang).or_insert(0) += count;
        }
    }

    lang_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(lang, _)| lang.to_string())
        .unwrap_or_else(|| "Unknown".to_string())
}

pub fn get_identities(repos: Vec<RepoInfo>) -> Vec<Identity> {
    let mut groups: HashMap<String, (String, String, Vec<RepoInfo>)> = HashMap::new();

    for repo in repos {
        let key = format!("{}:{}", repo.git_name, repo.git_email);
        let entry = groups
            .entry(key)
            .or_insert_with(|| (repo.git_name.clone(), repo.git_email.clone(), Vec::new()));
        entry.2.push(repo);
    }

    let mut identities: Vec<Identity> = groups
        .into_iter()
        .enumerate()
        .map(|(i, (key, (git_name, git_email, repos)))| {
            let color = IDENTITY_COLORS[i % IDENTITY_COLORS.len()].to_string();
            let id = format!("{:x}", md5_hash(&key));
            Identity {
                id,
                git_name,
                git_email,
                color,
                repos,
            }
        })
        .collect();

    identities.sort_by(|a, b| b.repos.len().cmp(&a.repos.len()));
    identities
}

fn md5_hash(input: &str) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    input.hash(&mut hasher);
    hasher.finish()
}
