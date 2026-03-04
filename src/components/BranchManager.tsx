import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { timeAgo } from "@/lib/utils";

export function BranchManager() {
  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const branches = useAppStore((s) => s.repoBranches);
  const switchBranch = useAppStore((s) => s.switchBranch);
  const checkoutRemoteBranch = useAppStore((s) => s.checkoutRemoteBranch);
  const createBranch = useAppStore((s) => s.createBranch);
  const deleteBranch = useAppStore((s) => s.deleteBranch);
  const setMergeWizardOpen = useAppStore((s) => s.setMergeWizardOpen);
  const previewMerge = useAppStore((s) => s.previewMerge);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState<"local" | "remote" | "all">("local");

  if (!selectedRepo) return null;

  const filtered = branches.filter((b) => {
    if (filter === "local") return !b.is_remote;
    if (filter === "remote") return b.is_remote;
    return true;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createBranch(selectedRepo.path, newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    background: active ? "var(--color-gp-surface-3)" : "transparent",
    color: active ? "var(--color-gp-text)" : "var(--color-gp-text-tertiary)",
  });

  const actionBtnStyle = (color: string): React.CSSProperties => ({
    padding: "6px 14px",
    fontSize: "11px",
    fontWeight: 700,
    color,
    background: color + "12",
    border: `1px solid ${color}20`,
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Filter tabs + create */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            gap: "2px",
            background: "var(--color-gp-surface-1)",
            borderRadius: "10px",
            padding: "3px",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {(["local", "remote", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(filter === f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#8B5CF6",
            background: "rgba(139, 92, 246, 0.1)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          + New Branch
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="feature/my-branch"
            style={{
              flex: 1,
              padding: "10px 16px",
              fontSize: "13px",
              fontFamily: "monospace",
              background: "var(--color-gp-surface-1)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              color: "var(--color-gp-text)",
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            style={{
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#fff",
              background: newName.trim() ? "#8B5CF6" : "rgba(139,92,246,0.3)",
              border: "none",
              borderRadius: "10px",
              cursor: newName.trim() ? "pointer" : "not-allowed",
              opacity: newName.trim() ? 1 : 0.4,
            }}
          >
            Create
          </button>
        </div>
      )}

      {/* Branch list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "48px 20px", textAlign: "center", fontSize: "14px", color: "var(--color-gp-text-tertiary)" }}>
            No branches
          </div>
        )}
        {filtered.map((branch, i) => {
          const isCurrent = branch.is_current;
          return (
            <div
              key={`${branch.is_remote ? "r" : "l"}-${branch.name}`}
              className="animate-fade-in-up"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px 20px",
                background: isCurrent ? "rgba(139, 92, 246, 0.06)" : "var(--color-gp-card)",
                border: isCurrent
                  ? "1px solid rgba(139, 92, 246, 0.15)"
                  : "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                animationDelay: `${i * 15}ms`,
                transition: "border-color 0.15s ease",
              }}
            >
              {/* Branch icon / indicator */}
              {isCurrent ? (
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(139, 92, 246, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8B5CF6", boxShadow: "0 0 8px rgba(139,92,246,0.5)" }} />
                </div>
              ) : (
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={branch.is_remote ? "#5A647A" : "var(--color-gp-text-tertiary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {branch.is_remote ? (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </>
                    ) : (
                      <>
                        <line x1="6" y1="3" x2="6" y2="15" />
                        <circle cx="18" cy="6" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <path d="M18 9a9 9 0 0 1-9 9" />
                      </>
                    )}
                  </svg>
                </div>
              )}

              {/* Branch info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontFamily: "monospace",
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? "#8B5CF6" : "var(--color-gp-text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {branch.name}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#8B5CF6",
                        background: "rgba(139, 92, 246, 0.1)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      current
                    </span>
                  )}
                </div>
                {branch.last_commit_message && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-gp-text-tertiary)",
                      marginTop: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {branch.last_commit_message}
                  </p>
                )}
              </div>

              {/* Date */}
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)", flexShrink: 0 }}>
                {timeAgo(branch.last_commit_date)}
              </span>

              {/* Actions */}
              {!isCurrent && !branch.is_remote && (
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => switchBranch(selectedRepo.path, branch.name)} style={actionBtnStyle("#3B82F6")}>
                    Switch
                  </button>
                  <button
                    onClick={async () => {
                      const current = branches.find((b) => b.is_current);
                      if (current && selectedRepo) {
                        await previewMerge(selectedRepo.path, branch.name, current.name);
                        setMergeWizardOpen(true);
                      }
                    }}
                    style={actionBtnStyle("#F59E0B")}
                  >
                    Merge
                  </button>
                  <button onClick={() => deleteBranch(selectedRepo.path, branch.name)} style={actionBtnStyle("#EF4444")}>
                    Delete
                  </button>
                </div>
              )}
              {!isCurrent && branch.is_remote && (
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => checkoutRemoteBranch(selectedRepo.path, branch.name)} style={actionBtnStyle("#8B5CF6")}>
                    Checkout
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
