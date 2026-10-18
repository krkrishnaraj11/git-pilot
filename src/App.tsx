import { useEffect } from "react";
import { useAppStore, type AppView } from "@/stores/app-store";
import { useAiStore } from "@/stores/ai-store";
import { useSetupStore } from "@/stores/setup-store";
import { TitleBar } from "@/components/TitleBar";
import { Sidebar } from "@/components/Sidebar";
import { FilterBar } from "@/components/FilterBar";
import { IdentitySection } from "@/components/IdentitySection";
import { StatusBar } from "@/components/StatusBar";
import { IdentityManager } from "@/components/IdentityManager";
import { AuditLog } from "@/components/AuditLog";
import { RepoDetail } from "@/components/RepoDetail";
import { ToastContainer } from "@/components/ToastContainer";
import { AiCommitPanel } from "@/components/AiCommitPanel";
import { MergeWizard, RebaseWizard } from "@/components/MergeWizard";
import { BackupManager } from "@/components/BackupManager";
import { SyncModal } from "@/components/SyncModal";
import { SplashScreen } from "@/components/SplashScreen";
import { SetupWizard } from "@/components/SetupWizard";
import { Button, Panel } from "@/components/ui";

function EmptyState() {
  const pickFolder = useAppStore((s) => s.pickFolder);
  const isScanning = useAppStore((s) => s.isScanning);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
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
        <p className="text-muted-2 text-[13px] font-medium">
          {isScanning ? "Scanning for repositories..." : "No repositories loaded"}
        </p>
        <p className="text-muted text-[11px] mt-1">
          {isScanning ? "This may take a moment" : "Select a folder to discover Git repositories"}
        </p>
      </div>
      {!isScanning && (
        <Button variant="primary" onClick={pickFolder}>
          Scan Folder
        </Button>
      )}
      {isScanning && (
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-[11px] text-muted font-mono">Discovering repos...</span>
        </div>
      )}
    </div>
  );
}

function RepositoriesView() {
  const _identityScope = useAppStore((s) => s.identityScope);
  const identities = useAppStore.getState().scopedIdentities();
  const hasRepos = useAppStore((s) => s.allRepos.length > 0);

  if (!hasRepos) return <EmptyState />;

  if (identities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted text-[13px]">No repos match current filters</p>
      </div>
    );
  }

  return (
    <>
      <FilterBar />
      <div className="py-4">
        {identities.map((identity) => (
          <IdentitySection key={identity.id} identity={identity} />
        ))}
      </div>
    </>
  );
}

function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <Panel className="w-[380px] p-10 text-center">
        <h2 className="text-[15px] font-semibold text-text">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">{note}</p>
      </Panel>
    </div>
  );
}

function LibraryView({ view }: { view: AppView }) {
  switch (view) {
    case "library-audit":
      return <PlaceholderPage title="Audit log" note="The full audit trail lands with the library pages — every identity switch, commit and push, timestamped." />;
    case "library-backups":
      return <PlaceholderPage title="Backups" note="Backup branches created before merges and rebases will live here, with one-click restore." />;
    case "library-identities":
      return <PlaceholderPage title="Identity rules" note="Manage identities, colors and matching rules (path prefixes, remote domains) from this page." />;
    default:
      return null;
  }
}

function App() {
  const allRepos = useAppStore((s) => s.allRepos);
  const initializeApp = useAppStore((s) => s.initializeApp);
  const isInitializing = useAppStore((s) => s.isInitializing);
  const view = useAppStore((s) => s.view);

  const selectedRepo = useAppStore((s) => s.selectedRepo);
  const mergeWizardOpen = useAppStore((s) => s.mergeWizardOpen);
  const rebaseWizardOpen = useAppStore((s) => s.rebaseWizardOpen);
  const backupManagerOpen = useAppStore((s) => s.backupManagerOpen);
  const syncOp = useAppStore((s) => s.syncOp);
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
    <div className="flex h-screen flex-col bg-ground">
      <TitleBar />

      <div className="flex min-h-0 flex-1">
        {hasRepos && <Sidebar />}

        <main className="min-w-0 flex-1 overflow-y-auto">
          {view === "repositories" ? (
            <RepositoriesView />
          ) : view === "settings" ? (
            <PlaceholderPage title="Settings" note="AI engine, backup retention and general preferences will live here." />
          ) : (
            <LibraryView view={view} />
          )}
        </main>
      </div>

      <StatusBar />

      {/* Dialogs & overlays */}
      <IdentityManager />
      <AuditLog />
      {selectedRepo && <RepoDetail />}
      {aiPanelOpen && <AiCommitPanel />}
      {mergeWizardOpen && <MergeWizard />}
      {rebaseWizardOpen && <RebaseWizard />}
      {backupManagerOpen && <BackupManager />}
      {syncOp && <SyncModal />}
      <ToastContainer />
    </div>
  );
}

export default App;
