import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ConflictResolver } from "./ConflictResolver";

type WizardStep = "select" | "preview" | "conflicts" | "done";

export function MergeWizard() {
  const open = useAppStore((s) => s.mergeWizardOpen);
  const setOpen = useAppStore((s) => s.setMergeWizardOpen);
  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const branches = useAppStore((s) => s.repoBranches);
  const mergeState = useAppStore((s) => s.mergeState);
  const previewMerge = useAppStore((s) => s.previewMerge);
  const executeMerge = useAppStore((s) => s.executeMerge);
  const abortMerge = useAppStore((s) => s.abortMerge);
  const clearMergeState = useAppStore((s) => s.clearMergeState);
  const loadRepoBranches = useAppStore((s) => s.loadRepoBranches);

  const [step, setStep] = useState<WizardStep>("select");
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [doBackup, setDoBackup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedFiles, setResolvedFiles] = useState<Set<string>>(new Set());

  const currentBranch = selectedRepo?.branch || "";

  useEffect(() => {
    if (open && selectedRepo) {
      setStep("select");
      setSourceBranch("");
      setTargetBranch(currentBranch);
      setDoBackup(true);
      setResolvedFiles(new Set());
      clearMergeState();
      loadRepoBranches(selectedRepo.path);
    }
  }, [open]);

  if (!selectedRepo) return null;

  const localBranches = branches.filter((b) => !b.is_remote);

  const handlePreview = async () => {
    if (!sourceBranch || !targetBranch) return;
    setIsLoading(true);
    await previewMerge(selectedRepo.path, sourceBranch, targetBranch);
    setIsLoading(false);
    setStep("preview");
  };

  const handleMerge = async () => {
    setIsLoading(true);
    const result = await executeMerge(selectedRepo.path, sourceBranch, doBackup);
    setIsLoading(false);
    if (result?.success) {
      setStep("done");
    } else if (result?.has_conflicts) {
      setStep("conflicts");
    }
  };

  const handleFileResolved = (filePath: string) => {
    setResolvedFiles((prev) => new Set([...prev, filePath]));
  };

  const allConflictsResolved =
    mergeState?.result?.conflict_files.length === resolvedFiles.size &&
    (mergeState?.result?.conflict_files.length ?? 0) > 0;

  const handleClose = () => {
    setOpen(false);
    clearMergeState();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-[6px] z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-h-[88vh] overflow-y-auto bg-gp-bg border border-gp-border rounded-3xl shadow-2xl shadow-black/40 z-[60]">
          {/* Header */}
          <div className="px-10 pt-9 pb-7 border-b border-gp-border bg-gp-surface-1 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-[22px] font-extrabold text-gp-text tracking-tight">
                  Merge Branches
                </Dialog.Title>
                <Dialog.Description className="text-[14px] text-gp-text-tertiary mt-2">
                  {selectedRepo.name} &middot; <span className="text-gp-purple font-semibold">{currentBranch}</span>
                </Dialog.Description>
              </div>
              <Dialog.Close className="p-3 rounded-xl hover:bg-gp-surface-2 text-gp-text-tertiary hover:text-gp-text transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          <div className="px-10 py-8">
            {/* Safety banner */}
            {mergeState?.result?.backup_branch && (
              <div className="flex items-center justify-between px-5 py-4 bg-gp-success/8 border border-gp-success/20 rounded-2xl mb-6">
                <span className="text-[13px] text-gp-success font-mono font-medium">
                  Backup: {mergeState.result.backup_branch}
                </span>
                <button
                  onClick={() => abortMerge(selectedRepo.path)}
                  className="px-4 py-2 text-[12px] font-bold text-gp-danger bg-gp-danger/10 border border-gp-danger/20 rounded-xl hover:bg-gp-danger/15 transition-colors"
                >
                  Abort
                </button>
              </div>
            )}

            {/* Step indicators */}
            <div className="flex items-center gap-3 mb-7">
              {(["select", "preview", "conflicts", "done"] as WizardStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  {i > 0 && <div className="w-8 h-px bg-gp-border" />}
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold",
                      step === s
                        ? "bg-gp-purple text-white"
                        : (["select", "preview", "conflicts", "done"].indexOf(step) > i)
                          ? "bg-gp-success/20 text-gp-success"
                          : "bg-gp-surface-2 text-gp-text-tertiary"
                    )}
                  >
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Select */}
            {step === "select" && (
              <div className="space-y-6">
                <div>
                  <label className="text-[13px] font-bold text-gp-text-secondary block mb-2.5">Source Branch (merge from)</label>
                  <select
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    className="w-full px-5 py-3.5 text-[14px] font-mono bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/50"
                  >
                    <option value="">Select branch...</option>
                    {localBranches
                      .filter((b) => b.name !== targetBranch)
                      .map((b) => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gp-text-secondary block mb-2.5">Target Branch (merge into)</label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="w-full px-5 py-3.5 text-[14px] font-mono bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/50"
                  >
                    {localBranches
                      .filter((b) => b.name !== sourceBranch)
                      .map((b) => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handlePreview}
                    disabled={!sourceBranch || !targetBranch || isLoading}
                    className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Analyzing..." : "Preview Merge"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && mergeState?.preview && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl text-center">
                    <p className="text-xl font-extrabold text-gp-text">{mergeState.preview.files_changed}</p>
                    <p className="text-[12px] text-gp-text-tertiary mt-1">Files Changed</p>
                  </div>
                  <div className="px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl text-center">
                    <p className="text-xl font-extrabold text-gp-text">{mergeState.preview.commits_to_merge}</p>
                    <p className="text-[12px] text-gp-text-tertiary mt-1">Commits</p>
                  </div>
                  <div className="px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl text-center">
                    {mergeState.preview.can_fast_forward ? (
                      <span className="text-[11px] font-bold text-gp-success bg-gp-success/10 px-3 py-1.5 rounded-lg">FAST-FORWARD</span>
                    ) : (
                      <span className="text-[11px] font-bold text-gp-info bg-gp-info/10 px-3 py-1.5 rounded-lg">3-WAY MERGE</span>
                    )}
                    <p className="text-[12px] text-gp-text-tertiary mt-2">Strategy</p>
                  </div>
                </div>

                {mergeState.preview.has_conflicts && (
                  <div className="flex items-center gap-3 px-5 py-4 bg-gp-warning/8 border border-gp-warning/20 rounded-2xl">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="text-[13px] text-gp-warning font-medium">
                      {mergeState.preview.conflict_files.length} potential conflict(s) detected
                    </span>
                  </div>
                )}

                {/* Backup toggle */}
                <label className="flex items-center gap-3 cursor-pointer px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl">
                  <input
                    type="checkbox"
                    checked={doBackup}
                    onChange={(e) => setDoBackup(e.target.checked)}
                    className="rounded border-gp-border"
                  />
                  <span className="text-[14px] text-gp-text font-medium">Create backup before merge</span>
                </label>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep("select")}
                    className="px-5 py-3 text-[14px] font-bold text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleMerge}
                    disabled={isLoading}
                    className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors disabled:opacity-40"
                  >
                    {isLoading ? "Merging..." : "Merge"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Conflicts */}
            {step === "conflicts" && mergeState?.result && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-gp-text-secondary font-medium">
                    {resolvedFiles.size}/{mergeState.result.conflict_files.length} resolved
                  </span>
                  <div className="w-40 h-2 bg-gp-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gp-purple rounded-full transition-all"
                      style={{ width: `${mergeState.result.conflict_files.length > 0 ? (resolvedFiles.size / mergeState.result.conflict_files.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {mergeState.preview?.conflict_files.map((conflict) => (
                  <ConflictResolver
                    key={conflict.path}
                    repoPath={selectedRepo.path}
                    conflict={conflict}
                    onResolved={() => handleFileResolved(conflict.path)}
                  />
                ))}

                <div className="flex justify-between">
                  <button
                    onClick={() => abortMerge(selectedRepo.path)}
                    className="px-5 py-3 text-[14px] font-bold text-gp-danger bg-gp-danger/10 border border-gp-danger/20 rounded-xl hover:bg-gp-danger/15 transition-colors"
                  >
                    Abort Merge
                  </button>
                  <button
                    onClick={() => setStep("done")}
                    disabled={!allConflictsResolved}
                    className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue Merge
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === "done" && (
              <div className="space-y-6 text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gp-success/20 flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-gp-text mb-2">Merge Complete</h3>
                  {mergeState?.result?.commit_hash && (
                    <p className="text-[13px] font-mono text-gp-text-tertiary">
                      Commit: {mergeState.result.commit_hash.slice(0, 8)}
                    </p>
                  )}
                  {mergeState?.result?.backup_branch && (
                    <p className="text-[13px] font-mono text-gp-text-tertiary mt-1.5">
                      Backup: {mergeState.result.backup_branch}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Rebase Wizard ──────────────────────────────────────────

export function RebaseWizard() {
  const open = useAppStore((s) => s.rebaseWizardOpen);
  const setOpen = useAppStore((s) => s.setRebaseWizardOpen);
  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const branches = useAppStore((s) => s.repoBranches);
  const rebaseState = useAppStore((s) => s.rebaseState);
  const previewRebase = useAppStore((s) => s.previewRebase);
  const executeRebase = useAppStore((s) => s.executeRebase);
  const continueRebase = useAppStore((s) => s.continueRebase);
  const abortRebase = useAppStore((s) => s.abortRebase);
  const clearRebaseState = useAppStore((s) => s.clearRebaseState);
  const resolveConflict = useAppStore((s) => s.resolveConflict);
  const loadRepoBranches = useAppStore((s) => s.loadRepoBranches);

  const [step, setStep] = useState<"select" | "preview" | "progress" | "done">("select");
  const [ontoBranch, setOntoBranch] = useState("");
  const [doBackup, setDoBackup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const currentBranch = selectedRepo?.branch || "";

  useEffect(() => {
    if (open && selectedRepo) {
      setStep("select");
      setOntoBranch("");
      setDoBackup(true);
      clearRebaseState();
      loadRepoBranches(selectedRepo.path);
    }
  }, [open]);

  if (!selectedRepo) return null;

  const localBranches = branches.filter((b) => !b.is_remote && !b.is_current);

  const handlePreview = async () => {
    if (!ontoBranch) return;
    setIsLoading(true);
    await previewRebase(selectedRepo.path, ontoBranch);
    setIsLoading(false);
    setStep("preview");
  };

  const handleRebase = async () => {
    setIsLoading(true);
    const result = await executeRebase(selectedRepo.path, ontoBranch, doBackup);
    setIsLoading(false);
    if (result?.success && result.completed) {
      setStep("done");
    } else if (result && result.conflict_files.length > 0) {
      setStep("progress");
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    const result = await continueRebase(selectedRepo.path);
    setIsLoading(false);
    if (result?.success && result.completed) {
      setStep("done");
    }
  };

  const handleClose = () => {
    setOpen(false);
    clearRebaseState();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-[6px] z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[88vh] overflow-y-auto bg-gp-bg border border-gp-border rounded-3xl shadow-2xl shadow-black/40 z-[60]">
          {/* Header */}
          <div className="px-10 pt-9 pb-7 border-b border-gp-border bg-gp-surface-1 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-[22px] font-extrabold text-gp-text tracking-tight">
                  Rebase Branch
                </Dialog.Title>
                <Dialog.Description className="text-[14px] text-gp-text-tertiary mt-2">
                  Replay <span className="text-gp-purple font-semibold">{currentBranch}</span> commits onto another branch
                </Dialog.Description>
              </div>
              <Dialog.Close className="p-3 rounded-xl hover:bg-gp-surface-2 text-gp-text-tertiary hover:text-gp-text transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          <div className="px-10 py-8">
            {/* Backup banner */}
            {rebaseState?.result?.backup_branch && (
              <div className="flex items-center justify-between px-5 py-4 bg-gp-success/8 border border-gp-success/20 rounded-2xl mb-6">
                <span className="text-[13px] text-gp-success font-mono font-medium">
                  Backup: {rebaseState.result.backup_branch}
                </span>
                <button
                  onClick={() => abortRebase(selectedRepo.path)}
                  className="px-4 py-2 text-[12px] font-bold text-gp-danger bg-gp-danger/10 border border-gp-danger/20 rounded-xl hover:bg-gp-danger/15 transition-colors"
                >
                  Abort
                </button>
              </div>
            )}

            {/* Step: Select */}
            {step === "select" && (
              <div className="space-y-6">
                <div>
                  <label className="text-[13px] font-bold text-gp-text-secondary block mb-2.5">Rebase onto</label>
                  <select
                    value={ontoBranch}
                    onChange={(e) => setOntoBranch(e.target.value)}
                    className="w-full px-5 py-3.5 text-[14px] font-mono bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/50"
                  >
                    <option value="">Select branch...</option>
                    {localBranches.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handlePreview}
                    disabled={!ontoBranch || isLoading}
                    className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors disabled:opacity-40"
                  >
                    {isLoading ? "Analyzing..." : "Preview Rebase"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Preview */}
            {step === "preview" && rebaseState?.preview && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl text-center">
                    <p className="text-xl font-extrabold text-gp-text">{rebaseState.preview.commits_to_replay.length}</p>
                    <p className="text-[12px] text-gp-text-tertiary mt-1">Commits to Replay</p>
                  </div>
                  <div className="px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl text-center">
                    {rebaseState.preview.potential_conflicts ? (
                      <span className="text-[11px] font-bold text-gp-warning bg-gp-warning/10 px-3 py-1.5 rounded-lg">POTENTIAL CONFLICTS</span>
                    ) : (
                      <span className="text-[11px] font-bold text-gp-success bg-gp-success/10 px-3 py-1.5 rounded-lg">CLEAN</span>
                    )}
                    <p className="text-[12px] text-gp-text-tertiary mt-2">Conflict Risk</p>
                  </div>
                </div>

                {/* Commit list */}
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {rebaseState.preview.commits_to_replay.map((c) => (
                    <div key={c.hash} className="flex items-center gap-3 px-5 py-3 bg-gp-surface-1 border border-gp-border rounded-xl">
                      <span className="text-[11px] font-mono text-gp-purple bg-gp-purple/10 px-2.5 py-1 rounded-lg shrink-0 font-bold">
                        {c.short_hash}
                      </span>
                      <span className="text-[13px] text-gp-text truncate">{c.message.split("\n")[0]}</span>
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-3 cursor-pointer px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl">
                  <input
                    type="checkbox"
                    checked={doBackup}
                    onChange={(e) => setDoBackup(e.target.checked)}
                    className="rounded border-gp-border"
                  />
                  <span className="text-[14px] text-gp-text font-medium">Create backup before rebase</span>
                </label>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep("select")}
                    className="px-5 py-3 text-[14px] font-bold text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRebase}
                    disabled={isLoading}
                    className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors disabled:opacity-40"
                  >
                    {isLoading ? "Rebasing..." : "Rebase"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Progress (conflicts during rebase) */}
            {step === "progress" && rebaseState?.result && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-5 py-4 bg-gp-warning/8 border border-gp-warning/20 rounded-2xl">
                  <span className="text-[13px] text-gp-warning font-medium">
                    Conflict at step {rebaseState.result.current_step}/{rebaseState.result.total_steps}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[13px] font-bold text-gp-text-secondary">Conflicted files:</span>
                  {rebaseState.result.conflict_files.map((f) => (
                    <div key={f} className="px-5 py-3 text-[13px] font-mono text-gp-danger bg-gp-danger/5 border border-gp-danger/10 rounded-xl">
                      {f}
                    </div>
                  ))}
                </div>

                <p className="text-[13px] text-gp-text-tertiary">
                  Resolve conflicts in your editor, then stage the files and click Continue.
                </p>

                <div className="flex justify-between">
                  <button
                    onClick={() => abortRebase(selectedRepo.path)}
                    className="px-5 py-3 text-[14px] font-bold text-gp-danger bg-gp-danger/10 border border-gp-danger/20 rounded-xl hover:bg-gp-danger/15 transition-colors"
                  >
                    Abort Rebase
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={isLoading}
                    className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors disabled:opacity-40"
                  >
                    {isLoading ? "Continuing..." : "Continue Rebase"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Done */}
            {step === "done" && (
              <div className="space-y-6 text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gp-success/20 flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-gp-text mb-2">Rebase Complete</h3>
                  {rebaseState?.result?.backup_branch && (
                    <p className="text-[13px] font-mono text-gp-text-tertiary">
                      Backup: {rebaseState.result.backup_branch}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 text-[14px] font-bold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
