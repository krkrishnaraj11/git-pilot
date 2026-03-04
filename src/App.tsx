import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAiStore } from "@/stores/ai-store";
import { useSetupStore } from "@/stores/setup-store";
import { TitleBar } from "@/components/TitleBar";
import { StatsStrip } from "@/components/StatsStrip";
import { FilterBar } from "@/components/FilterBar";
import { SearchModal } from "@/components/SearchInput";
import { IdentitySection } from "@/components/IdentitySection";
import { StatusBar } from "@/components/StatusBar";
import { IdentityManager } from "@/components/IdentityManager";
import { AuditLog } from "@/components/AuditLog";
import { MismatchBanner } from "@/components/IdentityMismatchWarning";
import { RepoDetail } from "@/components/RepoDetail";
import { ToastContainer } from "@/components/ToastContainer";
import { AiCommitPanel } from "@/components/AiCommitPanel";
import { MergeWizard, RebaseWizard } from "@/components/MergeWizard";
import { BackupManager } from "@/components/BackupManager";
import { SplashScreen } from "@/components/SplashScreen";
import { SetupWizard } from "@/components/SetupWizard";

function EmptyState() {
  const pickFolder = useAppStore((s) => s.pickFolder);
  const isScanning = useAppStore((s) => s.isScanning);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="w-16 h-16 rounded-2xl bg-gp-surface-2 border border-gp-border flex items-center justify-center">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5A647A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-gp-text-secondary text-[13px] font-medium">
          {isScanning ? "Scanning for repositories..." : "No repositories loaded"}
        </p>
        <p className="text-gp-text-tertiary text-[11px] mt-1">
          {isScanning ? "This may take a moment" : "Select a folder to discover Git repositories"}
        </p>
      </div>
      {!isScanning && (
        <button
          onClick={pickFolder}
          className="px-5 py-2.5 text-[13px] font-semibold bg-gp-purple text-white rounded-xl hover:bg-gp-purple/90 transition-all hover:shadow-lg hover:shadow-gp-purple/20"
        >
          Scan Folder
        </button>
      )}
      {isScanning && (
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-gp-purple/30 border-t-gp-purple rounded-full animate-spin" />
          <span className="text-[11px] text-gp-text-tertiary font-mono">
            Discovering repos...
          </span>
        </div>
      )}
    </div>
  );
}

function App() {
  // Subscribe to filter/search/identities so component re-renders on changes
  const _activeFilter = useAppStore((s) => s.activeFilter);
  const _searchQuery = useAppStore((s) => s.searchQuery);
  const _rawIdentities = useAppStore((s) => s.identities);
  const identities = useAppStore.getState().filteredIdentities();
  const allRepos = useAppStore((s) => s.allRepos);
  const initializeApp = useAppStore((s) => s.initializeApp);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const setIdentityManagerOpen = useAppStore((s) => s.setIdentityManagerOpen);
  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const mergeWizardOpen = useAppStore((s) => s.mergeWizardOpen);
  const rebaseWizardOpen = useAppStore((s) => s.rebaseWizardOpen);
  const backupManagerOpen = useAppStore((s) => s.backupManagerOpen);
  const aiPanelOpen = useAiStore((s) => s.aiPanelOpen);

  const needsSetup = useSetupStore((s) => s.needsSetup);
  const checkNeedsSetup = useSetupStore((s) => s.checkNeedsSetup);

  const hasRepos = allRepos.length > 0;

  useEffect(() => {
    checkNeedsSetup();
  }, []);

  useEffect(() => {
    if (needsSetup === false) {
      initializeApp();
    }
  }, [needsSetup]);

  // Still checking setup status
  if (needsSetup === null) return null;

  // First run — show setup wizard
  if (needsSetup === true) return <SetupWizard />;

  if (isInitializing) {
    return <SplashScreen />;
  }

  return (
    <div className="flex flex-col h-screen bg-gp-bg">
      <TitleBar onManageClick={() => setIdentityManagerOpen(true)} />

      {hasRepos && <StatsStrip />}

      <MismatchBanner />

      {hasRepos && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <FilterBar />
          <SearchModal />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {!hasRepos ? (
          <EmptyState />
        ) : identities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gp-text-tertiary text-[13px]">
              No repos match current filters
            </p>
          </div>
        ) : (
          <div className="py-4">
            {identities.map((identity) => (
              <IdentitySection key={identity.id} identity={identity} />
            ))}
          </div>
        )}
      </main>

      <StatusBar />

      {/* Dialogs & overlays */}
      <IdentityManager />
      <AuditLog />
      {selectedRepo && <RepoDetail />}
      {aiPanelOpen && <AiCommitPanel />}
      {mergeWizardOpen && <MergeWizard />}
      {rebaseWizardOpen && <RebaseWizard />}
      {backupManagerOpen && <BackupManager />}
      <ToastContainer />
    </div>
  );
}

export default App;
