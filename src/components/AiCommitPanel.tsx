import { useEffect, useRef } from "react";
import { useAiStore } from "@/stores/ai-store";
import { useAppStore } from "@/stores/app-store";
import type { CommitStyle } from "@/stores/types";
import { cn } from "@/lib/utils";

const STYLES: { key: CommitStyle; label: string }[] = [
  { key: "conventional", label: "Conventional" },
  { key: "gitmoji", label: "Gitmoji" },
  { key: "simple", label: "Simple" },
];

export function AiCommitPanel() {
  const open = useAiStore((s) => s.aiPanelOpen);
  const setOpen = useAiStore((s) => s.setAiPanelOpen);
  const aiStatus = useAiStore((s) => s.aiStatus);
  const isGenerating = useAiStore((s) => s.isGenerating);
  const currentMessage = useAiStore((s) => s.currentMessage);
  const commitStyle = useAiStore((s) => s.commitStyle);
  const setCommitStyle = useAiStore((s) => s.setCommitStyle);
  const setCurrentMessage = useAiStore((s) => s.setCurrentMessage);
  const clearMessage = useAiStore((s) => s.clearMessage);
  const generateStreaming = useAiStore((s) => s.generateStreaming);
  const streamError = useAiStore((s) => s.streamError);
  const messageHistory = useAiStore((s) => s.messageHistory);

  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const repoDiff = useAppStore((s) => s.repoDiff);
  const doCommit = useAppStore((s) => s.doCommit);
  const allRepos = useAppStore((s) => s.allRepos);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isGenerating && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [currentMessage, isGenerating]);

  if (!open) return null;

  const repoPath = selectedRepo?.path;
  const stagedCount = repoDiff?.staged.length || 0;

  const handleGenerate = async () => {
    if (!repoPath || !aiStatus.running) return;
    await generateStreaming(repoPath);
  };

  const handleCommit = async () => {
    if (!repoPath || !currentMessage.trim()) return;
    const result = await doCommit(repoPath, currentMessage);
    if (result?.success) {
      clearMessage();
      setOpen(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40" onClick={() => setOpen(false)} />
      <div className="fixed top-0 right-0 bottom-0 w-[480px] bg-gp-bg border-l border-gp-border z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gp-border bg-gp-surface-1/50">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-gp-purple">✦</span>
            <h2 className="text-[14px] font-bold text-gp-text">AI Commit</h2>
            {aiStatus.model_id && (
              <span className="text-[9px] font-mono text-gp-text-tertiary px-2 py-0.5 rounded-md bg-gp-surface-2 border border-gp-border/50">
                {aiStatus.model_id}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gp-surface-2 text-gp-text-tertiary hover:text-gp-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Ollama offline */}
          {!aiStatus.running && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-gp-warning/5 border border-gp-warning/12 rounded-xl">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" className="shrink-0 mt-0.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-[12px] font-medium text-gp-warning">AI engine not running</p>
                <p className="text-[11px] text-gp-text-tertiary mt-1 leading-relaxed">
                  The local AI server is offline. Check Settings or restart the app.
                </p>
              </div>
            </div>
          )}

          {/* Repo info */}
          {selectedRepo && (
            <div className="px-4 py-3 bg-gp-surface-1 border border-gp-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-gp-text">{selectedRepo.name}</span>
                <span className="text-[11px] font-mono text-gp-purple font-medium">{selectedRepo.branch}</span>
              </div>
              <p className="text-[11px] text-gp-text-tertiary mt-1.5">
                {stagedCount} staged file{stagedCount !== 1 ? "s" : ""}
                {stagedCount === 0 && " — stage changes first"}
              </p>
            </div>
          )}

          {!selectedRepo && (
            <p className="text-[12px] text-gp-text-tertiary text-center py-6">
              Open a repository first to generate commit messages
            </p>
          )}

          {/* Style selector */}
          <div>
            <label className="text-[10px] font-semibold text-gp-text-secondary uppercase tracking-widest mb-2.5 block">
              Commit Style
            </label>
            <div className="flex gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setCommitStyle(s.key)}
                  className={cn(
                    "flex-1 px-3 py-2 text-[11px] font-semibold rounded-xl transition-all",
                    commitStyle === s.key
                      ? "bg-gp-purple/10 text-gp-purple border border-gp-purple/15"
                      : "bg-gp-surface-1 text-gp-text-tertiary border border-gp-border hover:bg-gp-surface-2 hover:text-gp-text-secondary"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !aiStatus.running || !repoPath || stagedCount === 0}
            className={cn(
              "w-full relative px-4 py-3.5 text-[13px] font-semibold rounded-xl transition-all overflow-hidden",
              isGenerating
                ? "bg-gp-purple/15 text-gp-purple border border-gp-purple/20 cursor-wait"
                : "bg-gp-purple text-white hover:bg-gp-purple/90 hover:shadow-lg hover:shadow-gp-purple/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {isGenerating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer" />
            )}
            <span className="relative flex items-center justify-center gap-2.5">
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-gp-purple/30 border-t-gp-purple rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <span>✦</span>
                  Generate Commit Message
                </>
              )}
            </span>
          </button>

          {/* Error */}
          {streamError && (
            <div className="px-4 py-2.5 bg-gp-danger/5 border border-gp-danger/12 rounded-xl">
              <p className="text-[11px] text-gp-danger">{streamError}</p>
            </div>
          )}

          {/* Generated message */}
          {(currentMessage || isGenerating) && (
            <div>
              <label className="text-[10px] font-semibold text-gp-text-secondary uppercase tracking-widest mb-2 block">
                Generated Message
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  readOnly={isGenerating}
                  rows={6}
                  className="w-full px-3.5 py-3 text-[13px] font-mono bg-gp-surface-1 border border-gp-border rounded-xl text-gp-text focus:outline-none focus:border-gp-purple/30 transition-colors resize-none leading-relaxed"
                />
                {isGenerating && (
                  <span className="absolute bottom-3 right-3 w-0.5 h-4 bg-gp-purple animate-pulse rounded-full" />
                )}
              </div>

              {!isGenerating && currentMessage && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleCommit}
                    disabled={!currentMessage.trim() || stagedCount === 0}
                    className="flex-1 px-4 py-2 text-[11px] font-semibold text-white bg-gp-purple rounded-xl hover:bg-gp-purple/90 transition-all disabled:opacity-30"
                  >
                    Commit
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="px-3.5 py-2 text-[11px] font-semibold text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={clearMessage}
                    className="px-3.5 py-2 text-[11px] font-semibold text-gp-text-tertiary bg-gp-surface-2 border border-gp-border rounded-xl hover:bg-gp-surface-3 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Message history */}
          {messageHistory.length > 0 && !isGenerating && (
            <div>
              <label className="text-[10px] font-semibold text-gp-text-tertiary uppercase tracking-widest mb-2.5 block">
                Recent Messages
              </label>
              <div className="space-y-1.5">
                {messageHistory.map((msg, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentMessage(msg)}
                    className="w-full text-left px-3.5 py-2.5 text-[11px] font-mono text-gp-text-secondary bg-gp-surface-1 border border-gp-border rounded-xl hover:bg-gp-surface-2 transition-colors truncate"
                  >
                    {msg.split("\n")[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
