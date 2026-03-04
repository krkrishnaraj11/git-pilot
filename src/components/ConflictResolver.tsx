import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAiStore } from "@/stores/ai-store";
import { cn } from "@/lib/utils";
import type { ConflictFile, AiConflictResolution } from "@/stores/types";

interface ConflictResolverProps {
  repoPath: string;
  conflict: ConflictFile;
  onResolved: () => void;
}

export function ConflictResolver({ repoPath, conflict, onResolved }: ConflictResolverProps) {
  const resolveConflict = useAppStore((s) => s.resolveConflict);
  const aiResolveConflict = useAppStore((s) => s.aiResolveConflict);
  const ollamaRunning = useAiStore((s) => s.aiStatus.running);

  const [aiResult, setAiResult] = useState<AiConflictResolution | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [manualEdit, setManualEdit] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const handleAiResolve = async () => {
    setIsAiLoading(true);
    const result = await aiResolveConflict(repoPath, conflict.path);
    if (result) {
      setAiResult(result);
    }
    setIsAiLoading(false);
  };

  const handleAccept = async (content: string) => {
    setIsResolving(true);
    await resolveConflict(repoPath, conflict.path, content);
    setIsResolving(false);
    onResolved();
  };

  const confidenceColor = (c: string) => {
    switch (c) {
      case "high": return "text-gp-success bg-gp-success/10 border-gp-success/20";
      case "medium": return "text-gp-warning bg-gp-warning/10 border-gp-warning/20";
      case "low": return "text-gp-danger bg-gp-danger/10 border-gp-danger/20";
      default: return "text-gp-text-tertiary bg-gp-surface-2 border-gp-border";
    }
  };

  return (
    <div className="border border-gp-border rounded-lg overflow-hidden bg-gp-surface-1">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gp-surface-2 border-b border-gp-border">
        <span className="text-xs font-mono text-gp-text">{conflict.path}</span>
        <div className="flex items-center gap-2">
          {ollamaRunning && (
            <button
              onClick={handleAiResolve}
              disabled={isAiLoading}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                isAiLoading
                  ? "bg-gp-purple/20 text-gp-purple border border-gp-purple/30"
                  : "text-gp-purple bg-gp-purple/10 border border-gp-purple/20 hover:bg-gp-purple/15"
              )}
            >
              {isAiLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-gp-purple/30 border-t-gp-purple rounded-full animate-spin" />
                  Resolving...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>✦</span> AI Resolve
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setShowManual(!showManual)}
            className="px-2.5 py-1 text-[10px] font-medium text-gp-text-secondary bg-gp-surface-2 border border-gp-border rounded-md hover:bg-gp-surface-3 transition-colors"
          >
            Manual Edit
          </button>
        </div>
      </div>

      {/* Side-by-side diff panels */}
      <div className="grid grid-cols-2 divide-x divide-gp-border">
        {/* Current (ours) */}
        <div>
          <div className="px-3 py-1.5 bg-gp-success/5 border-b border-gp-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gp-success">Current (Ours)</span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono text-gp-text leading-relaxed overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {conflict.current_content || "(empty)"}
          </pre>
        </div>

        {/* Incoming (theirs) */}
        <div>
          <div className="px-3 py-1.5 bg-gp-info/5 border-b border-gp-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gp-info">Incoming (Theirs)</span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono text-gp-text leading-relaxed overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {conflict.incoming_content || "(empty)"}
          </pre>
        </div>
      </div>

      {/* AI Resolution */}
      {aiResult && (
        <div className="border-t border-gp-border">
          <div className="px-3 py-1.5 bg-gp-purple/5 border-b border-gp-border flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gp-purple">AI Suggested Resolution</span>
            <span className={cn("px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border", confidenceColor(aiResult.confidence))}>
              {aiResult.confidence}
            </span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono text-gp-text leading-relaxed overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
            {aiResult.resolved_content}
          </pre>
          <div className="px-3 py-2 border-t border-gp-border">
            <p className="text-[10px] text-gp-text-tertiary italic">{aiResult.reasoning}</p>
          </div>
        </div>
      )}

      {/* Manual edit */}
      {showManual && (
        <div className="border-t border-gp-border px-3 py-2">
          <textarea
            value={manualEdit}
            onChange={(e) => setManualEdit(e.target.value)}
            placeholder="Paste or write your resolution..."
            rows={6}
            className="w-full px-3 py-2 text-[11px] font-mono bg-gp-surface-2 border border-gp-border rounded-lg text-gp-text placeholder:text-gp-text-tertiary focus:outline-none focus:border-gp-purple/50 resize-none"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gp-border bg-gp-surface-2">
        {aiResult && (
          <button
            onClick={() => handleAccept(aiResult.resolved_content)}
            disabled={isResolving}
            className="px-3 py-1.5 text-[11px] font-medium text-white bg-gp-purple rounded-lg hover:bg-gp-purple/90 transition-colors disabled:opacity-40"
          >
            {isResolving ? "Accepting..." : "Accept AI"}
          </button>
        )}
        <button
          onClick={() => handleAccept(conflict.current_content)}
          disabled={isResolving}
          className="px-3 py-1.5 text-[11px] font-medium text-gp-success bg-gp-success/10 border border-gp-success/20 rounded-lg hover:bg-gp-success/15 transition-colors disabled:opacity-40"
        >
          Use Current
        </button>
        <button
          onClick={() => handleAccept(conflict.incoming_content)}
          disabled={isResolving}
          className="px-3 py-1.5 text-[11px] font-medium text-gp-info bg-gp-info/10 border border-gp-info/20 rounded-lg hover:bg-gp-info/15 transition-colors disabled:opacity-40"
        >
          Use Incoming
        </button>
        {showManual && manualEdit.trim() && (
          <button
            onClick={() => handleAccept(manualEdit)}
            disabled={isResolving}
            className="px-3 py-1.5 text-[11px] font-medium text-gp-warning bg-gp-warning/10 border border-gp-warning/20 rounded-lg hover:bg-gp-warning/15 transition-colors disabled:opacity-40"
          >
            Use Manual
          </button>
        )}
      </div>
    </div>
  );
}
