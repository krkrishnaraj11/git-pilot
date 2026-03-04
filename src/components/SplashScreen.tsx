import { useAppStore } from "@/stores/app-store";
import type { InitStep } from "@/stores/app-store";

function StepIcon({ status }: { status: InitStep["status"] }) {
  const base: React.CSSProperties = {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (status === "pending") {
    return (
      <div
        style={{
          ...base,
          border: "2px solid rgba(139, 92, 246, 0.2)",
          background: "rgba(139, 92, 246, 0.05)",
        }}
      />
    );
  }
  if (status === "running") {
    return (
      <div
        style={{
          ...base,
          border: "2.5px solid rgba(139, 92, 246, 0.15)",
          borderTopColor: "#8B5CF6",
          animation: "spin 0.7s linear infinite",
        }}
      />
    );
  }
  if (status === "done") {
    return (
      <div
        style={{
          ...base,
          background: "rgba(16, 185, 129, 0.15)",
        }}
        className="animate-step-done"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  // error
  return (
    <div
      style={{
        ...base,
        background: "rgba(239, 68, 68, 0.15)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  );
}

export function SplashScreen() {
  const initSteps = useAppStore((s) => s.initSteps);

  const completedCount = initSteps.filter((s) => s.status === "done").length;
  const runningStep = initSteps.find((s) => s.status === "running");
  const progress = (completedCount / initSteps.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gp-bg relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gp-purple/[0.04] blur-[120px] pointer-events-none" />

      {/* Logo + title */}
      <div className="flex flex-col items-center animate-fade-in-up z-10" style={{ gap: "20px", marginBottom: "48px" }}>
        <div className="relative">
          <div
            className="bg-gradient-to-br from-gp-purple/20 to-gp-purple/5 border border-gp-purple/20 flex items-center justify-center splash-logo-glow"
            style={{ width: "80px", height: "80px", borderRadius: "20px" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <line x1="6" y1="9" x2="6" y2="21" />
            </svg>
          </div>
          <div className="absolute inset-0 border border-gp-purple/30 animate-splash-ping" style={{ borderRadius: "20px" }} />
        </div>

        <div className="text-center">
          <h1 style={{ fontSize: "24px" }} className="font-bold text-gp-text tracking-tight">
            GitPilot
          </h1>
          <p style={{ fontSize: "13px", marginTop: "6px" }} className="text-gp-text-tertiary">
            AI-Powered Git Identity Manager
          </p>
        </div>
      </div>

      {/* Progress section */}
      <div className="z-10 animate-fade-in-up" style={{ width: "340px", animationDelay: "0.15s" }}>
        {/* Current step label */}
        <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
          <span style={{ fontSize: "13px" }} className="text-gp-text-secondary font-medium">
            {runningStep ? runningStep.label : "Starting up..."}
          </span>
          <span style={{ fontSize: "12px" }} className="font-mono text-gp-text-tertiary">
            {completedCount}/{initSteps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full bg-gp-surface-2 overflow-hidden"
          style={{ height: "6px", borderRadius: "6px", marginBottom: "32px" }}
        >
          <div
            className="h-full bg-gradient-to-r from-gp-purple to-gp-info transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, borderRadius: "6px" }}
          />
        </div>

        {/* Steps list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {initSteps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center transition-opacity duration-300 ${
                step.status === "pending" ? "opacity-50" : "opacity-100"
              }`}
              style={{ gap: "14px" }}
            >
              <StepIcon status={step.status} />
              <span
                style={{ fontSize: "14px" }}
                className={`transition-colors duration-300 ${
                  step.status === "running"
                    ? "text-gp-text font-semibold"
                    : step.status === "done"
                    ? "text-gp-text-secondary"
                    : "text-gp-text-tertiary"
                }`}
              >
                {step.label}
              </span>
              {step.status === "running" && (
                <span
                  style={{ fontSize: "10px" }}
                  className="ml-auto text-gp-purple font-mono tracking-wider uppercase font-semibold"
                >
                  loading
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Version tag */}
      <div className="absolute text-gp-text-tertiary/40 font-mono" style={{ bottom: "24px", fontSize: "11px" }}>
        v1.0.0
      </div>
    </div>
  );
}
