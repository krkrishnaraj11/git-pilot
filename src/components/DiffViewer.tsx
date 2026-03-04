import { useState } from "react";
import type { FileDiff, DiffHunk } from "@/stores/types";

interface DiffViewerProps {
  files: FileDiff[];
  type: "staged" | "unstaged";
  repoPath: string;
  onStage?: (paths: string[]) => void;
  onUnstage?: (paths: string[]) => void;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  added: { color: "#10B981", label: "A" },
  modified: { color: "#F59E0B", label: "M" },
  deleted: { color: "#EF4444", label: "D" },
  renamed: { color: "#0EA5E9", label: "R" },
  copied: { color: "#8B5CF6", label: "C" },
};

export function DiffViewer({ files, type, onStage, onUnstage }: DiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  if (files.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", fontSize: "13px", color: "var(--color-gp-text-tertiary)", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
        No {type} changes
      </div>
    );
  }

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {files.map((file, i) => {
        const isExpanded = expandedFiles.has(file.path);
        const meta = STATUS_META[file.status] || { color: "#5A647A", label: "?" };

        return (
          <div
            key={file.path}
            className="animate-fade-in-up"
            style={{
              background: "var(--color-gp-card)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "12px",
              overflow: "hidden",
              animationDelay: `${i * 15}ms`,
              transition: "border-color 0.15s ease",
            }}
          >
            {/* File header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 20px",
                cursor: "pointer",
                transition: "background 0.1s ease",
              }}
              onClick={() => toggleFile(file.path)}
            >
              {/* Expand arrow */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gp-text-tertiary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  flexShrink: 0,
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              >
                <path d="m9 18 6-6-6-6" />
              </svg>

              {/* Status badge */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  color: meta.color,
                  background: meta.color + "12",
                  border: `1px solid ${meta.color}20`,
                  flexShrink: 0,
                }}
              >
                {meta.label}
              </span>

              {/* File path */}
              <span
                style={{
                  flex: 1,
                  fontSize: "13px",
                  fontFamily: "monospace",
                  color: "var(--color-gp-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.path}
              </span>

              {/* Additions / Deletions */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {file.additions > 0 && (
                  <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 600, color: "#10B981" }}>
                    +{file.additions}
                  </span>
                )}
                {file.deletions > 0 && (
                  <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 600, color: "#EF4444" }}>
                    -{file.deletions}
                  </span>
                )}
              </div>

              {/* Stage / Unstage button */}
              {type === "unstaged" && onStage && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStage([file.path]); }}
                  style={{
                    padding: "6px 14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#10B981",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  Stage
                </button>
              )}
              {type === "staged" && onUnstage && (
                <button
                  onClick={(e) => { e.stopPropagation(); onUnstage([file.path]); }}
                  style={{
                    padding: "6px 14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#F59E0B",
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                >
                  Unstage
                </button>
              )}
            </div>

            {/* Diff hunks */}
            {isExpanded && file.hunks.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#080c14", overflowX: "auto" }}>
                {file.hunks.map((hunk, hi) => (
                  <HunkView key={hi} hunk={hunk} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HunkView({ hunk }: { hunk: DiffHunk }) {
  return (
    <div>
      <div
        style={{
          padding: "8px 20px",
          fontSize: "11px",
          fontFamily: "monospace",
          color: "rgba(59, 130, 246, 0.5)",
          background: "rgba(59, 130, 246, 0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        {hunk.header}
      </div>
      <div style={{ fontSize: "12px", fontFamily: "monospace", lineHeight: 1.8 }}>
        {hunk.lines.map((line, li) => {
          let bg = "transparent";
          let color = "var(--color-gp-text-tertiary)";
          let prefix = " ";

          if (line.line_type === "add") {
            bg = "rgba(16, 185, 129, 0.06)";
            color = "rgba(16, 185, 129, 0.85)";
            prefix = "+";
          } else if (line.line_type === "delete") {
            bg = "rgba(239, 68, 68, 0.06)";
            color = "rgba(239, 68, 68, 0.85)";
            prefix = "-";
          }

          return (
            <div
              key={li}
              style={{
                padding: "0 20px",
                whiteSpace: "pre",
                background: bg,
                color,
              }}
            >
              <span style={{ display: "inline-block", width: "16px", textAlign: "center", opacity: 0.4, userSelect: "none", marginRight: "12px" }}>
                {prefix}
              </span>
              {line.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
