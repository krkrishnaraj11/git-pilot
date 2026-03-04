import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { AiStatusIndicator } from "./AiStatusIndicator";

interface TitleBarProps {
  onManageClick?: () => void;
}

const BTN_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-gp-text-secondary)",
  background: "var(--color-gp-surface-2)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "10px",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

export function TitleBar({ onManageClick }: TitleBarProps) {
  const [time, setTime] = useState(new Date());
  const pickFolder = useAppStore((s) => s.pickFolder);
  const isScanning = useAppStore((s) => s.isScanning);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      data-tauri-drag-region
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "var(--color-gp-surface-1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }} data-tauri-drag-region>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "rgba(139, 92, 246, 0.12)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
          </svg>
        </div>
        <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-gp-text)" }}>
          GitPilot
        </span>
        <span
          style={{
            padding: "3px 8px",
            fontSize: "10px",
            fontFamily: "monospace",
            fontWeight: 700,
            borderRadius: "6px",
            background: "var(--color-gp-surface-2)",
            color: "var(--color-gp-text-tertiary)",
            border: "1px solid rgba(255,255,255,0.06)",
            letterSpacing: "0.05em",
          }}
        >
          v0.1.0
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Rescan */}
        <button
          onClick={() => pickFolder()}
          disabled={isScanning}
          style={{
            ...BTN_STYLE,
            opacity: isScanning ? 0.5 : 1,
          }}
        >
          {isScanning ? (
            <>
              <div style={{ width: "14px", height: "14px", border: "2px solid rgba(139,92,246,0.3)", borderTopColor: "#8B5CF6", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Scanning...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Rescan
            </>
          )}
        </button>

        {/* Manage */}
        {onManageClick && (
          <button onClick={onManageClick} style={BTN_STYLE}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Manage
          </button>
        )}
        <AiStatusIndicator />
        <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--color-gp-text-tertiary)" }}>
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </header>
  );
}
