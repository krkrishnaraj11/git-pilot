import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "@/stores/app-store";
import { timeAgo } from "@/lib/utils";

const ACTION_BADGES: Record<string, { label: string; color: string }> = {
  identity_applied: { label: "Applied", color: "#10B981" },
  mismatch_detected: { label: "Mismatch", color: "#F59E0B" },
  identity_created: { label: "Created", color: "#0EA5E9" },
  identity_deleted: { label: "Deleted", color: "#EF4444" },
  rule_created: { label: "Rule Added", color: "#8B5CF6" },
  rule_deleted: { label: "Rule Removed", color: "#EC4899" },
};

export function AuditLog() {
  const open = useAppStore((s) => s.auditLogOpen);
  const setOpen = useAppStore((s) => s.setAuditLogOpen);
  const auditLog = useAppStore((s) => s.auditLog);
  const loadAuditLog = useAppStore((s) => s.loadAuditLog);

  const [filterAction, setFilterAction] = useState<string>("all");

  useEffect(() => {
    if (open) {
      loadAuditLog();
    }
  }, [open]);

  const actionTypes = [
    "all",
    ...new Set(auditLog.map((e) => e.action)),
  ];

  const filtered =
    filterAction === "all"
      ? auditLog
      : auditLog.filter((e) => e.action === filterAction);

  const exportCsv = () => {
    const header = "Timestamp,Action,Identity,Repo Path,Details\n";
    const rows = filtered
      .map(
        (e) =>
          `"${e.timestamp}","${e.action}","${e.identity_label || ""}","${e.repo_path || ""}","${(e.details || "").replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitpilot-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-[6px] z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[660px] max-h-[85vh] flex flex-col bg-gp-bg border border-gp-border rounded-3xl shadow-2xl shadow-black/40 z-50">
          {/* Header */}
          <div className="px-10 pt-9 pb-7 border-b border-gp-border bg-gp-surface-1 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-[22px] font-extrabold text-gp-text tracking-tight">
                  Audit Log
                </Dialog.Title>
                <Dialog.Description className="text-[14px] text-gp-text-tertiary mt-2">
                  History of identity operations and mismatch detections
                </Dialog.Description>
              </div>
              <Dialog.Close className="p-3 rounded-xl hover:bg-gp-surface-2 text-gp-text-tertiary hover:text-gp-text transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>

            <div className="flex items-center justify-between mt-5">
              <div className="flex items-center gap-4">
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-4 py-2.5 text-[13px] bg-gp-surface-2 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/50"
                >
                  {actionTypes.map((a) => (
                    <option key={a} value={a}>
                      {a === "all" ? "All Actions" : a.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <span className="text-[13px] text-gp-text-tertiary font-medium">
                  {filtered.length} entries
                </span>
              </div>
              <button
                onClick={exportCsv}
                disabled={filtered.length === 0}
                className="px-5 py-2.5 text-[13px] font-bold text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-10 py-7">
            {filtered.length === 0 ? (
              <p className="text-[14px] text-gp-text-tertiary text-center py-12">
                No audit entries yet
              </p>
            ) : (
              <div className="space-y-2.5">
                {filtered.map((entry) => {
                  const badge = ACTION_BADGES[entry.action] || {
                    label: entry.action,
                    color: "#64748B",
                  };
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl"
                    >
                      <div className="shrink-0 mt-0.5">
                        <span
                          className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg"
                          style={{
                            color: badge.color,
                            background: badge.color + "15",
                            border: `1px solid ${badge.color}25`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          {entry.identity_label && (
                            <span className="text-[14px] font-semibold text-gp-text">
                              {entry.identity_label}
                            </span>
                          )}
                          {entry.repo_path && (
                            <span className="text-[12px] font-mono text-gp-text-tertiary truncate">
                              {entry.repo_path.split("/").pop()}
                            </span>
                          )}
                        </div>
                        {entry.details && (
                          <p className="text-[12px] text-gp-text-tertiary mt-1 truncate">
                            {entry.details}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[12px] font-mono text-gp-text-tertiary">
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
