import { Archive, ListBullets, Sliders, UsersThree, WarningCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useAppStore } from "@/stores/app-store";

function SectionCaption({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </div>
  );
}

function NavItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "bg-surface-3 text-text" : "text-muted-2 hover:bg-surface-2 hover:text-text"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== undefined && (
        <span className={`font-mono text-[11px] ${active ? "text-accent-text" : "text-muted"}`}>{count}</span>
      )}
    </button>
  );
}

export function Sidebar() {
  const identities = useAppStore((s) => s.identities);
  const dbIdentities = useAppStore((s) => s.dbIdentities);
  const allRepos = useAppStore((s) => s.allRepos);
  const mismatches = useAppStore((s) => s.mismatches);
  const scanPath = useAppStore((s) => s.scanPath);
  const identityScope = useAppStore((s) => s.identityScope);
  const setIdentityScope = useAppStore((s) => s.setIdentityScope);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setIdentityManagerOpen = useAppStore((s) => s.setIdentityManagerOpen);

  const dbFor = (name: string, email: string) =>
    dbIdentities.find((d) => d.git_name === name && d.git_email === email);

  return (
    <aside className="flex w-[232px] shrink-0 flex-col overflow-y-auto border-r border-border bg-panel">
      {/* Identity scope */}
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Identities</span>
        <button
          onClick={() => setIdentityManagerOpen(true)}
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-text"
        >
          Manage
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        <NavItem
          icon={<UsersThree size={15} weight={identityScope.kind === "all" ? "fill" : "regular"} />}
          label="All identities"
          count={allRepos.length}
          active={identityScope.kind === "all"}
          onClick={() => setIdentityScope({ kind: "all" })}
        />
        {identities.map((identity) => {
          const db = dbFor(identity.git_name, identity.git_email);
          const active = identityScope.kind === "identity" && identityScope.id === identity.id;
          return (
            <NavItem
              key={identity.id}
              icon={<span className="h-2 w-2 rounded-full" style={{ background: db?.color ?? identity.color }} />}
              label={db?.label ?? identity.git_name}
              count={identity.repos.length}
              active={active}
              onClick={() => setIdentityScope({ kind: "identity", id: identity.id })}
            />
          );
        })}
      </nav>

      {/* Mismatch notice */}
      {mismatches.length > 0 && (
        <div className="px-2 pb-1">
          <button
            onClick={() => setView("library-identities")}
            className="flex w-full items-start gap-2.5 rounded-lg border border-changed/30 bg-tint-warn p-3 text-left transition-colors hover:border-changed/50"
          >
            <WarningCircle size={15} weight="fill" className="mt-0.5 shrink-0 text-changed" />
            <span>
              <span className="block text-[12px] font-medium leading-snug text-text">
                {mismatches.length} repo{mismatches.length > 1 ? "s" : ""} with a mismatched identity
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">Review in Identity rules →</span>
            </span>
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Library */}
      <SectionCaption>Library</SectionCaption>
      <nav className="flex flex-col gap-0.5 p-2">
        <NavItem
          icon={<Archive size={15} weight={view === "library-backups" ? "fill" : "regular"} />}
          label="Backups"
          active={view === "library-backups"}
          onClick={() => setView("library-backups")}
        />
        <NavItem
          icon={<ListBullets size={15} weight={view === "library-audit" ? "fill" : "regular"} />}
          label="Audit log"
          active={view === "library-audit"}
          onClick={() => setView("library-audit")}
        />
        <NavItem
          icon={<Sliders size={15} weight={view === "library-identities" ? "fill" : "regular"} />}
          label="Identity rules"
          active={view === "library-identities"}
          onClick={() => setView("library-identities")}
        />
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        {scanPath && (
          <p className="truncate font-mono text-[11px] text-muted" title={scanPath}>
            {scanPath}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted">
          {allRepos.length} repos · {identities.length} identities
        </p>
      </div>
    </aside>
  );
}
