import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useAiStore } from "@/stores/ai-store";
import type { ModelOption, DownloadProgress } from "@/stores/types";

export function AiStatusIndicator() {
  const status = useAiStore((s) => s.aiStatus);
  const checkStatus = useAiStore((s) => s.checkAiStatus);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayName = status.running
    ? status.model_id
      ? status.model_id.replace("qwen2.5-coder-", "Qwen ")
      : "AI Ready"
    : "AI Offline";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: status.running ? "#10B981" : "rgba(90,100,122,0.5)",
            boxShadow: status.running ? "0 0 6px rgba(16,185,129,0.5)" : "none",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontFamily: "monospace",
            fontWeight: 600,
            color: status.running ? "var(--color-gp-text-secondary)" : "var(--color-gp-text-tertiary)",
          }}
        >
          {displayName}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-gp-text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && <ModelDropdown onClose={() => setOpen(false)} activeModelId={status.model_id} isRunning={status.running} />}
    </div>
  );
}

function ModelDropdown({ onClose, activeModelId, isRunning }: { onClose: () => void; activeModelId: string | null; isRunning: boolean }) {
  const checkAiStatus = useAiStore((s) => s.checkAiStatus);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [downloaded, setDownloaded] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for download progress
  useEffect(() => {
    if (!downloadingId) return;
    const unlisteners: UnlistenFn[] = [];

    (async () => {
      const u1 = await listen<DownloadProgress>("model-download-progress", (e) => {
        setProgress(e.payload);
        if (e.payload.percent >= 100) {
          setDownloadingId(null);
          setProgress(null);
          loadData();
        }
      });
      const u2 = await listen<string>("model-download-error", (e) => {
        setDownloadingId(null);
        setProgress(null);
        setError(e.payload);
      });
      unlisteners.push(u1, u2);
    })();

    return () => unlisteners.forEach((u) => u());
  }, [downloadingId]);

  const loadData = async () => {
    try {
      const [m, d] = await Promise.all([
        invoke<ModelOption[]>("get_available_models"),
        invoke<string[]>("get_downloaded_models"),
      ]);
      setModels(m);
      setDownloaded(d);
    } catch (e) {
      console.error("Failed to load models:", e);
    }
  };

  const handleDownload = async (modelId: string) => {
    setError(null);
    setDownloadingId(modelId);
    try {
      await invoke("download_model", { modelId });
    } catch (e) {
      setDownloadingId(null);
      setError(`${e}`);
    }
  };

  const handleSwitch = async (modelId: string) => {
    setError(null);
    setSwitchingId(modelId);
    try {
      await invoke("restart_llama_server", { modelId });
      await invoke("set_setting", { key: "active_model", value: modelId });
      await checkAiStatus();
      setSwitchingId(null);
      onClose();
    } catch (e) {
      setSwitchingId(null);
      setError(`${e}`);
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      await invoke("delete_model", { modelId });
      await loadData();
    } catch (e) {
      setError(`${e}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: "360px",
        background: "rgba(20, 24, 40, 0.97)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "14px",
        boxShadow: "0 16px 60px rgba(0,0,0,0.6)",
        zIndex: 9999,
        overflow: "hidden",
        animation: "spotlightIn 0.15s ease",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-gp-text)" }}>AI Model</div>
        <div style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "2px" }}>
          {isRunning ? "Engine running" : "Engine offline"} · Select a model to use
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 18px", fontSize: "11px", color: "#EF4444", background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {error}
        </div>
      )}

      {/* Model list */}
      <div style={{ padding: "8px", maxHeight: "340px", overflowY: "auto" }}>
        {models.map((model) => {
          const isDownloaded = downloaded.includes(model.id);
          const isActive = activeModelId === model.id;
          const isDownloading = downloadingId === model.id;
          const isSwitching = switchingId === model.id;

          return (
            <div
              key={model.id}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: isActive ? "rgba(139, 92, 246, 0.08)" : "transparent",
                border: isActive ? "1px solid rgba(139, 92, 246, 0.15)" : "1px solid transparent",
                marginBottom: "4px",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-gp-text)" }}>
                      {model.display_name}
                    </span>
                    {isActive && (
                      <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8B5CF6", background: "rgba(139,92,246,0.12)", padding: "2px 7px", borderRadius: "5px" }}>
                        Active
                      </span>
                    )}
                    {isDownloaded && !isActive && (
                      <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "2px 7px", borderRadius: "5px" }}>
                        Ready
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", marginTop: "3px" }}>
                    {model.param_count} · {formatSize(model.size_bytes)} · {model.description}
                  </div>

                  {/* Download progress */}
                  {isDownloading && progress && (
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "#8B5CF6" }}>
                          {formatSize(progress.downloaded)} / {formatSize(progress.total)}
                        </span>
                        <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)" }}>
                          {progress.speed_mbps.toFixed(1)} MB/s
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${progress.percent}%`,
                            height: "100%",
                            borderRadius: "4px",
                            background: "linear-gradient(to right, #8B5CF6, #3B82F6)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div style={{ flexShrink: 0 }}>
                  {isActive ? (
                    <span style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", padding: "6px 0" }}>
                      In use
                    </span>
                  ) : isDownloading ? (
                    <div style={{ width: "14px", height: "14px", border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginTop: "4px" }} />
                  ) : isSwitching ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "12px", height: "12px", border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: "10px", color: "#8B5CF6" }}>Switching...</span>
                    </div>
                  ) : isDownloaded ? (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleSwitch(model.id)}
                        style={{
                          padding: "5px 12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#8B5CF6",
                          background: "rgba(139,92,246,0.1)",
                          border: "1px solid rgba(139,92,246,0.2)",
                          borderRadius: "7px",
                          cursor: "pointer",
                        }}
                      >
                        Use
                      </button>
                      <button
                        onClick={() => handleDelete(model.id)}
                        style={{
                          padding: "5px 8px",
                          fontSize: "11px",
                          color: "var(--color-gp-text-tertiary)",
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "7px",
                          cursor: "pointer",
                        }}
                        title="Delete model"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDownload(model.id)}
                      style={{
                        padding: "5px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#10B981",
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: "7px",
                        cursor: "pointer",
                      }}
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
