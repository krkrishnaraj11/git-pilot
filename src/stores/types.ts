export interface RepoInfo {
  path: string;
  name: string;
  git_name: string;
  git_email: string;
  branch: string;
  remote_url: string | null;
  status: "local_changes" | "committed" | "pushed" | "clean";
  uncommitted_count: number;
  staged_count: number;
  ahead: number;
  behind: number;
  last_commit: string | null;
  language: string;
}

/** Identity as scanned/grouped from repos (from Rust scanner) */
export interface ScannedIdentity {
  id: string;
  git_name: string;
  git_email: string;
  color: string;
  repos: RepoInfo[];
}

/** Identity stored in the database */
export interface DbIdentity {
  id: string;
  label: string;
  git_name: string;
  git_email: string;
  color: string;
  ssh_key_path: string | null;
  gpg_key_id: string | null;
  is_strict: boolean;
  created_at: string;
}

export interface IdentityRule {
  id: string;
  identity_id: string;
  rule_type: "path_prefix" | "remote_domain" | "remote_org";
  value: string;
  priority: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  identity_id: string | null;
  identity_label: string | null;
  repo_path: string | null;
  details: string | null;
}

export interface MatchResult {
  repo_path: string;
  matched_identity_id: string | null;
  matched_rule_id: string | null;
  rule_type: string | null;
  rule_value: string | null;
  is_mismatch: boolean;
}

export interface ScanWithMatchingResult {
  repos: RepoInfo[];
  identities: ScannedIdentity[];
  matches: MatchResult[];
}

export type FilterType =
  | "all"
  | "local_changes"
  | "committed"
  | "pushed"
  | "clean";

// ─── Git operation types ────────────────────────────────────

export interface DiffLine {
  content: string;
  line_type: "add" | "delete" | "context";
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffResult {
  staged: FileDiff[];
  unstaged: FileDiff[];
}

export interface CommitResult {
  success: boolean;
  commit_hash: string | null;
  error: string | null;
  identity_mismatch: boolean;
}

export interface PushResult {
  success: boolean;
  error: string | null;
}

export interface PullResult {
  success: boolean;
  error: string | null;
  commits_pulled: number;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  last_commit_hash: string | null;
  last_commit_message: string | null;
  last_commit_date: string | null;
}

export interface CommitInfo {
  hash: string;
  short_hash: string;
  message: string;
  author_name: string;
  author_email: string;
  date: string;
}

export interface StashInfo {
  index: number;
  message: string;
  date: string;
}

export type RepoDetailTab = "changes" | "branches" | "history" | "stashes";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

// ─── AI types ───────────────────────────────────────────────

export interface AiStatus {
  running: boolean;
  model_id: string | null;
}

/** @deprecated Use AiStatus instead */
export type OllamaStatus = AiStatus;

export interface AiCommitResult {
  success: boolean;
  message: string | null;
  model_used: string;
  error: string | null;
}

export type CommitStyle = "conventional" | "gitmoji" | "simple";

// ─── Model / Setup types ────────────────────────────────────

export interface ModelOption {
  id: string;
  display_name: string;
  filename: string;
  url: string;
  size_bytes: number;
  param_count: string;
  description: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  speed_mbps: number;
}

// ─── Backup types ───────────────────────────────────────────

export interface BackupInfo {
  id: string;
  repo_path: string;
  backup_branch: string;
  commit_hash: string;
  operation: string;
  created_at: string;
}

// ─── Merge types ────────────────────────────────────────────

export interface MergePreview {
  can_fast_forward: boolean;
  has_conflicts: boolean;
  conflict_files: ConflictFile[];
  files_changed: number;
  commits_to_merge: number;
}

export interface ConflictFile {
  path: string;
  current_content: string;
  incoming_content: string;
  base_content: string;
}

export interface MergeResult {
  success: boolean;
  has_conflicts: boolean;
  conflict_files: string[];
  commit_hash: string | null;
  error: string | null;
  backup_branch: string | null;
}

export interface AiConflictResolution {
  resolved_content: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

// ─── Rebase types ───────────────────────────────────────────

export interface RebasePreview {
  commits_to_replay: CommitInfo[];
  onto_commit: string;
  potential_conflicts: boolean;
}

export interface RebaseResult {
  success: boolean;
  completed: boolean;
  current_step: number;
  total_steps: number;
  conflict_files: string[];
  error: string | null;
  backup_branch: string | null;
}
