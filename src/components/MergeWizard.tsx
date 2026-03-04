import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "@/stores/app-store";
import { ConflictResolver } from "./ConflictResolver";

type WizardStep = "select" | "preview" | "conflicts" | "done";

// ── Custom Branch Dropdown ──────────────────────────────────

function BranchSelect({
  value,
  onChange,
  options,
  placeholder = "Select branch...",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { name: string; isCurrent?: boolean }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = options.find((o) => o.name === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          fontSize: "13px",
          fontFamily: "monospace",
          fontWeight: selected ? 600 : 400,
          color: selected ? "var(--color-gp-text)" : "var(--color-gp-text-tertiary)",
          background: "rgba(255,255,255,0.03)",
          border: open ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          cursor: "pointer",
          transition: "all 0.15s ease",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
          {selected && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected ? selected.name : placeholder}
          </span>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-gp-text-tertiary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: "240px",
            overflowY: "auto",
            background: "rgba(18, 22, 38, 0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "14px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            zIndex: 100,
            padding: "6px",
            animation: "spotlightIn 0.12s ease",
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--color-gp-text-tertiary)" }}>
              No branches available
            </div>
          )}
          {options.map((opt) => {
            const isSelected = opt.name === value;
            return (
              <button
                key={opt.name}
                type="button"
                onClick={() => { onChange(opt.name); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? "#8B5CF6" : "var(--color-gp-text)",
                  background: isSelected ? "rgba(139,92,246,0.1)" : "transparent",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.1s ease",
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isSelected ? "#8B5CF6" : "var(--color-gp-text-tertiary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                  <path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {opt.name}
                </span>
                {opt.isCurrent && (
                  <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "6px", flexShrink: 0 }}>
                    Current
                  </span>
                )}
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 22px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#fff",
  background: "#8B5CF6",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow: "0 4px 16px rgba(139,92,246,0.25)",
};

const BTN_SECONDARY: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "13px",
  fontWeight: 700,
  color: "var(--color-gp-text-secondary)",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const BTN_DANGER: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "13px",
  fontWeight: 700,
  color: "#EF4444",
  background: "rgba(239,68,68,0.08)",
  border: "1px solid rgba(239,68,68,0.15)",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const CARD_STYLE: React.CSSProperties = {
  padding: "16px 20px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
};

function StepDots({ steps, current }: { steps: string[]; current: string }) {
  const ci = steps.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {i > 0 && <div style={{ width: "28px", height: "1px", background: "rgba(255,255,255,0.08)" }} />}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              background: i === ci ? "#8B5CF6" : i < ci ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
              color: i === ci ? "#fff" : i < ci ? "#10B981" : "var(--color-gp-text-tertiary)",
              transition: "all 0.2s ease",
            }}
          >
            {i < ci ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              i + 1
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Merge Wizard
// ═══════════════════════════════════════════════════════════════

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
    if (result?.success) setStep("done");
    else if (result?.has_conflicts) setStep("conflicts");
  };

  const handleFileResolved = (filePath: string) => {
    setResolvedFiles((prev) => new Set([...prev, filePath]));
  };

  const allConflictsResolved =
    mergeState?.result?.conflict_files.length === resolvedFiles.size &&
    (mergeState?.result?.conflict_files.length ?? 0) > 0;

  const handleClose = () => { setOpen(false); clearMergeState(); };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 60 }} />
        <Dialog.Content style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "660px", maxHeight: "88vh", overflowY: "auto", background: "var(--color-gp-bg)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", zIndex: 60, animation: "spotlightIn 0.2s ease" }}>
          {/* Header */}
          <div style={{ padding: "28px 32px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "var(--color-gp-surface-1)", borderRadius: "20px 20px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <Dialog.Title style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-gp-text)", letterSpacing: "-0.02em", margin: 0 }}>
                  Merge Branches
                </Dialog.Title>
                <Dialog.Description style={{ fontSize: "13px", color: "var(--color-gp-text-tertiary)", marginTop: "6px" }}>
                  {selectedRepo.name} · <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{currentBranch}</span>
                </Dialog.Description>
              </div>
              <Dialog.Close style={{ padding: "8px", borderRadius: "10px", border: "none", background: "transparent", color: "var(--color-gp-text-tertiary)", cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          <div style={{ padding: "24px 32px 28px" }}>
            {/* Backup banner */}
            {mergeState?.result?.backup_branch && (
              <div style={{ ...CARD_STYLE, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", color: "#10B981", fontFamily: "monospace", fontWeight: 600 }}>Backup: {mergeState.result.backup_branch}</span>
                <button onClick={() => abortMerge(selectedRepo.path)} style={{ ...BTN_DANGER, padding: "6px 14px", fontSize: "11px" }}>Abort</button>
              </div>
            )}

            <StepDots steps={["select", "preview", "conflicts", "done"]} current={step} />

            {/* Step 1: Select */}
            {step === "select" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>Source Branch (merge from)</label>
                  <BranchSelect
                    value={sourceBranch}
                    onChange={setSourceBranch}
                    options={localBranches.filter((b) => b.name !== targetBranch).map((b) => ({ name: b.name, isCurrent: b.is_current }))}
                    placeholder="Select branch..."
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>Target Branch (merge into)</label>
                  <BranchSelect
                    value={targetBranch}
                    onChange={setTargetBranch}
                    options={localBranches.filter((b) => b.name !== sourceBranch).map((b) => ({ name: b.name, isCurrent: b.is_current }))}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handlePreview} disabled={!sourceBranch || !targetBranch || isLoading} style={{ ...BTN_PRIMARY, opacity: !sourceBranch || !targetBranch || isLoading ? 0.4 : 1, cursor: !sourceBranch || !targetBranch ? "not-allowed" : "pointer" }}>
                    {isLoading ? "Analyzing..." : "Preview Merge"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && mergeState?.preview && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  {[
                    { label: "Files Changed", value: mergeState.preview.files_changed },
                    { label: "Commits", value: mergeState.preview.commits_to_merge },
                  ].map((s) => (
                    <div key={s.label} style={{ ...CARD_STYLE, textAlign: "center" }}>
                      <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-gp-text)" }}>{s.value}</p>
                      <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "4px" }}>{s.label}</p>
                    </div>
                  ))}
                  <div style={{ ...CARD_STYLE, textAlign: "center" }}>
                    {mergeState.preview.can_fast_forward ? (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: "8px" }}>FAST-FORWARD</span>
                    ) : (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.1)", padding: "4px 10px", borderRadius: "8px" }}>3-WAY MERGE</span>
                    )}
                    <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "8px" }}>Strategy</p>
                  </div>
                </div>

                {mergeState.preview.has_conflicts && (
                  <div style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span style={{ fontSize: "13px", color: "#F59E0B", fontWeight: 600 }}>{mergeState.preview.conflict_files.length} potential conflict(s) detected</span>
                  </div>
                )}

                <label style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                  <input type="checkbox" checked={doBackup} onChange={(e) => setDoBackup(e.target.checked)} style={{ accentColor: "#8B5CF6" }} />
                  <span style={{ fontSize: "13px", color: "var(--color-gp-text)", fontWeight: 500 }}>Create backup before merge</span>
                </label>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep("select")} style={BTN_SECONDARY}>Back</button>
                  <button onClick={handleMerge} disabled={isLoading} style={{ ...BTN_PRIMARY, opacity: isLoading ? 0.4 : 1 }}>
                    {isLoading ? "Merging..." : "Merge"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Conflicts */}
            {step === "conflicts" && mergeState?.result && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "var(--color-gp-text-secondary)", fontWeight: 500 }}>
                    {resolvedFiles.size}/{mergeState.result.conflict_files.length} resolved
                  </span>
                  <div style={{ width: "160px", height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ width: `${mergeState.result.conflict_files.length > 0 ? (resolvedFiles.size / mergeState.result.conflict_files.length) * 100 : 0}%`, height: "100%", background: "#8B5CF6", borderRadius: "6px", transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {mergeState.preview?.conflict_files.map((conflict) => (
                  <ConflictResolver key={conflict.path} repoPath={selectedRepo.path} conflict={conflict} onResolved={() => handleFileResolved(conflict.path)} />
                ))}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => abortMerge(selectedRepo.path)} style={BTN_DANGER}>Abort Merge</button>
                  <button onClick={() => setStep("done")} disabled={!allConflictsResolved} style={{ ...BTN_PRIMARY, opacity: !allConflictsResolved ? 0.4 : 1, cursor: !allConflictsResolved ? "not-allowed" : "pointer" }}>
                    Continue Merge
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === "done" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "24px 0" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-gp-text)", marginBottom: "8px" }}>Merge Complete</h3>
                  {mergeState?.result?.commit_hash && (
                    <p style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)" }}>Commit: {mergeState.result.commit_hash.slice(0, 8)}</p>
                  )}
                  {mergeState?.result?.backup_branch && (
                    <p style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)", marginTop: "4px" }}>Backup: {mergeState.result.backup_branch}</p>
                  )}
                </div>
                <button onClick={handleClose} style={BTN_PRIMARY}>Done</button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ═══════════════════════════════════════════════════════════════
