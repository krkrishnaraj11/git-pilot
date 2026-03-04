import { useEffect, useState } from "react";
import { useSetupStore } from "@/stores/setup-store";
import { cn } from "@/lib/utils";
import type { UnlistenFn } from "@tauri-apps/api/event";

// ─── Feature slides ─────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Identity Management",
    description: "Manage multiple Git identities across repos. Automatically match the right name and email based on path or remote.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5" />
        <path d="m2 12 10 5 10-5" />
      </svg>
    ),
    title: "AI-Powered Commits",
    description: "Generate meaningful commit messages from your staged changes using a local AI model. No cloud, no API keys.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    ),
    title: "Safe Merge & Rebase",
    description: "Preview merges before executing. Auto-backup branches and use AI to resolve conflicts when they arise.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
    title: "Repo Dashboard",
    description: "Scan a folder and see all repos at a glance. Filter by status, search, and jump into any repository instantly.",
  },
];

// ─── Walkthrough tips (shown during download) ───────────────

const TIPS = [
  { title: "Quick Scan", text: "Click 'Scan Folder' to discover all Git repos in a directory tree." },
  { title: "AI Commits", text: "Open a repo, stage files, then click the AI button to generate a commit message." },
  { title: "Identity Rules", text: "Set up rules to auto-match identities based on repo path or remote URL." },
  { title: "Branch Safety", text: "Merge and rebase wizards auto-backup your branch before risky operations." },
  { title: "Keyboard Tips", text: "Use the filter bar to quickly narrow repos by status: changes, committed, or pushed." },
];

// ─── Button style constants ─────────────────────────────────

const BTN_PRIMARY: React.CSSProperties = {
  padding: "18px 48px",
  fontSize: "16px",
  borderRadius: "14px",
};

const BTN_SECONDARY: React.CSSProperties = {
  padding: "18px 40px",
  fontSize: "15px",
  borderRadius: "14px",
};

// ─── Formatting helpers ─────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

// ─── Step components ────────────────────────────────────────

function WelcomeStep() {
  const setStep = useSetupStore((s) => s.setWizardStep);
  const loadModels = useSetupStore((s) => s.loadAvailableModels);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 animate-fade-in-up">
      {/* Logo */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gp-purple/20 to-gp-purple/5 border border-gp-purple/20 flex items-center justify-center splash-logo-glow">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-gp-purple/30 animate-splash-ping" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gp-text tracking-tight">Welcome to GitPilot</h1>
        <p className="text-[15px] text-gp-text-secondary mt-2 max-w-sm">
          AI-powered Git identity and operations manager. Let's get you set up in just a few steps.
        </p>
      </div>

      <button
        onClick={() => {
          loadModels();
          setStep("features");
        }}
        style={BTN_PRIMARY}
        className="font-semibold bg-gp-purple text-white hover:bg-gp-purple/90 transition-all hover:shadow-lg hover:shadow-gp-purple/20"
      >
        Get Started
      </button>
    </div>
  );
}

function FeaturesStep() {
  const setStep = useSetupStore((s) => s.setWizardStep);
  const slideIndex = useSetupStore((s) => s.featureSlideIndex);
  const next = useSetupStore((s) => s.nextFeatureSlide);
  const prev = useSetupStore((s) => s.prevFeatureSlide);

  const feature = FEATURES[slideIndex];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* Feature card */}
      <div key={slideIndex} className="flex flex-col items-center gap-5 max-w-md text-center animate-slide-left">
        <div className="w-16 h-16 rounded-2xl bg-gp-purple/10 border border-gp-purple/15 flex items-center justify-center">
          {feature.icon}
        </div>
        <h2 className="text-2xl font-bold text-gp-text">{feature.title}</h2>
        <p className="text-[15px] text-gp-text-secondary leading-relaxed">{feature.description}</p>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2.5">
        {FEATURES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              i === slideIndex ? "bg-gp-purple w-7" : "bg-gp-surface-3"
            )}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          disabled={slideIndex === 0}
          style={BTN_SECONDARY}
          className="font-semibold text-gp-text-secondary bg-gp-surface-2 border border-gp-border hover:bg-gp-surface-3 transition-colors disabled:opacity-30"
        >
          Back
        </button>
        {slideIndex < FEATURES.length - 1 ? (
          <button
            onClick={next}
            style={BTN_PRIMARY}
            className="font-semibold bg-gp-purple text-white hover:bg-gp-purple/90 transition-all"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => setStep("model-select")}
            style={BTN_PRIMARY}
            className="font-semibold bg-gp-purple text-white hover:bg-gp-purple/90 transition-all"
          >
            Choose AI Model
          </button>
        )}
      </div>
    </div>
  );
}

