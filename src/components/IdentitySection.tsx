import { useState } from "react";
import { useAppStore, type Identity } from "@/stores/app-store";
import { RepoCard } from "./RepoCard";
import { cn } from "@/lib/utils";

interface IdentitySectionProps {
  identity: Identity;
}

export function IdentitySection({ identity }: IdentitySectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const dbIdentities = useAppStore((s) => s.dbIdentities);
  const setEditingIdentity = useAppStore((s) => s.setEditingIdentity);
  const setIdentityManagerOpen = useAppStore((s) => s.setIdentityManagerOpen);
  const mismatches = useAppStore((s) => s.mismatches);

  const mismatchCount = identity.repos.filter((r) =>
    mismatches.some((m) => m.repo_path === r.path && m.is_mismatch)
  ).length;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const linked = dbIdentities.find(
      (d) =>
        d.git_name === identity.git_name && d.git_email === identity.git_email
    );
    setEditingIdentity(linked || null);
    setIdentityManagerOpen(true);
  };

  return (
    <div className="mb-10">
      {/* Identity header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-5 px-10 py-5 transition-colors hover:bg-gp-surface-1/50 group"
      >
        {/* Color accent bar */}
        <div
          className="w-1.5 h-12 rounded-full shrink-0"
          style={{ background: identity.color }}
        />

        <div className="flex-1 min-w-0 text-left">
          <span className="text-[18px] font-bold text-gp-text truncate block">
            {identity.git_name || "Unknown"}
          </span>
          <span className="text-[14px] text-gp-text-tertiary truncate block mt-1">
            {identity.git_email || "no email"}
          </span>
        </div>

        {mismatchCount > 0 && (
          <span className="text-[12px] font-bold px-4 py-2 rounded-xl text-gp-warning bg-gp-warning/10 border border-gp-warning/20">
            {mismatchCount} mismatch{mismatchCount !== 1 ? "es" : ""}
          </span>
        )}

        <span
          className="text-[14px] font-bold px-5 py-2.5 rounded-xl border"
          style={{
            color: identity.color,
            background: identity.color + "12",
            borderColor: identity.color + "25",
          }}
        >
          {identity.repos.length} repo{identity.repos.length !== 1 ? "s" : ""}
        </span>

        <span
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl hover:bg-gp-surface-3 transition-all text-gp-text-tertiary hover:text-gp-text"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </span>

        <svg
          className={cn(
            "w-5 h-5 text-gp-text-tertiary transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Repo grid */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 px-10 pt-5">
          {identity.repos.map((repo, i) => (
            <RepoCard
              key={repo.path}
              repo={repo}
              identityColor={identity.color}
              index={i}
              mismatch={mismatches.find(
                (m) => m.repo_path === repo.path && m.is_mismatch
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
