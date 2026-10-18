import { ArrowsClockwise, GearSix, GitBranch, Minus, Square, X } from "@phosphor-icons/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "@/stores/app-store";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { SearchModal } from "./SearchInput";
import { IconButton } from "./ui";

const isMac = /Mac/i.test(navigator.platform || navigator.userAgent);

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function WindowControls() {
  const win = getCurrentWindow();
  return (
    <div className="flex items-center gap-0.5">
      <IconButton size="sm" aria-label="Minimize window" onClick={() => win.minimize()}>
        <Minus size={12} />
      </IconButton>
      <IconButton size="sm" aria-label="Maximize window" onClick={() => win.toggleMaximize()}>
        <Square size={10} />
      </IconButton>
      <IconButton size="sm" aria-label="Close window" className="hover:bg-tint-error hover:text-error" onClick={() => win.close()}>
        <X size={12} />
      </IconButton>
    </div>
  );
}

export function TitleBar() {
  const lastScanAt = useAppStore((s) => s.lastScanAt);
  const scanPath = useAppStore((s) => s.scanPath);
  const isScanning = useAppStore((s) => s.isScanning);
  const scanDirectory = useAppStore((s) => s.scanDirectory);
  const setView = useAppStore((s) => s.setView);

  return (
    <header
      data-tauri-drag-region
      className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-panel pr-3"
      style={isMac ? { paddingLeft: 68 } : { paddingLeft: 12 }}
    >
      {/* Logo + wordmark */}
      <div data-tauri-drag-region className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-tint">
          <GitBranch size={13} weight="fill" className="text-accent-text" />
        </div>
        <span data-tauri-drag-region className="text-[13px] font-semibold tracking-[-0.01em] text-text">
          GitPilot
        </span>
      </div>

      {/* Search / command (center) */}
      <div className="flex min-w-0 flex-1 justify-center">
        <SearchModal />
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        <AiStatusIndicator />

        {lastScanAt && scanPath && (
          <button
            onClick={() => scanDirectory(scanPath)}
            disabled={isScanning}
            className="flex h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-[11px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:opacity-50"
            title={`Rescan ${scanPath}`}
          >
            <ArrowsClockwise size={12} className={isScanning ? "animate-spin" : ""} />
            {isScanning ? "Rescanning…" : `Rescanned ${timeAgo(lastScanAt)}`}
          </button>
        )}

        <IconButton aria-label="Settings" onClick={() => setView("settings")}>
          <GearSix size={15} />
        </IconButton>

        {!isMac && <WindowControls />}
      </div>
    </header>
  );
}

