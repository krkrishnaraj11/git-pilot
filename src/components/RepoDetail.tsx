import { useAppStore } from "@/stores/app-store";
import { useAiStore } from "@/stores/ai-store";
import type { RepoDetailTab } from "@/stores/types";
import { timeAgo } from "@/lib/utils";
import { DiffViewer } from "./DiffViewer";
import { BranchManager } from "./BranchManager";
import { CommitDialog } from "./CommitDialog";

const TABS: { key: RepoDetailTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "changes",
    label: "Changes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" /><path d="M5 12h14" />
      </svg>
    ),
  },
  {
    key: "branches",
    label: "Branches",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "History",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "stashes",
    label: "Stashes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" /><path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" /><path d="M4 12h16" />
      </svg>
    ),
  },
];

export function RepoDetail() {
  const repo = useAppStore((s) => s.selectedRepo);
  const color = useAppStore((s) => s.selectedRepoColor);
  const tab = useAppStore((s) => s.repoDetailTab);
  const setTab = useAppStore((s) => s.setRepoDetailTab);
  const closeDetail = useAppStore((s) => s.closeRepoDetail);
  const repoDiff = useAppStore((s) => s.repoDiff);
  const aiRunning = useAiStore((s) => s.aiStatus.running);
  const setAiPanelOpen = useAiStore((s) => s.setAiPanelOpen);
  const setMergeWizardOpen = useAppStore((s) => s.setMergeWizardOpen);
  const setRebaseWizardOpen = useAppStore((s) => s.setRebaseWizardOpen);
  const doPush = useAppStore((s) => s.doPush);
  const doPull = useAppStore((s) => s.doPull);

  if (!repo) return null;

  const stagedCount = repoDiff?.staged.length || 0;
  const unstagedCount = repoDiff?.unstaged.length || 0;

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    local_changes: { label: "Local Changes", color: "#F59E0B" },
    committed: { label: "Committed", color: "#8B5CF6" },
    pushed: { label: "Pushed", color: "#10B981" },
    clean: { label: "Clean", color: "#5A647A" },
  };
  const status = STATUS_LABELS[repo.status] || STATUS_LABELS.clean;

  return (
    <>
      {/* Full-screen container */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "var(--color-gp-bg)",
          display: "flex",
          flexDirection: "column",
          animation: "fadeIn 0.15s ease",
        }}
      >
        {/* ── Top Bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "var(--color-gp-surface-1)",
          }}
        >
          {/* Left: Back + repo info */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
            <button
              onClick={closeDetail}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-gp-text-secondary)",
                background: "var(--color-gp-surface-2)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>

            <div
              style={{
                width: "3px",
                height: "28px",
                borderRadius: "3px",
                background: `linear-gradient(180deg, ${color}, ${color}40)`,
                flexShrink: 0,
              }}
            />

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "var(--color-gp-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.02em",
                }}
              >
                {repo.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 600, color: "#8B5CF6" }}>
                  {repo.branch}
                </span>
                <span style={{ fontSize: "12px", color: "var(--color-gp-text-tertiary)" }}>/</span>
                <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)" }}>
                  {repo.language}
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    fontSize: "10px",
                    fontWeight: 700,
                    borderRadius: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: status.color,
                    background: status.color + "15",
                    border: `1px solid ${status.color}25`,
                  }}
                >
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {aiRunning && (
              <ActionBtn onClick={() => setAiPanelOpen(true)} color="#8B5CF6" label="AI Commit" icon="✦" />
            )}
            <ActionBtn onClick={() => setMergeWizardOpen(true)} color="#F59E0B" label="Merge" />
            <ActionBtn onClick={() => setRebaseWizardOpen(true)} color="#F59E0B" label="Rebase" />
            <ActionBtn onClick={() => doPull(repo.path)} color="#3B82F6" label="Pull" />
            <ActionBtn onClick={() => doPush(repo.path)} color="#10B981" label="Push" />
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "10px 32px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "var(--color-gp-surface-1)",
          }}
        >
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: isActive ? "rgba(139, 92, 246, 0.12)" : "transparent",
                  color: isActive ? "#8B5CF6" : "var(--color-gp-text-tertiary)",
                }}
              >
                {t.icon}
                {t.label}
                {t.key === "changes" && (stagedCount + unstagedCount > 0) && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "6px",
                      background: isActive ? "rgba(139, 92, 246, 0.15)" : "rgba(255,255,255,0.04)",
                      color: isActive ? "#8B5CF6" : "var(--color-gp-text-tertiary)",
                    }}
                  >
                    {stagedCount + unstagedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 32px",
          }}
        >
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            {tab === "changes" && <ChangesTab repo={repo} />}
            {tab === "branches" && <BranchManager />}
            {tab === "history" && <HistoryTab />}
            {tab === "stashes" && <StashesTab repo={repo} />}
          </div>
        </div>
      </div>

      <CommitDialog />
    </>
  );
}

