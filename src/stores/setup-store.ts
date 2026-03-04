import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ModelOption, DownloadProgress } from "./types";

export type WizardStep =
  | "welcome"
  | "features"
  | "model-select"
  | "downloading"
  | "complete";

interface SetupState {
  wizardStep: WizardStep;
  needsSetup: boolean | null;
  availableModels: ModelOption[];
  selectedModelId: string;
  downloadProgress: DownloadProgress | null;
  isDownloading: boolean;
  downloadError: string | null;
  featureSlideIndex: number;

  // Actions
  checkNeedsSetup: () => Promise<void>;
  loadAvailableModels: () => Promise<void>;
  selectModel: (modelId: string) => void;
  startDownload: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  completeSetup: () => Promise<void>;
  nextFeatureSlide: () => void;
  prevFeatureSlide: () => void;
  setWizardStep: (step: WizardStep) => void;
  initDownloadListener: () => Promise<UnlistenFn[]>;
}

export const useSetupStore = create<SetupState>((set, get) => ({
  wizardStep: "welcome",
  needsSetup: null,
  availableModels: [],
  selectedModelId: "qwen2.5-coder-3b",
  downloadProgress: null,
  isDownloading: false,
  downloadError: null,
  featureSlideIndex: 0,

  checkNeedsSetup: async () => {
    try {
      const val = await invoke<string | null>("get_setting", {
        key: "setup_complete",
      });
      set({ needsSetup: val !== "true" });
    } catch {
      set({ needsSetup: true });
    }
  },

  loadAvailableModels: async () => {
    try {
      const models = await invoke<ModelOption[]>("get_available_models");
      set({ availableModels: models });
    } catch (e) {
      console.error("Failed to load models:", e);
    }
  },

  selectModel: (modelId) => set({ selectedModelId: modelId }),

  startDownload: async () => {
    const { selectedModelId } = get();
    set({
      isDownloading: true,
      downloadError: null,
      downloadProgress: null,
      wizardStep: "downloading",
    });
    try {
      // First ensure llama-server binary is available
      const hasServer = await invoke<boolean>("check_llama_server_binary");
      if (!hasServer) {
        await invoke("ensure_llama_server");
      }
      // Then download the model
      await invoke("download_model", { modelId: selectedModelId });
    } catch (e) {
      set({ downloadError: `${e}`, isDownloading: false });
    }
  },

  cancelDownload: async () => {
    try {
      await invoke("cancel_download");
    } catch (e) {
      console.error("Failed to cancel download:", e);
    }
    set({
      isDownloading: false,
      wizardStep: "model-select",
      downloadProgress: null,
    });
  },

  completeSetup: async () => {
    const { selectedModelId } = get();
    try {
      await invoke("set_setting", {
        key: "setup_complete",
        value: "true",
      });
      await invoke("set_setting", {
        key: "active_model",
        value: selectedModelId,
      });
      // Ensure llama-server binary is available, then start it
      await invoke("ensure_llama_server");
      await invoke("start_llama_server", { modelId: selectedModelId });
    } catch (e) {
      console.error("Failed to complete setup:", e);
    }
    set({ needsSetup: false, wizardStep: "complete" });
  },

  nextFeatureSlide: () =>
    set((s) => ({
      featureSlideIndex: Math.min(s.featureSlideIndex + 1, 3),
    })),

  prevFeatureSlide: () =>
    set((s) => ({
      featureSlideIndex: Math.max(s.featureSlideIndex - 1, 0),
    })),

  setWizardStep: (step) => set({ wizardStep: step }),

  initDownloadListener: async () => {
    const unlisten1 = await listen<DownloadProgress>(
      "model-download-progress",
      (event) => {
        set({ downloadProgress: event.payload });
        if (event.payload.percent >= 100) {
          set({ isDownloading: false, wizardStep: "complete" });
        }
      }
    );

    const unlisten2 = await listen<string>(
      "model-download-error",
      (event) => {
        set({
          isDownloading: false,
          downloadError: event.payload,
        });
      }
    );

    return [unlisten1, unlisten2];
  },
}));
