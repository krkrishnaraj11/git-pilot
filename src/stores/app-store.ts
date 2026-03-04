import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  RepoInfo,
  ScannedIdentity,
  DbIdentity,
  IdentityRule,
  AuditEntry,
  MatchResult,
  FilterType,
  ScanWithMatchingResult,
  DiffResult,
  CommitResult,
  PushResult,
  PullResult,
  BranchInfo,
  CommitInfo,
  StashInfo,
  RepoDetailTab,
  Toast,
  BackupInfo,
  MergePreview,
  MergeResult,
  AiConflictResolution,
  RebasePreview,
  RebaseResult,
} from "./types";

// Re-export types for backward compatibility
export type { RepoInfo, FilterType };
export type Identity = ScannedIdentity;

export interface InitStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

interface AppState {
  identities: ScannedIdentity[];
  allRepos: RepoInfo[];
  activeFilter: FilterType;
  searchQuery: string;
  scanPath: string | null;
  isScanning: boolean;

  // Initialization state
  isInitializing: boolean;
  initSteps: InitStep[];

  // DB state
  dbIdentities: DbIdentity[];
  rules: IdentityRule[];
  mismatches: MatchResult[];
  auditLog: AuditEntry[];

  // UI state
  identityManagerOpen: boolean;
  editingIdentity: DbIdentity | null;
  auditLogOpen: boolean;

  // Repo detail state
  selectedRepo: RepoInfo | null;
  selectedRepoColor: string;
  repoDetailTab: RepoDetailTab;
  repoDiff: DiffResult | null;
  repoBranches: BranchInfo[];
  repoCommits: CommitInfo[];
  repoStashes: StashInfo[];
  commitDialogOpen: boolean;

  // Merge/Rebase/Backup state
  mergeState: {
    preview: MergePreview | null;
    result: MergeResult | null;
    conflictResolutions: Record<string, AiConflictResolution>;
  } | null;
  rebaseState: {
    preview: RebasePreview | null;
    result: RebaseResult | null;
  } | null;
  backups: BackupInfo[];
  mergeWizardOpen: boolean;
  rebaseWizardOpen: boolean;
  backupManagerOpen: boolean;

  // Sync (push/pull) modal
  syncOp: {
    type: "push" | "pull";
    status: "running" | "success" | "error";
    repoName: string;
    branch: string;
    message?: string;
    detail?: string;
  } | null;

  // Toast
  toasts: Toast[];

  // Actions
  setFilter: (filter: FilterType) => void;
  setSearch: (query: string) => void;
  setScanPath: (path: string | null) => void;
  scanDirectory: (path: string) => Promise<void>;
  pickFolder: () => Promise<void>;

  // DB actions
  loadDbIdentities: () => Promise<void>;
  saveIdentity: (identity: DbIdentity) => Promise<void>;
  deleteIdentity: (id: string) => Promise<void>;
  loadRules: () => Promise<void>;
  saveRule: (rule: IdentityRule) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  loadAuditLog: () => Promise<void>;
  initializeApp: () => Promise<void>;
  applyIdentityToRepo: (identityId: string, repoPath: string) => Promise<void>;

  // UI actions
  setIdentityManagerOpen: (open: boolean) => void;
  setEditingIdentity: (identity: DbIdentity | null) => void;
  setAuditLogOpen: (open: boolean) => void;

  // Repo detail actions
  openRepoDetail: (repo: RepoInfo, color: string, tab?: RepoDetailTab) => void;
  closeRepoDetail: () => void;
  setRepoDetailTab: (tab: RepoDetailTab) => void;
  loadRepoDiff: (repoPath: string) => Promise<void>;
  loadRepoBranches: (repoPath: string) => Promise<void>;
  loadRepoCommits: (repoPath: string, limit?: number) => Promise<void>;
  loadRepoStashes: (repoPath: string) => Promise<void>;
  setCommitDialogOpen: (open: boolean) => void;

