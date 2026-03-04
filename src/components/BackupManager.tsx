import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "@/stores/app-store";
import { timeAgo } from "@/lib/utils";

export function BackupManager() {
  const open = useAppStore((s) => s.backupManagerOpen);
  const setOpen = useAppStore((s) => s.setBackupManagerOpen);
  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const backups = useAppStore((s) => s.backups);
  const listBackups = useAppStore((s) => s.listBackups);
  const restoreBackup = useAppStore((s) => s.restoreBackup);
  const cleanupBackups = useAppStore((s) => s.cleanupBackups);

  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [showCleanup, setShowCleanup] = useState(false);

  useEffect(() => {
    if (open && selectedRepo) {
      listBackups(selectedRepo.path);
      setConfirmRestore(null);
      setShowCleanup(false);
    }
  }, [open]);

  if (!selectedRepo) return null;

  const handleRestore = async (backupBranch: string) => {
    await restoreBackup(selectedRepo.path, backupBranch);
    setConfirmRestore(null);
  };

  const handleCleanup = async () => {
    await cleanupBackups(selectedRepo.path, cleanupDays);
    setShowCleanup(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-[6px] z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] max-h-[85vh] overflow-y-auto bg-gp-bg border border-gp-border rounded-3xl shadow-2xl shadow-black/40 z-[60]">
          {/* Header */}
          <div className="px-10 pt-9 pb-7 border-b border-gp-border bg-gp-surface-1 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-[22px] font-extrabold text-gp-text tracking-tight">
                  Backup Manager
                </Dialog.Title>
                <Dialog.Description className="text-[14px] text-gp-text-tertiary mt-2">
                  {selectedRepo.name} — Safety backups for merge & rebase
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
            {/* Actions bar */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[14px] text-gp-text-secondary font-medium">{backups.length} backup(s)</span>
              <button
                onClick={() => setShowCleanup(!showCleanup)}
                className="px-5 py-2.5 text-[13px] font-bold text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors"
              >
                Cleanup
              </button>
            </div>

            {/* Cleanup form */}
            {showCleanup && (
              <div className="flex items-center gap-3 mb-6 px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl">
                <span className="text-[13px] text-gp-text-secondary">Delete backups older than</span>
                <input
                  type="number"
                  value={cleanupDays}
                  onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                  min={1}
                  className="w-20 px-3 py-2 text-[14px] font-mono bg-gp-surface-2 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/50"
                />
                <span className="text-[13px] text-gp-text-secondary">days</span>
                <button
                  onClick={handleCleanup}
                  className="px-4 py-2 text-[13px] font-bold text-gp-danger bg-gp-danger/10 border border-gp-danger/20 rounded-xl hover:bg-gp-danger/15 transition-colors ml-auto"
                >
                  Clean
                </button>
              </div>
            )}

            {/* Backup list */}
            {backups.length === 0 ? (
              <p className="text-[14px] text-gp-text-tertiary text-center py-12">No backups yet</p>
            ) : (
              <div className="space-y-2.5">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 px-5 py-4 bg-gp-surface-1 border border-gp-border rounded-2xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gp-info bg-gp-info/10 px-2.5 py-1 rounded-lg border border-gp-info/20">
                          {b.operation}
                        </span>
                        <span className="text-[12px] font-mono text-gp-text-tertiary">
                          {b.commit_hash.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-[13px] font-mono text-gp-text-secondary truncate mt-1.5">
                        {b.backup_branch}
                      </p>
                    </div>
                    <span className="text-[12px] font-mono text-gp-text-tertiary shrink-0">
                      {timeAgo(b.created_at)}
                    </span>
                    {confirmRestore === b.id ? (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleRestore(b.backup_branch)}
                          className="px-4 py-2 text-[12px] font-bold text-gp-danger bg-gp-danger/10 border border-gp-danger/20 rounded-xl hover:bg-gp-danger/15 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRestore(null)}
                          className="px-4 py-2 text-[12px] font-bold text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRestore(b.id)}
                        className="px-4 py-2 text-[12px] font-bold text-gp-warning bg-gp-warning/10 border border-gp-warning/20 rounded-xl hover:bg-gp-warning/15 transition-colors shrink-0"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
