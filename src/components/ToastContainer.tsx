import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import { useAppStore } from "@/stores/app-store";
import { IconButton } from "./ui";

const TOAST_STYLES = {
  success: "border-ok/25 bg-tint-ok text-ok",
  error: "border-error/25 bg-tint-error text-error",
  info: "border-staged/25 bg-tint-info text-staged",
} as const;

const TOAST_ICONS = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
} as const;

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-14 right-5 z-[100] flex flex-col items-end gap-2">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`animate-spotlightIn pointer-events-auto flex min-w-[240px] max-w-[420px] items-center gap-2.5 rounded-lg border px-4 py-3 shadow-md ${TOAST_STYLES[toast.type]}`}
          >
            <Icon size={16} weight="bold" className="shrink-0" />
            <span className="flex-1 text-[13px] font-medium">{toast.message}</span>
            <IconButton size="sm" aria-label="Dismiss notification" className="text-muted hover:text-text" onClick={() => removeToast(toast.id)}>
              <X size={12} weight="bold" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}