  // Git operations
  stageFiles: (repoPath: string, filePaths: string[]) => Promise<void>;
  unstageFiles: (repoPath: string, filePaths: string[]) => Promise<void>;
  stageAll: (repoPath: string) => Promise<void>;
  doCommit: (repoPath: string, message: string, identityId?: string) => Promise<CommitResult | null>;
  doPush: (repoPath: string) => Promise<void>;
  doPull: (repoPath: string) => Promise<void>;
  switchBranch: (repoPath: string, branchName: string) => Promise<void>;
  checkoutRemoteBranch: (repoPath: string, remoteBranch: string) => Promise<void>;
  createBranch: (repoPath: string, branchName: string, fromBranch?: string) => Promise<void>;
  deleteBranch: (repoPath: string, branchName: string) => Promise<void>;
  stashSave: (repoPath: string, message?: string) => Promise<void>;
  stashApply: (repoPath: string, index: number) => Promise<void>;
  stashDrop: (repoPath: string, index: number) => Promise<void>;

  // Merge actions
  setMergeWizardOpen: (open: boolean) => void;
  previewMerge: (repoPath: string, sourceBranch: string, targetBranch: string) => Promise<void>;
  executeMerge: (repoPath: string, sourceBranch: string, doBackup: boolean) => Promise<MergeResult | null>;
  resolveConflict: (repoPath: string, filePath: string, resolution: string) => Promise<void>;
  aiResolveConflict: (repoPath: string, filePath: string) => Promise<AiConflictResolution | null>;
  abortMerge: (repoPath: string) => Promise<void>;
  clearMergeState: () => void;

  // Rebase actions
  setRebaseWizardOpen: (open: boolean) => void;
  previewRebase: (repoPath: string, ontoBranch: string) => Promise<void>;
  executeRebase: (repoPath: string, ontoBranch: string, doBackup: boolean) => Promise<RebaseResult | null>;
  continueRebase: (repoPath: string) => Promise<RebaseResult | null>;
  abortRebase: (repoPath: string) => Promise<void>;
  clearRebaseState: () => void;

  // Backup actions
  setBackupManagerOpen: (open: boolean) => void;
  createBackup: (repoPath: string, operation: string) => Promise<BackupInfo | null>;
  restoreBackup: (repoPath: string, backupBranch: string) => Promise<void>;
  listBackups: (repoPath: string) => Promise<void>;
  cleanupBackups: (repoPath: string, maxAgeDays: number) => Promise<void>;

  // Toast
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;

