import { useAppStore } from "@/stores/app-store";

const TOAST_COLORS = {
  success: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.2)", text: "#10B981", dot: "#10B981" },
  error: { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.2)", text: "#EF4444", dot: "#EF4444" },
  info: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)", text: "#3B82F6", dot: "#3B82F6" },
};

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "56px",
        right: "20px",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const colors = TOAST_COLORS[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 18px",
              borderRadius: "14px",
              border: `1px solid ${colors.border}`,
              background: colors.bg,
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              animation: "spotlightIn 0.2s ease",
              minWidth: "240px",
              maxWidth: "420px",
            }}
          >
            {/* Status icon */}
            {toast.type === "success" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.dot} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : toast.type === "error" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.dot} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.dot} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}

            <span style={{ fontSize: "13px", fontWeight: 600, color: colors.text, flex: 1 }}>
              {toast.message}
            </span>

            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                color: "var(--color-gp-text-tertiary)",
                flexShrink: 0,
                borderRadius: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
