import { useAppStore } from "@/stores/app-store";

export function StatusBar() {
  const scanPath = useAppStore((s) => s.scanPath);
  const stats = useAppStore((s) => s.stats)();
  const mismatches = useAppStore((s) => s.mismatches);
  const setAuditLogOpen = useAppStore((s) => s.setAuditLogOpen);

  return (
    <footer className="fixed bottom-0 inset-x-0 flex items-center justify-between px-10 py-3.5 bg-gp-surface-1 border-t border-gp-border text-[13px] font-mono z-50">
      <div className="flex items-center gap-4">
        {scanPath ? (
          <span className="text-gp-text-tertiary truncate max-w-[400px]">
            {scanPath}
          </span>
        ) : (
          <span className="text-gp-text-tertiary">No folder scanned</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {mismatches.length > 0 && (
          <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-gp-warning/10 text-gp-warning border border-gp-warning/20">
            {mismatches.length} Mismatch{mismatches.length !== 1 ? "es" : ""}
          </span>
        )}
        <span className="text-gp-text-tertiary">
          {stats.total} repo{stats.total !== 1 ? "s" : ""} indexed
        </span>
        <button
          onClick={() => setAuditLogOpen(true)}
          className="px-4 py-1.5 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-gp-surface-2 text-gp-text-secondary border border-gp-border hover:bg-gp-surface-3 hover:text-gp-text transition-colors"
        >
          Activity
        </button>
        <span className="px-4 py-1.5 rounded-xl text-[11px] font-bold tracking-wider uppercase bg-gp-success/10 text-gp-success border border-gp-success/20">
          Bank-Safe
        </span>
      </div>
    </footer>
  );
}
