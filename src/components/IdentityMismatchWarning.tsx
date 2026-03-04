import { useAppStore } from "@/stores/app-store";
import type { MatchResult } from "@/stores/types";

interface IdentityMismatchWarningProps {
  mismatch: MatchResult;
}

export function IdentityMismatchWarning({
  mismatch,
}: IdentityMismatchWarningProps) {
  const applyIdentity = useAppStore((s) => s.applyIdentityToRepo);
  const dbIdentities = useAppStore((s) => s.dbIdentities);

  const expectedIdentity = dbIdentities.find(
    (i) => i.id === mismatch.matched_identity_id
  );

  const handleFix = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mismatch.matched_identity_id) {
      applyIdentity(mismatch.matched_identity_id, mismatch.repo_path);
    }
  };

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 bg-gp-warning/8 border border-gp-warning/20 rounded-lg">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="flex-1 text-[10px] text-gp-warning truncate">
        Expected: {expectedIdentity?.label || "Unknown"}
      </span>
      <button
        onClick={handleFix}
        className="shrink-0 px-2 py-0.5 text-[9px] font-medium text-gp-warning bg-gp-warning/10 border border-gp-warning/20 rounded hover:bg-gp-warning/15 transition-colors"
      >
        Fix
      </button>
    </div>
  );
}

export function MismatchBanner() {
  const mismatches = useAppStore((s) => s.mismatches);
  const applyIdentity = useAppStore((s) => s.applyIdentityToRepo);

  if (mismatches.length === 0) return null;

  const handleFixAll = async () => {
    for (const m of mismatches) {
      if (m.matched_identity_id) {
        await applyIdentity(m.matched_identity_id, m.repo_path);
      }
    }
  };

  return (
    <div className="flex items-center justify-between mx-6 my-2 px-4 py-2.5 bg-gp-warning/8 border border-gp-warning/20 rounded-xl">
      <div className="flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-xs font-medium text-gp-warning">
          {mismatches.length} identity mismatch
          {mismatches.length !== 1 ? "es" : ""} detected
        </span>
      </div>
      <button
        onClick={handleFixAll}
        className="px-3 py-1 text-[11px] font-medium text-gp-warning bg-gp-warning/10 border border-gp-warning/20 rounded-lg hover:bg-gp-warning/15 transition-colors"
      >
        Fix All
      </button>
    </div>
  );
}