  // Computed
  filteredIdentities: () => ScannedIdentity[];
  stats: () => {
    total: number;
    localChanges: number;
    committed: number;
    pushed: number;
    clean: number;
    identityCount: number;
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  identities: [],
  allRepos: [],
  activeFilter: "all",
  searchQuery: "",
  scanPath: null,
  isScanning: false,

  // Initialization state
  isInitializing: true,
  initSteps: [
    { id: "db", label: "Loading database", status: "pending" },
    { id: "identities", label: "Loading identities", status: "pending" },
    { id: "rules", label: "Loading rules", status: "pending" },
    { id: "ai", label: "Starting AI engine", status: "pending" },
    { id: "scan", label: "Scanning repositories", status: "pending" },
  ],

  // DB state
  dbIdentities: [],
  rules: [],
  mismatches: [],
  auditLog: [],

  // UI state
  identityManagerOpen: false,
  editingIdentity: null,
  auditLogOpen: false,

  // Repo detail state
  selectedRepo: null,
  selectedRepoColor: "#8B5CF6",
  repoDetailTab: "changes",
  repoDiff: null,
  repoBranches: [],
  repoCommits: [],
  repoStashes: [],
  commitDialogOpen: false,

  // Merge/Rebase/Backup state
  mergeState: null,
  rebaseState: null,
  backups: [],
  mergeWizardOpen: false,
  rebaseWizardOpen: false,
  backupManagerOpen: false,

  // Sync modal
  syncOp: null,

  // Toast
  toasts: [],

  setFilter: (filter) => set({ activeFilter: filter }),
  setSearch: (query) => set({ searchQuery: query }),
  setScanPath: (path) => set({ scanPath: path }),

  scanDirectory: async (path: string) => {
    set({ isScanning: true, scanPath: path });
    try {
      const result = await invoke<ScanWithMatchingResult>(
        "scan_directory_with_matching",
        { path }
      );
      set({
        allRepos: result.repos,
        identities: result.identities,
        mismatches: result.matches.filter((m) => m.is_mismatch),
        isScanning: false,
      });
    } catch (e) {
      console.error("Scan failed:", e);
      try {
        const repos = await invoke<RepoInfo[]>("scan_directory", { path });
        const identities = await invoke<ScannedIdentity[]>("get_identities", { repos });
        set({ allRepos: repos, identities, isScanning: false });
      } catch (e2) {
        console.error("Fallback scan also failed:", e2);
        set({ isScanning: false });
      }
    }

    // Start file system watcher on this path
    try {
      await invoke("start_watching", { path });
    } catch (e) {
      console.warn("Failed to start fs watcher:", e);
    }
  },

  pickFolder: async () => {
    try {
      const path = await invoke<string | null>("pick_folder");
      if (path) {
        get().scanDirectory(path);
      }
    } catch (e) {
      console.error("Folder pick failed:", e);
    }
  },

  // DB actions
  loadDbIdentities: async () => {
    try {
      const dbIdentities = await invoke<DbIdentity[]>("get_all_identities");
      set({ dbIdentities });
    } catch (e) {
      console.error("Failed to load DB identities:", e);
    }
  },

  saveIdentity: async (identity: DbIdentity) => {
    try {
      await invoke("save_identity", { identity });
      await get().loadDbIdentities();
    } catch (e) {
      console.error("Failed to save identity:", e);
    }
  },

  deleteIdentity: async (id: string) => {
    try {
      await invoke("delete_identity", { id });
      await get().loadDbIdentities();
    } catch (e) {
      console.error("Failed to delete identity:", e);
    }
  },

  loadRules: async () => {
    try {
      const rules = await invoke<IdentityRule[]>("get_all_rules");
      set({ rules });
    } catch (e) {
      console.error("Failed to load rules:", e);
    }
  },

  saveRule: async (rule: IdentityRule) => {
    try {
      await invoke("save_rule", { rule });
      await get().loadRules();
    } catch (e) {
      console.error("Failed to save rule:", e);
    }
  },

  deleteRule: async (id: string) => {
    try {
      await invoke("delete_rule", { id });
      await get().loadRules();
    } catch (e) {
      console.error("Failed to delete rule:", e);
    }
  },

  loadAuditLog: async () => {
    try {
      const auditLog = await invoke<AuditEntry[]>("get_audit_log", { limit: 200 });
      set({ auditLog });
    } catch (e) {
      console.error("Failed to load audit log:", e);
    }
  },

  applyIdentityToRepo: async (identityId: string, repoPath: string) => {
    try {
      await invoke("apply_identity_to_repo", { identityId, repoPath });
      const scanPath = get().scanPath;
      if (scanPath) {
        await get().scanDirectory(scanPath);
      }
    } catch (e) {
      console.error("Failed to apply identity:", e);
    }
  },

  initializeApp: async () => {
    const updateStep = (id: string, status: InitStep["status"]) => {
      set((s) => ({
        initSteps: s.initSteps.map((step) =>
          step.id === id ? { ...step, status } : step
        ),
      }));
    };

    // Ensure each step is visible for at least this long
    const minStepMs = 400;
    const runStep = async (id: string, fn: () => Promise<void>) => {
      updateStep(id, "running");
      const start = Date.now();
      await fn();
      const elapsed = Date.now() - start;
      if (elapsed < minStepMs) {
        await new Promise((r) => setTimeout(r, minStepMs - elapsed));
      }
      updateStep(id, "done");
    };

    try {
      // Step 1: Database
      await runStep("db", async () => {
        // DB is already initialized by Tauri setup, just a visual step
      });

      // Step 2: Load identities
      await runStep("identities", async () => {
        await get().loadDbIdentities();
      });

      // Step 3: Load rules
      await runStep("rules", async () => {
        await get().loadRules();
      });

      // Step 4: AI engine check (non-blocking)
      await runStep("ai", async () => {
        try {
          const { useAiStore } = await import("./ai-store");
          await useAiStore.getState().checkAiStatus();
          useAiStore.getState().initListeners();
        } catch {
          // AI is optional — don't block startup
        }
      });

      // Step 5: Scan repositories
      await runStep("scan", async () => {
        const lastPath = await invoke<string | null>("get_setting", { key: "last_scan_path" });
        if (lastPath) {
          await get().scanDirectory(lastPath);
        }
      });

      // Listen for filesystem changes to auto-rescan
      listen("fs-repos-changed", () => {
        const scanPath = get().scanPath;
        if (scanPath && !get().isScanning) {
          get().scanDirectory(scanPath);
        }
      });

      // Brief pause for the final checkmark to animate
      await new Promise((r) => setTimeout(r, 300));
      set({ isInitializing: false });
    } catch (e) {
      console.error("Failed to initialize app:", e);
      set({ isInitializing: false });
    }
  },

  // UI actions
  setIdentityManagerOpen: (open) => set({ identityManagerOpen: open }),
  setEditingIdentity: (identity) => set({ editingIdentity: identity }),
  setAuditLogOpen: (open) => set({ auditLogOpen: open }),

  // Repo detail actions
  openRepoDetail: (repo, color, tab = "changes") => {
    set({
      selectedRepo: repo,
      selectedRepoColor: color,
      repoDetailTab: tab,
      repoDiff: null,
      repoBranches: [],
      repoCommits: [],
      repoStashes: [],
    });
    // Load data for the active tab
    if (tab === "changes") get().loadRepoDiff(repo.path);
    else if (tab === "branches") get().loadRepoBranches(repo.path);
    else if (tab === "history") get().loadRepoCommits(repo.path);
    else if (tab === "stashes") get().loadRepoStashes(repo.path);
  },

  closeRepoDetail: () => set({ selectedRepo: null }),

  setRepoDetailTab: (tab) => {
    set({ repoDetailTab: tab });
    const repo = get().selectedRepo;
    if (!repo) return;
    if (tab === "changes") get().loadRepoDiff(repo.path);
    else if (tab === "branches") get().loadRepoBranches(repo.path);
    else if (tab === "history") get().loadRepoCommits(repo.path);
    else if (tab === "stashes") get().loadRepoStashes(repo.path);
  },

  loadRepoDiff: async (repoPath) => {
    try {
      const repoDiff = await invoke<DiffResult>("get_repo_diff", { repoPath });
      set({ repoDiff });
    } catch (e) {
      console.error("Failed to load diff:", e);
    }
  },

  loadRepoBranches: async (repoPath) => {
    try {
      const repoBranches = await invoke<BranchInfo[]>("get_branches", { repoPath });
      set({ repoBranches });
    } catch (e) {
      console.error("Failed to load branches:", e);
    }
  },

  loadRepoCommits: async (repoPath, limit = 50) => {
    try {
      const repoCommits = await invoke<CommitInfo[]>("get_commit_log", { repoPath, limit });
      set({ repoCommits });
    } catch (e) {
      console.error("Failed to load commits:", e);
    }
  },

  loadRepoStashes: async (repoPath) => {
    try {
      const repoStashes = await invoke<StashInfo[]>("get_stashes", { repoPath });
      set({ repoStashes });
    } catch (e) {
      console.error("Failed to load stashes:", e);
    }
  },

  setCommitDialogOpen: (open) => set({ commitDialogOpen: open }),

  // Git operations
  stageFiles: async (repoPath, filePaths) => {
    try {
      await invoke("stage_files", { repoPath, filePaths });
      await get().loadRepoDiff(repoPath);
    } catch (e) {
      get().addToast("error", `Stage failed: ${e}`);
    }
  },

  unstageFiles: async (repoPath, filePaths) => {
    try {
      await invoke("unstage_files", { repoPath, filePaths });
      await get().loadRepoDiff(repoPath);
    } catch (e) {
      get().addToast("error", `Unstage failed: ${e}`);
    }
  },

  stageAll: async (repoPath) => {
    try {
      await invoke("stage_all", { repoPath });
      await get().loadRepoDiff(repoPath);
      get().addToast("success", "All changes staged");
    } catch (e) {
      get().addToast("error", `Stage all failed: ${e}`);
    }
  },

  doCommit: async (repoPath, message, identityId) => {
    try {
      const result = await invoke<CommitResult>("commit", {
        repoPath,
        message,
        identityId: identityId ?? null,
      });
      if (result.success) {
        get().addToast("success", `Committed ${result.commit_hash?.slice(0, 8)}`);
        await get().loadRepoDiff(repoPath);
        await get().loadRepoCommits(repoPath);
        // Refresh the main repo list
        const scanPath = get().scanPath;
        if (scanPath) get().scanDirectory(scanPath);
      } else {
        get().addToast("error", result.error || "Commit failed");
      }
      return result;
    } catch (e) {
      get().addToast("error", `Commit failed: ${e}`);
      return null;
    }
  },

  doPush: async (repoPath) => {
    const repo = get().selectedRepo || get().allRepos.find((r) => r.path === repoPath);
    const repoName = repo?.name || repoPath.split("/").pop() || "repo";
    const branch = repo?.branch || "unknown";
    set({ syncOp: { type: "push", status: "running", repoName, branch } });
    try {
      const result = await invoke<PushResult>("push", { repoPath });
      if (result.success) {
        set({ syncOp: { type: "push", status: "success", repoName, branch, message: "Pushed successfully" } });
        const scanPath = get().scanPath;
        if (scanPath) get().scanDirectory(scanPath);
      } else {
        set({ syncOp: { type: "push", status: "error", repoName, branch, message: "Push failed", detail: result.error || undefined } });
      }
    } catch (e) {
      set({ syncOp: { type: "push", status: "error", repoName, branch, message: "Push failed", detail: `${e}` } });
    }
  },

  doPull: async (repoPath) => {
    const repo = get().selectedRepo || get().allRepos.find((r) => r.path === repoPath);
    const repoName = repo?.name || repoPath.split("/").pop() || "repo";
    const branch = repo?.branch || "unknown";
    set({ syncOp: { type: "pull", status: "running", repoName, branch } });
    try {
      const result = await invoke<PullResult>("pull", { repoPath });
      if (result.success) {
        set({ syncOp: { type: "pull", status: "success", repoName, branch, message: `Pulled ${result.commits_pulled} commit(s)` } });
        await get().loadRepoCommits(repoPath);
        const scanPath = get().scanPath;
        if (scanPath) get().scanDirectory(scanPath);
      } else {
        set({ syncOp: { type: "pull", status: "error", repoName, branch, message: "Pull failed", detail: result.error || undefined } });
      }
    } catch (e) {
      set({ syncOp: { type: "pull", status: "error", repoName, branch, message: "Pull failed", detail: `${e}` } });
    }
  },

  switchBranch: async (repoPath, branchName) => {
    try {
      await invoke("switch_branch", { repoPath, branchName });
      get().addToast("success", `Switched to ${branchName}`);
      await get().loadRepoBranches(repoPath);
      await get().loadRepoDiff(repoPath);
      const scanPath = get().scanPath;
      if (scanPath) get().scanDirectory(scanPath);
    } catch (e) {
      get().addToast("error", `Switch failed: ${e}`);
    }
  },

  checkoutRemoteBranch: async (repoPath, remoteBranch) => {
    try {
      await invoke("checkout_remote_branch", { repoPath, remoteBranch });
      const localName = remoteBranch.split("/").slice(1).join("/");
      get().addToast("success", `Checked out ${localName} from ${remoteBranch}`);
      await get().loadRepoBranches(repoPath);
      await get().loadRepoDiff(repoPath);
      const scanPath = get().scanPath;
      if (scanPath) get().scanDirectory(scanPath);
    } catch (e) {
      get().addToast("error", `Checkout failed: ${e}`);
    }
  },

  createBranch: async (repoPath, branchName, fromBranch) => {
    try {
      await invoke("create_branch", {
        repoPath,
        branchName,
        fromBranch: fromBranch ?? null,
      });
      get().addToast("success", `Created branch ${branchName}`);
      await get().loadRepoBranches(repoPath);
    } catch (e) {
      get().addToast("error", `Create branch failed: ${e}`);
    }
  },

  deleteBranch: async (repoPath, branchName) => {
    try {
      await invoke("delete_branch", { repoPath, branchName });
      get().addToast("success", `Deleted branch ${branchName}`);
      await get().loadRepoBranches(repoPath);
    } catch (e) {
      get().addToast("error", `Delete branch failed: ${e}`);
    }
  },

  stashSave: async (repoPath, message) => {
    try {
      await invoke("stash_save", { repoPath, message: message ?? null });
      get().addToast("success", "Changes stashed");
      await get().loadRepoStashes(repoPath);
      await get().loadRepoDiff(repoPath);
    } catch (e) {
      const msg = `${e}`;
      if (msg.includes("nothing to stash")) {
        get().addToast("info", "Nothing to stash — no local changes");
      } else {
        get().addToast("error", `Stash failed: ${msg}`);
      }
    }
  },

  stashApply: async (repoPath, index) => {
    try {
      await invoke("stash_apply", { repoPath, index });
      get().addToast("success", "Stash applied");
      await get().loadRepoStashes(repoPath);
      await get().loadRepoDiff(repoPath);
    } catch (e) {
      get().addToast("error", `Stash apply failed: ${e}`);
    }
  },

  stashDrop: async (repoPath, index) => {
    try {
      await invoke("stash_drop", { repoPath, index });
      get().addToast("success", "Stash dropped");
      await get().loadRepoStashes(repoPath);
    } catch (e) {
      get().addToast("error", `Stash drop failed: ${e}`);
    }
  },

  // Merge actions
  setMergeWizardOpen: (open) => set({ mergeWizardOpen: open, mergeState: open ? get().mergeState : null }),
  previewMerge: async (repoPath, sourceBranch, targetBranch) => {
    try {
      const preview = await invoke<MergePreview>("preview_merge", { repoPath, sourceBranch, targetBranch });
      set({ mergeState: { preview, result: null, conflictResolutions: {} } });
    } catch (e) {
      get().addToast("error", `Merge preview failed: ${e}`);
    }
  },
  executeMerge: async (repoPath, sourceBranch, doBackup) => {
    try {
      const result = await invoke<MergeResult>("execute_merge", { repoPath, sourceBranch, doBackup });
      set((s) => ({ mergeState: s.mergeState ? { ...s.mergeState, result } : { preview: null, result, conflictResolutions: {} } }));
      if (result.success) {
        get().addToast("success", `Merged successfully${result.commit_hash ? ` (${result.commit_hash.slice(0, 8)})` : ""}`);
        await get().loadRepoBranches(repoPath);
        await get().loadRepoCommits(repoPath);
        const scanPath = get().scanPath;
        if (scanPath) get().scanDirectory(scanPath);
      } else if (result.has_conflicts) {
        get().addToast("info", `Merge has ${result.conflict_files.length} conflict(s) to resolve`);
      } else if (result.error) {
        get().addToast("error", result.error);
      }
      return result;
    } catch (e) {
      get().addToast("error", `Merge failed: ${e}`);
      return null;
    }
  },
  resolveConflict: async (repoPath, filePath, resolution) => {
    try {
      await invoke("resolve_conflict", { repoPath, filePath, resolution });
      get().addToast("success", `Resolved ${filePath}`);
    } catch (e) {
      get().addToast("error", `Resolve failed: ${e}`);
    }
  },
  aiResolveConflict: async (repoPath, filePath) => {
    try {
      const result = await invoke<AiConflictResolution>("ai_resolve_conflict", { repoPath, filePath });
      set((s) => ({
        mergeState: s.mergeState
          ? { ...s.mergeState, conflictResolutions: { ...s.mergeState.conflictResolutions, [filePath]: result } }
          : null,
      }));
      return result;
    } catch (e) {
      get().addToast("error", `AI resolve failed: ${e}`);
      return null;
    }
  },
  abortMerge: async (repoPath) => {
    try {
      await invoke("abort_merge", { repoPath });
      set({ mergeState: null, mergeWizardOpen: false });
      get().addToast("success", "Merge aborted");
      await get().loadRepoDiff(repoPath);
    } catch (e) {
      get().addToast("error", `Abort merge failed: ${e}`);
    }
  },
  clearMergeState: () => set({ mergeState: null }),

  // Rebase actions
  setRebaseWizardOpen: (open) => set({ rebaseWizardOpen: open, rebaseState: open ? get().rebaseState : null }),
  previewRebase: async (repoPath, ontoBranch) => {
    try {
      const preview = await invoke<RebasePreview>("preview_rebase", { repoPath, ontoBranch });
      set({ rebaseState: { preview, result: null } });
    } catch (e) {
      get().addToast("error", `Rebase preview failed: ${e}`);
    }
  },
  executeRebase: async (repoPath, ontoBranch, doBackup) => {
    try {
      const result = await invoke<RebaseResult>("execute_rebase", { repoPath, ontoBranch, doBackup });
      set((s) => ({ rebaseState: s.rebaseState ? { ...s.rebaseState, result } : { preview: null, result } }));
      if (result.success && result.completed) {
        get().addToast("success", "Rebase completed successfully");
        await get().loadRepoBranches(repoPath);
        await get().loadRepoCommits(repoPath);
        const scanPath = get().scanPath;
        if (scanPath) get().scanDirectory(scanPath);
      } else if (result.conflict_files.length > 0) {
        get().addToast("info", `Rebase has conflicts at step ${result.current_step}/${result.total_steps}`);
      } else if (result.error) {
        get().addToast("error", result.error);
      }
      return result;
    } catch (e) {
      get().addToast("error", `Rebase failed: ${e}`);
      return null;
    }
  },
  continueRebase: async (repoPath) => {
    try {
      const result = await invoke<RebaseResult>("continue_rebase", { repoPath });
      set((s) => ({ rebaseState: s.rebaseState ? { ...s.rebaseState, result } : { preview: null, result } }));
      if (result.success && result.completed) {
        get().addToast("success", "Rebase completed successfully");
        await get().loadRepoBranches(repoPath);
        await get().loadRepoCommits(repoPath);
      } else if (result.conflict_files.length > 0) {
        get().addToast("info", `Rebase has more conflicts at step ${result.current_step}/${result.total_steps}`);
      }
      return result;
    } catch (e) {
      get().addToast("error", `Continue rebase failed: ${e}`);
      return null;
    }
  },
  abortRebase: async (repoPath) => {
    try {
      await invoke("abort_rebase", { repoPath });
      set({ rebaseState: null, rebaseWizardOpen: false });
      get().addToast("success", "Rebase aborted");
      await get().loadRepoDiff(repoPath);
    } catch (e) {
      get().addToast("error", `Abort rebase failed: ${e}`);
    }
  },
  clearRebaseState: () => set({ rebaseState: null }),

  // Backup actions
  setBackupManagerOpen: (open) => set({ backupManagerOpen: open }),
  createBackup: async (repoPath, operation) => {
    try {
      const info = await invoke<BackupInfo>("create_backup", { repoPath, operation });
      get().addToast("success", `Backup created: ${info.backup_branch}`);
      await get().listBackups(repoPath);
      return info;
    } catch (e) {
      get().addToast("error", `Backup failed: ${e}`);
      return null;
    }
  },
  restoreBackup: async (repoPath, backupBranch) => {
    try {
      await invoke("restore_backup", { repoPath, backupBranch });
      get().addToast("success", `Restored from ${backupBranch}`);
      await get().loadRepoDiff(repoPath);
      await get().loadRepoCommits(repoPath);
      const scanPath = get().scanPath;
      if (scanPath) get().scanDirectory(scanPath);
    } catch (e) {
      get().addToast("error", `Restore failed: ${e}`);
    }
  },
  listBackups: async (repoPath) => {
    try {
      const backups = await invoke<BackupInfo[]>("list_backups", { repoPath });
      set({ backups });
    } catch (e) {
      console.error("Failed to load backups:", e);
    }
  },
  cleanupBackups: async (repoPath, maxAgeDays) => {
    try {
      const cleaned = await invoke<number>("cleanup_old_backups", { repoPath, maxAgeDays });
      get().addToast("success", `Cleaned up ${cleaned} old backup(s)`);
      await get().listBackups(repoPath);
    } catch (e) {
      get().addToast("error", `Cleanup failed: ${e}`);
    }
  },

  // Toast
  addToast: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  filteredIdentities: () => {
    const { identities, activeFilter, searchQuery } = get();
    const query = searchQuery.toLowerCase();
    return identities
      .map((identity) => {
        const filteredRepos = identity.repos.filter((repo) => {
          const matchesFilter = activeFilter === "all" || repo.status === activeFilter;
          const matchesSearch =
            !query ||
            repo.name.toLowerCase().includes(query) ||
            repo.branch.toLowerCase().includes(query) ||
            repo.language.toLowerCase().includes(query);
          return matchesFilter && matchesSearch;
        });
        return { ...identity, repos: filteredRepos };
      })
      .filter((identity) => identity.repos.length > 0);
  },

  stats: () => {
    const { allRepos, identities } = get();
    return {
      total: allRepos.length,
      localChanges: allRepos.filter((r) => r.status === "local_changes").length,
      committed: allRepos.filter((r) => r.status === "committed").length,
      pushed: allRepos.filter((r) => r.status === "pushed").length,
      clean: allRepos.filter((r) => r.status === "clean").length,
      identityCount: identities.length,
    };
  },
}));
