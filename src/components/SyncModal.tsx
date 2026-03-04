import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";

export function SyncModal() {
  const syncOp = useAppStore((s) => s.syncOp);
  const clearSync = () => useAppStore.setState({ syncOp: null });
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Animate progress bar while running
  useEffect(() => {
    if (!syncOp) {
      setProgress(0);
      setVisible(false);
      return;
    }
    setVisible(true);

    if (syncOp.status === "running") {
      setProgress(0);
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        // Ease towards 85% over ~8 seconds, never reaching 100
        const p = 85 * (1 - Math.exp(-elapsed / 3000));
        setProgress(Math.min(p, 85));
      }, 50);
      return () => clearInterval(interval);
    }

    if (syncOp.status === "success") {
      setProgress(100);
    }
  }, [syncOp?.status]);

  // Auto-dismiss on success after 2s
  useEffect(() => {
    if (syncOp?.status === "success") {
      const t = setTimeout(clearSync, 2200);
      return () => clearTimeout(t);
    }
  }, [syncOp?.status]);

  if (!syncOp || !visible) return null;

  const isPush = syncOp.type === "push";
  const isRunning = syncOp.status === "running";
  const isSuccess = syncOp.status === "success";
  const isError = syncOp.status === "error";

  const accentColor = isError ? "#EF4444" : isSuccess ? "#10B981" : "#8B5CF6";
  const bgGlow = isError
    ? "rgba(239,68,68,0.08)"
    : isSuccess
      ? "rgba(16,185,129,0.08)"
      : "rgba(139,92,246,0.08)";

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          zIndex: 70,
          animation: "fadeIn 0.15s ease",
        }}
        onClick={isError ? clearSync : undefined}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "440px",
          background: "var(--color-gp-bg)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 60px ${bgGlow}`,
          zIndex: 70,
          overflow: "hidden",
          animation: "spotlightIn 0.2s ease",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            height: "3px",
            background: isRunning
              ? `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
              : accentColor,
            animation: isRunning ? "shimmerBar 1.5s ease infinite" : undefined,
          }}
        />

        <div style={{ padding: "32px 32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
          {/* Icon */}
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: bgGlow,
              border: `2px solid ${accentColor}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {isRunning && (
              <div
                style={{
                  position: "absolute",
                  inset: "-4px",
                  borderRadius: "50%",
                  border: `2px solid transparent`,
                  borderTopColor: accentColor,
                  animation: "spin 1s linear infinite",
                }}
              />
            )}
            {isSuccess ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : isError ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : isPush ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            )}
          </div>

          {/* Title */}
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-gp-text)", letterSpacing: "-0.02em", margin: 0 }}>
              {isSuccess
                ? (isPush ? "Push Complete" : "Pull Complete")
                : isError
                  ? (isPush ? "Push Failed" : "Pull Failed")
                  : (isPush ? "Pushing..." : "Pulling...")}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--color-gp-text-tertiary)", marginTop: "6px" }}>
              {syncOp.repoName}
              <span style={{ margin: "0 6px", opacity: 0.3 }}>/</span>
              <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{syncOp.branch}</span>
            </p>
          </div>

          {/* Progress bar */}
          {(isRunning || isSuccess) && (
            <div style={{ width: "100%", padding: "0 8px" }}>
              <div
                style={{
                  width: "100%",
                  height: "6px",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    borderRadius: "6px",
                    background: isSuccess
                      ? "#10B981"
                      : "linear-gradient(90deg, #8B5CF6, #3B82F6)",
                    transition: isSuccess ? "width 0.3s ease" : "width 0.15s linear",
                    boxShadow: `0 0 12px ${accentColor}40`,
                  }}
                />
              </div>
              {isRunning && (
                <p style={{ fontSize: "11px", color: "var(--color-gp-text-tertiary)", textAlign: "center", marginTop: "8px", fontFamily: "monospace" }}>
                  {isPush ? "Uploading objects to remote..." : "Downloading objects from remote..."}
                </p>
              )}
            </div>
          )}

          {/* Success message */}
          {isSuccess && syncOp.message && (
            <p style={{ fontSize: "13px", color: "#10B981", fontWeight: 600 }}>
              {syncOp.message}
            </p>
          )}

          {/* Error detail */}
          {isError && (
            <div style={{ width: "100%" }}>
              {syncOp.detail && (
                <div
                  style={{
                    padding: "12px 16px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    color: "rgba(239,68,68,0.85)",
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.1)",
                    borderRadius: "12px",
                    maxHeight: "100px",
                    overflowY: "auto",
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                  }}
                >
                  {syncOp.detail}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
                <button
                  onClick={clearSync}
                  style={{
                    padding: "10px 28px",
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
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
