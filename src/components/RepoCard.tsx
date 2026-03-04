import { useState } from "react";
import { useAppStore, type RepoInfo } from "@/stores/app-store";
import type { MatchResult } from "@/stores/types";
import { cn, timeAgo } from "@/lib/utils";
import { IdentityMismatchWarning } from "./IdentityMismatchWarning";

interface RepoCardProps {
  repo: RepoInfo;
  identityColor: string;
  index: number;
  mismatch?: MatchResult;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  local_changes: { label: "Local Changes", color: "#F59E0B" },
  committed: { label: "Committed", color: "#8B5CF6" },
  pushed: { label: "Pushed", color: "#10B981" },
  clean: { label: "Clean", color: "#5A647A" },
};

function ActionIcon({ type }: { type: string }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (type) {
    case "Diff":
      return (
        <svg {...props}>
          <path d="M12 3v18" />
          <path d="M5 12h14" />
          <path d="M5 6h14" />
          <path d="M5 18h14" />
        </svg>
      );
    case "Branches":
      return (
        <svg {...props}>
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      );
    case "Push":
      return (
        <svg {...props}>
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      );
    case "History":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    default:
      return null;
  }
}

export function RepoCard({ repo, identityColor, index, mismatch }: RepoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const openRepoDetail = useAppStore((s) => s.openRepoDetail);
  const doPush = useAppStore((s) => s.doPush);
  const statusCfg = STATUS_CONFIG[repo.status] || STATUS_CONFIG.clean;

  const handleCardClick = () => {
    openRepoDetail(repo, identityColor);
  };

  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    switch (action) {
      case "Diff": openRepoDetail(repo, identityColor, "changes"); break;
      case "Push": doPush(repo.path); break;
      case "History": openRepoDetail(repo, identityColor, "history"); break;
      case "Branches": openRepoDetail(repo, identityColor, "branches"); break;
    }
  };

  return (
    <div
      className="animate-fade-in-up relative cursor-pointer"
      style={{
        animationDelay: `${index * 40}ms`,
        padding: "24px 28px",
        minHeight: "170px",
        borderRadius: "16px",
        border: isHovered
          ? "1px solid rgba(139, 92, 246, 0.3)"
          : "1px solid rgba(255,255,255,0.06)",
        background: "var(--color-gp-card)",
        transition: "all 0.2s ease",
        transform: isHovered ? "translateY(-2px)" : "none",
        boxShadow: isHovered
          ? `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${identityColor}20`
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Top color accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "24px",
          right: "24px",
          height: "2px",
          borderRadius: "0 0 4px 4px",
          background: identityColor,
          opacity: 0.4,
        }}
      />

      {mismatch && <IdentityMismatchWarning mismatch={mismatch} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-gp-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {repo.name}
          </h3>
          <span
            style={{
              fontSize: "13px",
              fontFamily: "monospace",
              color: "var(--color-gp-text-tertiary)",
              marginTop: "4px",
              display: "block",
            }}
          >
            {repo.branch}
          </span>
        </div>
        <span
          style={{
            flexShrink: 0,
            padding: "5px 10px",
            fontSize: "10px",
            fontWeight: 700,
            borderRadius: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: statusCfg.color,
            background: statusCfg.color + "15",
            border: `1px solid ${statusCfg.color}25`,
          }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
        {repo.uncommitted_count > 0 && (
          <span className="flex items-center font-mono font-medium" style={{ gap: "6px", fontSize: "13px", color: "var(--color-gp-warning)" }}>
            <span style={{ opacity: 0.5 }}>{"\u21BB"}</span>
            {repo.uncommitted_count}
          </span>
        )}
        {repo.staged_count > 0 && (
          <span className="flex items-center font-mono font-medium" style={{ gap: "6px", fontSize: "13px", color: "var(--color-gp-info)" }}>
            <span style={{ opacity: 0.5 }}>{"\u25C8"}</span>
            {repo.staged_count}
          </span>
        )}
        {repo.ahead > 0 && (
          <span className="flex items-center font-mono font-medium" style={{ gap: "6px", fontSize: "13px", color: "var(--color-gp-success)" }}>
            <span style={{ opacity: 0.5 }}>{"\u2191"}</span>
            {repo.ahead}
          </span>
        )}
        {repo.behind > 0 && (
          <span className="flex items-center font-mono font-medium" style={{ gap: "6px", fontSize: "13px", color: "var(--color-gp-danger)" }}>
            <span style={{ opacity: 0.5 }}>{"\u2193"}</span>
            {repo.behind}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            fontSize: "12px",
            fontFamily: "monospace",
            padding: "4px 10px",
            borderRadius: "8px",
            background: "var(--color-gp-surface-2)",
            color: "var(--color-gp-text-secondary)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {repo.language}
        </span>
        <span style={{ fontSize: "12px", color: "var(--color-gp-text-tertiary)" }}>
          {timeAgo(repo.last_commit)}
        </span>
      </div>

      {/* Full-card hover overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          background: isHovered ? "rgba(15, 18, 30, 0.92)" : "rgba(15, 18, 30, 0)",
          backdropFilter: isHovered ? "blur(4px)" : "none",
          opacity: isHovered ? 1 : 0,
          transition: "all 0.2s ease",
          pointerEvents: isHovered ? "auto" : "none",
        }}
      >
        {["Diff", "Branches", "Push", "History"].map((action) => (
          <button
            key={action}
            onClick={(e) => handleAction(e, action)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "82px",
              height: "76px",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
              e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.4)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <ActionIcon type={action} />
            <span>{action}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
