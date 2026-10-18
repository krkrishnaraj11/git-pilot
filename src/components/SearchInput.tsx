import { MagnifyingGlass } from "@phosphor-icons/react";
import { useAppStore } from "@/stores/app-store";
import { useEffect, useRef, useState } from "react";
import { Kbd } from "./ui";

export function SearchModal() {
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearch = useAppStore((s) => s.setSearch);
  const allRepos = useAppStore((s) => s.allRepos);
  const openRepoDetail = useAppStore((s) => s.openRepoDetail);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const open = () => {
    setIsOpen(true);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  // Filter repos based on search query
  const filteredRepos = searchQuery.trim()
    ? allRepos.filter((r) => {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q) ||
          r.language.toLowerCase().includes(q) ||
          r.path.toLowerCase().includes(q)
        );
      })
    : [];

  // Keyboard shortcuts: Cmd+F, Ctrl+F, Cmd+K, /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        ((e.metaKey || e.ctrlKey) && e.key === "f") ||
        ((e.metaKey || e.ctrlKey) && e.key === "k") ||
        (e.key === "/" && !isOpen && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        if (isOpen) {
          inputRef.current?.focus();
        } else {
          open();
        }
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Arrow key navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredRepos.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredRepos[selectedIndex]) {
        e.preventDefault();
        openRepoDetail(filteredRepos[selectedIndex], "#8B5CF6");
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, filteredRepos, selectedIndex]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const STATUS_COLORS: Record<string, string> = {
    local_changes: "#F59E0B",
    committed: "#8B5CF6",
    pushed: "#10B981",
    clean: "#5A647A",
  };

  return (
    <>
      {/* Search trigger — field-style, placed in the title bar */}
      <button
        onClick={open}
        className="flex h-8 w-64 items-center gap-2 rounded-md border border-border-2 bg-surface px-3 text-[13px] text-muted transition-colors hover:border-accent/50"
      >
        <MagnifyingGlass size={13} className="shrink-0" />
        <span className="flex-1 truncate text-left">Search or run a command…</span>
        <Kbd>⌘K</Kbd>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "120px",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "580px",
              maxHeight: "480px",
              background: "rgba(20, 24, 40, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              animation: "spotlightIn 0.2s ease",
            }}
          >
            {/* Search input */}
            <div style={{ position: "relative", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <svg
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8B5CF6",
                  pointerEvents: "none",
                }}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search repositories..."
                style={{
                  width: "100%",
                  padding: "18px 60px 18px 52px",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--color-gp-text)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                }}
              />
              <kbd
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "3px 8px",
                  fontSize: "10px",
                  fontFamily: "monospace",
                  fontWeight: 600,
                  color: "var(--color-gp-text-tertiary)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: searchQuery.trim() ? "8px" : "0",
              }}
            >
              {searchQuery.trim() && filteredRepos.length === 0 && (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    color: "var(--color-gp-text-tertiary)",
                    fontSize: "14px",
                  }}
                >
                  No repositories found
                </div>
              )}
              {filteredRepos.map((repo, i) => {
                const isSelected = i === selectedIndex;
                const statusColor = STATUS_COLORS[repo.status] || "#5A647A";
                return (
                  <div
                    key={repo.path}
                    onClick={() => {
                      openRepoDetail(repo, "#8B5CF6");
                      close();
                    }}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: isSelected ? "rgba(139, 92, 246, 0.12)" : "transparent",
                      transition: "background 0.1s ease",
                    }}
                  >
                    {/* Repo icon */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="18" r="3" />
                        <circle cx="6" cy="6" r="3" />
                        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                        <line x1="6" y1="9" x2="6" y2="21" />
                      </svg>
                    </div>

                    {/* Repo info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--color-gp-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {repo.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--color-gp-text-tertiary)",
                          fontFamily: "monospace",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {repo.branch} · {repo.language}
                      </div>
                    </div>

                    {/* Status dot */}
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: statusColor,
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${statusColor}50`,
                      }}
                    />
                  </div>
                );
              })}

              {/* Hint when empty */}
              {!searchQuery.trim() && (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    color: "var(--color-gp-text-tertiary)",
                    fontSize: "13px",
                  }}
                >
                  Type to search across all repositories...
                </div>
              )}
            </div>

            {/* Footer */}
            {searchQuery.trim() && filteredRepos.length > 0 && (
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  fontSize: "11px",
                  color: "var(--color-gp-text-tertiary)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", fontSize: "10px", fontFamily: "monospace" }}>↑↓</kbd>
                  Navigate
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <kbd style={{ padding: "1px 5px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", fontSize: "10px", fontFamily: "monospace" }}>↵</kbd>
                  Open
                </span>
                <span style={{ marginLeft: "auto" }}>
                  {filteredRepos.length} result{filteredRepos.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
