import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

const TOAST_STYLES = {
  success: { bg: "bg-gp-success/8", border: "border-gp-success/15", text: "text-gp-success", dot: "bg-gp-success" },
  error: { bg: "bg-gp-danger/8", border: "border-gp-danger/15", text: "text-gp-danger", dot: "bg-gp-danger" },
  info: { bg: "bg-gp-info/8", border: "border-gp-info/15", text: "text-gp-info", dot: "bg-gp-info" },
};

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-14 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-fade-in-up",
              style.bg,
              style.border
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
            <span className={cn("text-[12px] font-medium", style.text)}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gp-text-tertiary hover:text-gp-text transition-colors ml-2 shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
