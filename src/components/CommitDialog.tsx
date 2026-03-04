import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAppStore } from "@/stores/app-store";
import { useAiStore } from "@/stores/ai-store";
import type { CommitStyle } from "@/stores/types";

const STYLES: { key: CommitStyle; label: string }[] = [
  { key: "conventional", label: "Conventional" },
  { key: "gitmoji", label: "Gitmoji" },
  { key: "simple", label: "Simple" },
];

export function CommitDialog() {
  const open = useAppStore((s) => s.commitDialogOpen);
  const setOpen = useAppStore((s) => s.setCommitDialogOpen);
  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const repoDiff = useAppStore((s) => s.repoDiff);
  const doCommit = useAppStore((s) => s.doCommit);
  const mismatches = useAppStore((s) => s.mismatches);

  const aiStatus = useAiStore((s) => s.aiStatus);
  const isGenerating = useAiStore((s) => s.isGenerating);
  const aiMessage = useAiStore((s) => s.currentMessage);
  const commitStyle = useAiStore((s) => s.commitStyle);
  const setCommitStyle = useAiStore((s) => s.setCommitStyle);
  const generateStreaming = useAiStore((s) => s.generateStreaming);
  const clearAiMessage = useAiStore((s) => s.clearMessage);
  const streamError = useAiStore((s) => s.streamError);

  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isGenerating && aiMessage && open) {
      setMessage(aiMessage);
    }
  }, [isGenerating, aiMessage, open]);

  useEffect(() => {
    if (isGenerating && textareaRef.current) {
      setMessage(aiMessage);
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [aiMessage, isGenerating]);

  if (!selectedRepo) return null;

  const stagedFiles = repoDiff?.staged || [];
  const hasMismatch = mismatches.some(
    (m) => m.repo_path === selectedRepo.path && m.is_mismatch
  );

  const subjectLine = message.split("\n")[0] || "";
  const subjectLen = subjectLine.length;

  const handleCommit = async () => {
    if (!message.trim() || stagedFiles.length === 0) return;
    setIsCommitting(true);
    const result = await doCommit(selectedRepo.path, message);
    setIsCommitting(false);
    if (result?.success) {
      setMessage("");
      clearAiMessage();
      setOpen(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiStatus.running || stagedFiles.length === 0) return;
    clearAiMessage();
    setMessage("");
    await generateStreaming(selectedRepo.path);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 60,
            animation: "fadeIn 0.15s ease",
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "680px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "var(--color-gp-bg)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            zIndex: 60,
            animation: "spotlightIn 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "28px 32px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "var(--color-gp-surface-1)",
              borderRadius: "20px 20px 0 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <Dialog.Title
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "var(--color-gp-text)",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  Commit Changes
                </Dialog.Title>
                <Dialog.Description
                  style={{
                    fontSize: "13px",
                    color: "var(--color-gp-text-tertiary)",
                    marginTop: "6px",
                    fontWeight: 500,
                  }}
                >
                  {selectedRepo.name}
                  <span style={{ margin: "0 8px", color: "rgba(255,255,255,0.12)" }}>/</span>
                  <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{selectedRepo.branch}</span>
                </Dialog.Description>
              </div>
              <Dialog.Close
                style={{
                  padding: "8px",
                  borderRadius: "10px",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-gp-text-tertiary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 32px 28px" }}>
            {/* Author info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 18px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "14px",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(139, 92, 246, 0.1)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: "10px", color: "var(--color-gp-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, display: "block" }}>
                  Author
                </span>
                <span style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--color-gp-text-secondary)", marginTop: "2px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedRepo.git_name} &lt;{selectedRepo.git_email}&gt;
                </span>
              </div>
            </div>

            {/* Mismatch warning */}
            {hasMismatch && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 18px",
                  background: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                  borderRadius: "14px",
                  marginBottom: "22px",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span style={{ fontSize: "13px", color: "#F59E0B", fontWeight: 600 }}>
                  Identity mismatch — commit will use current repo config
                </span>
              </div>
            )}

            {/* Staged files */}
            <div style={{ marginBottom: "22px" }}>
              <h3 style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" }}>
                Staged Files ({stagedFiles.length})
              </h3>
              <div style={{ maxHeight: "140px", overflowY: "auto" }}>
                {stagedFiles.map((f) => (
                  <div
                    key={f.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      color: "var(--color-gp-text-secondary)",
                      padding: "8px 14px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: "10px",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "6px" }}>
                      +{f.additions}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,0.1)", padding: "2px 8px", borderRadius: "6px" }}>
                      -{f.deletions}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.path}
                    </span>
                  </div>
                ))}
                {stagedFiles.length === 0 && (
                  <p style={{ fontSize: "13px", color: "var(--color-gp-text-tertiary)", padding: "16px", textAlign: "center" }}>
                    No staged files — stage changes first
                  </p>
                )}
              </div>
            </div>

            {/* Commit message */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-gp-text-secondary)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                  Commit Message
                </label>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "8px",
                    color: subjectLen > 72 ? "#F59E0B" : "var(--color-gp-text-tertiary)",
                    background: subjectLen > 72 ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  {subjectLen}/72
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your changes..."
                  rows={5}
                  readOnly={isGenerating}
                  style={{
                    width: "100%",
                    padding: "16px 18px",
                    fontSize: "13px",
                    fontFamily: "monospace",
                    lineHeight: 1.7,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px",
                    color: "var(--color-gp-text)",
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s ease",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) handleCommit();
                  }}
                />
                {isGenerating && (
                  <div style={{ position: "absolute", bottom: "14px", right: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "14px", height: "14px", border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    <span style={{ fontSize: "11px", color: "#8B5CF6", fontWeight: 600 }}>Writing...</span>
                  </div>
                )}
              </div>
              {streamError && (
                <p style={{ fontSize: "12px", color: "#EF4444", marginTop: "8px", fontWeight: 500 }}>{streamError}</p>
              )}
              <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "10px" }}>
                Press{" "}
                <kbd
                  style={{
                    padding: "2px 8px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                  }}
                >
                  Cmd+Enter
                </kbd>{" "}
                to commit
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
              borderRadius: "0 0 20px 20px",
            }}
          >
            {/* Left: AI controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiStatus.running || stagedFiles.length === 0}
                style={{
                  position: "relative",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  border: "1px solid",
                  cursor: isGenerating || !aiStatus.running || stagedFiles.length === 0 ? "not-allowed" : "pointer",
                  overflow: "hidden",
                  transition: "all 0.15s ease",
                  opacity: !aiStatus.running ? 0.4 : 1,
                  color: "#8B5CF6",
                  background: isGenerating ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
                  borderColor: isGenerating ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.15)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  {isGenerating ? (
                    <>
                      <div style={{ width: "13px", height: "13px", border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "14px" }}>✦</span>
                      AI Generate
                    </>
                  )}
                </span>
              </button>

              {aiStatus.running && (
                <div
                  style={{
                    display: "flex",
                    gap: "2px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    padding: "3px",
                  }}
                >
                  {STYLES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setCommitStyle(s.key)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: commitStyle === s.key ? "rgba(139,92,246,0.12)" : "transparent",
                        color: commitStyle === s.key ? "#8B5CF6" : "var(--color-gp-text-tertiary)",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Cancel + Commit */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--color-gp-text-secondary)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={!message.trim() || stagedFiles.length === 0 || isCommitting}
                style={{
                  padding: "9px 24px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  background: !message.trim() || stagedFiles.length === 0 || isCommitting ? "rgba(139,92,246,0.3)" : "#8B5CF6",
                  border: "none",
                  borderRadius: "10px",
                  cursor: !message.trim() || stagedFiles.length === 0 || isCommitting ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: !message.trim() || stagedFiles.length === 0 ? "none" : "0 4px 16px rgba(139,92,246,0.3)",
                }}
              >
                {isCommitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Committing...
                  </span>
                ) : (
                  "Commit"
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