// Rebase Wizard
// ═══════════════════════════════════════════════════════════════

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
    if (result?.success && result.completed) setStep("done");
    else if (result && result.conflict_files.length > 0) setStep("progress");
  };

  const handleContinue = async () => {
    setIsLoading(true);
    const result = await continueRebase(selectedRepo.path);
    setIsLoading(false);
    if (result?.success && result.completed) setStep("done");
  };

  const handleClose = () => { setOpen(false); clearRebaseState(); };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 60 }} />
        <Dialog.Content style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "660px", maxHeight: "88vh", overflowY: "auto", background: "var(--color-gp-bg)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", zIndex: 60, animation: "spotlightIn 0.2s ease" }}>
          {/* Header */}
          <div style={{ padding: "28px 32px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "var(--color-gp-surface-1)", borderRadius: "20px 20px 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <Dialog.Title style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-gp-text)", letterSpacing: "-0.02em", margin: 0 }}>
                  Rebase Branch
                </Dialog.Title>
                <Dialog.Description style={{ fontSize: "13px", color: "var(--color-gp-text-tertiary)", marginTop: "6px" }}>
                  Replay <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{currentBranch}</span> commits onto another branch
                </Dialog.Description>
              </div>
              <Dialog.Close style={{ padding: "8px", borderRadius: "10px", border: "none", background: "transparent", color: "var(--color-gp-text-tertiary)", cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          <div style={{ padding: "24px 32px 28px" }}>
            {/* Backup banner */}
            {rebaseState?.result?.backup_branch && (
              <div style={{ ...CARD_STYLE, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: "20px" }}>
                <span style={{ fontSize: "12px", color: "#10B981", fontFamily: "monospace", fontWeight: 600 }}>Backup: {rebaseState.result.backup_branch}</span>
                <button onClick={() => abortRebase(selectedRepo.path)} style={{ ...BTN_DANGER, padding: "6px 14px", fontSize: "11px" }}>Abort</button>
              </div>
            )}

            <StepDots steps={["select", "preview", "progress", "done"]} current={step} />

            {/* Step: Select */}
            {step === "select" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>Rebase onto</label>
                  <BranchSelect
                    value={ontoBranch}
                    onChange={setOntoBranch}
                    options={localBranches.map((b) => ({ name: b.name, isCurrent: b.is_current }))}
                    placeholder="Select branch..."
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handlePreview} disabled={!ontoBranch || isLoading} style={{ ...BTN_PRIMARY, opacity: !ontoBranch || isLoading ? 0.4 : 1, cursor: !ontoBranch ? "not-allowed" : "pointer" }}>
                    {isLoading ? "Analyzing..." : "Preview Rebase"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Preview */}
            {step === "preview" && rebaseState?.preview && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ ...CARD_STYLE, textAlign: "center" }}>
                    <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-gp-text)" }}>{rebaseState.preview.commits_to_replay.length}</p>
                    <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "4px" }}>Commits to Replay</p>
                  </div>
                  <div style={{ ...CARD_STYLE, textAlign: "center" }}>
                    {rebaseState.preview.potential_conflicts ? (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.1)", padding: "4px 10px", borderRadius: "8px" }}>POTENTIAL CONFLICTS</span>
                    ) : (
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: "8px" }}>CLEAN</span>
                    )}
                    <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "8px" }}>Conflict Risk</p>
                  </div>
                </div>

                {/* Commit list */}
                <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {rebaseState.preview.commits_to_replay.map((c) => (
                    <div key={c.hash} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px" }}>
                      <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, color: "#8B5CF6", background: "rgba(139,92,246,0.1)", padding: "3px 8px", borderRadius: "6px", flexShrink: 0 }}>{c.short_hash}</span>
                      <span style={{ fontSize: "12px", color: "var(--color-gp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message.split("\n")[0]}</span>
                    </div>
                  ))}
                </div>

                <label style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                  <input type="checkbox" checked={doBackup} onChange={(e) => setDoBackup(e.target.checked)} style={{ accentColor: "#8B5CF6" }} />
                  <span style={{ fontSize: "13px", color: "var(--color-gp-text)", fontWeight: 500 }}>Create backup before rebase</span>
                </label>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep("select")} style={BTN_SECONDARY}>Back</button>
                  <button onClick={handleRebase} disabled={isLoading} style={{ ...BTN_PRIMARY, opacity: isLoading ? 0.4 : 1 }}>
                    {isLoading ? "Rebasing..." : "Rebase"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Progress (conflicts) */}
            {step === "progress" && rebaseState?.result && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span style={{ fontSize: "13px", color: "#F59E0B", fontWeight: 600 }}>
                    Conflict at step {rebaseState.result.current_step}/{rebaseState.result.total_steps}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-secondary)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "4px" }}>Conflicted files</span>
                  {rebaseState.result.conflict_files.map((f) => (
                    <div key={f} style={{ padding: "10px 16px", fontSize: "12px", fontFamily: "monospace", color: "#EF4444", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: "10px" }}>
                      {f}
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: "12px", color: "var(--color-gp-text-tertiary)" }}>
                  Resolve conflicts in your editor, then stage the files and click Continue.
                </p>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => abortRebase(selectedRepo.path)} style={BTN_DANGER}>Abort Rebase</button>
                  <button onClick={handleContinue} disabled={isLoading} style={{ ...BTN_PRIMARY, opacity: isLoading ? 0.4 : 1 }}>
                    {isLoading ? "Continuing..." : "Continue Rebase"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Done */}
            {step === "done" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "24px 0" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-gp-text)", marginBottom: "8px" }}>Rebase Complete</h3>
                  {rebaseState?.result?.backup_branch && (
                    <p style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)" }}>Backup: {rebaseState.result.backup_branch}</p>
                  )}
                </div>
                <button onClick={handleClose} style={BTN_PRIMARY}>Done</button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