function ModelSelectStep() {
  const setStep = useSetupStore((s) => s.setWizardStep);
  const models = useSetupStore((s) => s.availableModels);
  const selected = useSetupStore((s) => s.selectedModelId);
  const selectModel = useSetupStore((s) => s.selectModel);
  const startDownload = useSetupStore((s) => s.startDownload);

  const speedBadge = (paramCount: string) => {
    switch (paramCount) {
      case "0.5B": return { label: "Fastest", color: "text-gp-success bg-gp-success/10 border-gp-success/15" };
      case "1.5B": return { label: "Fast", color: "text-gp-info bg-gp-info/10 border-gp-info/15" };
      case "3B": return { label: "Balanced", color: "text-gp-purple bg-gp-purple/10 border-gp-purple/15" };
      case "7B": return { label: "Quality", color: "text-gp-warning bg-gp-warning/10 border-gp-warning/15" };
      default: return { label: "", color: "" };
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in-up">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gp-text">Choose Your AI Model</h2>
        <p className="text-[15px] text-gp-text-secondary mt-2">
          Runs 100% locally on your machine. No internet needed after download.
        </p>
      </div>

      <div className="w-full max-w-xl" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {models.map((model) => {
          const badge = speedBadge(model.param_count);
          const isSelected = selected === model.id;
          const isRecommended = model.id === "qwen2.5-coder-3b";

          return (
            <button
              key={model.id}
              onClick={() => selectModel(model.id)}
              style={{
                padding: "20px 24px",
                borderRadius: "16px",
                borderWidth: isSelected ? "2px" : "1px",
              }}
              className={cn(
                "w-full flex items-center gap-5 transition-all text-left",
                isSelected
                  ? "bg-gp-purple/10 border-gp-purple/40 shadow-md shadow-gp-purple/10"
                  : "bg-gp-surface-1 border-gp-border hover:bg-gp-surface-2 hover:border-gp-border-hover"
              )}
            >
              {/* Radio dot */}
              <div
                className={cn(
                  "rounded-full border-2 flex items-center justify-center shrink-0",
                  isSelected ? "border-gp-purple bg-gp-purple/10" : "border-gp-text-tertiary/40"
                )}
                style={{ width: "22px", height: "22px" }}
              >
                {isSelected && (
                  <div className="bg-gp-purple" style={{ width: "10px", height: "10px", borderRadius: "50%" }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span style={{ fontSize: "15px" }} className="font-bold text-gp-text">{model.display_name}</span>
                  <span
                    className={cn("font-semibold border", badge.color)}
                    style={{ fontSize: "10px", padding: "3px 10px", borderRadius: "8px" }}
                  >
                    {badge.label}
                  </span>
                  {isRecommended && (
                    <span
                      className="font-semibold bg-gp-purple/10 text-gp-purple border border-gp-purple/15"
                      style={{ fontSize: "10px", padding: "3px 10px", borderRadius: "8px" }}
                    >
                      Recommended
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", marginTop: "4px" }} className="text-gp-text-tertiary">{model.description}</p>
              </div>

              <span style={{ fontSize: "14px" }} className="font-mono text-gp-text-secondary shrink-0 font-medium">
                {formatBytes(model.size_bytes)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-2">
        <button
          onClick={() => setStep("features")}
          style={BTN_SECONDARY}
          className="font-semibold text-gp-text-secondary bg-gp-surface-2 border border-gp-border hover:bg-gp-surface-3 transition-colors"
        >
          Back
        </button>
        <button
          onClick={startDownload}
          disabled={!selected}
          style={BTN_PRIMARY}
          className="font-semibold bg-gp-purple text-white hover:bg-gp-purple/90 transition-all hover:shadow-lg hover:shadow-gp-purple/20 disabled:opacity-30"
        >
          Download & Continue
        </button>
      </div>
    </div>
  );
}

function DownloadingStep() {
  const progress = useSetupStore((s) => s.downloadProgress);
  const isDownloading = useSetupStore((s) => s.isDownloading);
  const downloadError = useSetupStore((s) => s.downloadError);
  const cancelDownload = useSetupStore((s) => s.cancelDownload);
  const models = useSetupStore((s) => s.availableModels);
  const selectedModelId = useSetupStore((s) => s.selectedModelId);

  const [tipIndex, setTipIndex] = useState(0);

  // Auto-advance walkthrough tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const model = models.find((m) => m.id === selectedModelId);
  const pct = progress?.percent ?? 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 animate-fade-in-up">
      {/* Walkthrough tips */}
      <div className="w-full max-w-md">
        <div key={tipIndex} className="text-center animate-slide-left">
          <p className="text-[11px] font-semibold text-gp-purple uppercase tracking-widest mb-2">
            Tip {tipIndex + 1} of {TIPS.length}
          </p>
          <h3 className="text-xl font-bold text-gp-text">{TIPS[tipIndex].title}</h3>
          <p className="text-[15px] text-gp-text-secondary mt-1.5">{TIPS[tipIndex].text}</p>
        </div>

        {/* Tip dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setTipIndex(i)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                i === tipIndex ? "bg-gp-purple w-4" : "bg-gp-surface-3"
              )}
            />
          ))}
        </div>
      </div>

      {/* Download progress */}
      <div className="w-full max-w-md px-4 py-4 bg-gp-surface-1 border border-gp-border rounded-xl">
        {downloadError ? (
          <div className="text-center">
            <p className="text-[14px] text-gp-danger font-medium">{downloadError}</p>
            <button
              onClick={cancelDownload}
              style={BTN_SECONDARY}
              className="mt-3 font-semibold text-gp-text-secondary bg-gp-surface-2 border border-gp-border hover:bg-gp-surface-3 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-gp-text">
                {model?.display_name ?? "Downloading model"}
              </span>
              <span className="text-[13px] font-mono text-gp-text-tertiary">
                {pct.toFixed(1)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full bg-gp-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gp-purple to-gp-info rounded-full transition-all duration-300 animate-progress-pulse"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-[12px] font-mono text-gp-text-tertiary">
                {progress ? `${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)}` : "Starting..."}
              </span>
              <div className="flex items-center gap-3">
                {progress && progress.speed_mbps > 0 && (
                  <span className="text-[12px] font-mono text-gp-text-tertiary">
                    {progress.speed_mbps.toFixed(1)} MB/s
                  </span>
                )}
                {isDownloading && (
                  <button
                    onClick={cancelDownload}
                    className="text-[12px] font-semibold text-gp-danger hover:text-gp-danger/80 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CompleteStep() {
  const completeSetup = useSetupStore((s) => s.completeSetup);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-in-up">
      {/* Check animation */}
      <div className="w-20 h-20 rounded-full bg-gp-success/10 border border-gp-success/20 flex items-center justify-center animate-check-pop">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-gp-text">Setup Complete!</h2>
        <p className="text-[15px] text-gp-text-secondary mt-2">
          Your AI model is ready. GitPilot is good to go.
        </p>
      </div>

      <button
        onClick={completeSetup}
        style={BTN_PRIMARY}
        className="font-semibold bg-gp-purple text-white hover:bg-gp-purple/90 transition-all hover:shadow-lg hover:shadow-gp-purple/20"
      >
        Launch GitPilot
      </button>
    </div>
  );
}

// ─── Main SetupWizard ───────────────────────────────────────

export function SetupWizard() {
  const wizardStep = useSetupStore((s) => s.wizardStep);
  const initDownloadListener = useSetupStore((s) => s.initDownloadListener);

  useEffect(() => {
    let unlisteners: UnlistenFn[] = [];
    initDownloadListener().then((fns) => {
      unlisteners = fns;
    });
    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className="h-screen bg-gp-bg relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gp-purple/[0.04] blur-[120px] pointer-events-none" />

      {/* Step indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
        {(["welcome", "features", "model-select", "downloading", "complete"] as const).map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              step === wizardStep ? "w-8 bg-gp-purple" : "w-2 bg-gp-surface-3",
              i < ["welcome", "features", "model-select", "downloading", "complete"].indexOf(wizardStep)
                ? "bg-gp-purple/40"
                : ""
            )}
          />
        ))}
      </div>

      {/* Content */}
      <div className="h-full px-8 py-16 z-10 relative">
        {wizardStep === "welcome" && <WelcomeStep />}
        {wizardStep === "features" && <FeaturesStep />}
        {wizardStep === "model-select" && <ModelSelectStep />}
        {wizardStep === "downloading" && <DownloadingStep />}
        {wizardStep === "complete" && <CompleteStep />}
      </div>

      {/* Version tag */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gp-text-tertiary/40 font-mono">
        v1.0.0
      </div>
    </div>
  );
}
