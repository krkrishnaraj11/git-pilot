import { useAppStore } from "@/stores/app-store";
import { StatusDot } from "./ui";

export function StatusBar() {
  const allRepos = useAppStore((s) => s.allRepos);
  const scopedIdentities = useAppStore.getState().scopedIdentities();

  const visibleRepos = scopedIdentities.reduce((n, i) => n + i.repos.length, 0);

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-panel px-4 font-mono text-[11px]">
      <span className="text-muted">
        {visibleRepos} of {allRepos.length} repos
      </span>

      <div className="flex items-center gap-4">
        <span className="hidden text-muted lg:block">↑↓ navigate · ⏎ open · C commit · P push</span>
        <span className="flex items-center gap-1.5 text-muted">
          <StatusDot tone="ok" />
          Backups on
        </span>
      </div>
    </footer>
  );
}