function ActionBtn({ onClick, color, label, icon }: { onClick: () => void; color: string; label: string; icon?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        fontSize: "12px",
        fontWeight: 700,
        borderRadius: "10px",
        border: `1px solid ${color}25`,
        background: color + "12",
        color,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {icon && <span style={{ marginRight: "6px" }}>{icon}</span>}
      {label}
    </button>
  );
}

// ─── Changes Tab ────────────────────────────────

function ChangesTab({ repo }: { repo: { path: string } }) {
  const repoDiff = useAppStore((s) => s.repoDiff);
  const stageFiles = useAppStore((s) => s.stageFiles);
  const unstageFiles = useAppStore((s) => s.unstageFiles);
  const stageAll = useAppStore((s) => s.stageAll);
  const setCommitDialogOpen = useAppStore((s) => s.setCommitDialogOpen);

  const stagedCount = repoDiff?.staged.length || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => stageAll(repo.path)}
          style={{
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#10B981",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Stage All
        </button>
        <button
          onClick={() => setCommitDialogOpen(true)}
          disabled={stagedCount === 0}
          style={{
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#fff",
            background: stagedCount > 0 ? "#8B5CF6" : "rgba(139,92,246,0.3)",
            border: "none",
            borderRadius: "10px",
            cursor: stagedCount > 0 ? "pointer" : "not-allowed",
            opacity: stagedCount > 0 ? 1 : 0.4,
            boxShadow: stagedCount > 0 ? "0 4px 16px rgba(139,92,246,0.25)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Commit ({stagedCount})
        </button>
      </div>

      {/* Staged */}
      <div>
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#10B981",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "14px",
          }}
        >
          Staged ({repoDiff?.staged.length || 0})
        </h3>
        {stagedCount === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "var(--color-gp-text-tertiary)", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
            No staged changes
          </div>
        ) : (
          <DiffViewer
            files={repoDiff?.staged || []}
            type="staged"
            repoPath={repo.path}
            onUnstage={(paths) => unstageFiles(repo.path, paths)}
          />
        )}
      </div>

      {/* Unstaged */}
      <div>
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#F59E0B",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "14px",
          }}
        >
          Unstaged ({repoDiff?.unstaged.length || 0})
        </h3>
        <DiffViewer
          files={repoDiff?.unstaged || []}
          type="unstaged"
          repoPath={repo.path}
          onStage={(paths) => stageFiles(repo.path, paths)}
        />
      </div>
    </div>
  );
}

// ─── History Tab ────────────────────────────────

function HistoryTab() {
  const commits = useAppStore((s) => s.repoCommits);

  if (commits.length === 0) {
    return (
      <div style={{ padding: "48px 20px", textAlign: "center", fontSize: "14px", color: "var(--color-gp-text-tertiary)" }}>
        No commits found
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {commits.map((c, i) => (
        <div
          key={c.hash}
          className="animate-fade-in-up"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
            padding: "16px 20px",
            background: "var(--color-gp-card)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px",
            animationDelay: `${i * 15}ms`,
            transition: "border-color 0.15s ease",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              fontWeight: 700,
              color: "#8B5CF6",
              background: "rgba(139, 92, 246, 0.1)",
              padding: "4px 10px",
              borderRadius: "8px",
              flexShrink: 0,
              marginTop: "2px",
            }}
          >
            {c.short_hash}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-gp-text)", lineHeight: 1.4 }}>
              {c.message.split("\n")[0]}
            </p>
            <p style={{ fontSize: "12px", color: "var(--color-gp-text-tertiary)", marginTop: "4px" }}>
              {c.author_name}
            </p>
          </div>
          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)", flexShrink: 0 }}>
            {timeAgo(c.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stashes Tab ────────────────────────────────

function StashesTab({ repo }: { repo: { path: string } }) {
  const stashes = useAppStore((s) => s.repoStashes);
  const stashSave = useAppStore((s) => s.stashSave);
  const stashApply = useAppStore((s) => s.stashApply);
  const stashDrop = useAppStore((s) => s.stashDrop);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <button
        onClick={() => stashSave(repo.path)}
        style={{
          width: "100%",
          padding: "14px 20px",
          fontSize: "14px",
          fontWeight: 700,
          color: "#3B82F6",
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: "12px",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        Stash Current Changes
      </button>

      {stashes.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", fontSize: "14px", color: "var(--color-gp-text-tertiary)" }}>
          No stashes
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {stashes.map((s) => (
            <div
              key={s.index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 20px",
                background: "var(--color-gp-card)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "#3B82F6",
                  background: "rgba(59, 130, 246, 0.1)",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              >
                @{s.index}
              </span>
              <span style={{ flex: 1, fontSize: "13px", color: "var(--color-gp-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.message}
              </span>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)", flexShrink: 0 }}>
                {timeAgo(s.date)}
              </span>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button
                  onClick={() => stashApply(repo.path, s.index)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#10B981",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => stashDrop(repo.path, s.index)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#EF4444",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Drop
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
