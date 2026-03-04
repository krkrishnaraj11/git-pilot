import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AiStatus, AiCommitResult, CommitStyle } from "./types";

interface AiState {
  aiStatus: AiStatus;
  isGenerating: boolean;
  currentMessage: string;
  commitStyle: CommitStyle;
  messageHistory: string[];
  aiPanelOpen: boolean;
  streamError: string | null;
  _listenersReady: boolean;

  // Actions
  checkAiStatus: () => Promise<void>;
  generateCommitMessage: (repoPath: string) => Promise<AiCommitResult | null>;
  generateStreaming: (repoPath: string) => Promise<void>;
  setCommitStyle: (style: CommitStyle) => void;
  setCurrentMessage: (msg: string) => void;
  clearMessage: () => void;
  setAiPanelOpen: (open: boolean) => void;
  acceptMessage: () => string;
  initListeners: () => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  aiStatus: { running: false, model_id: null },
  isGenerating: false,
  currentMessage: "",
  commitStyle: "conventional",
  messageHistory: [],
  aiPanelOpen: false,
  streamError: null,
  _listenersReady: false,

  checkAiStatus: async () => {
    try {
      const status = await invoke<AiStatus>("check_ai_status");
      set({ aiStatus: status });
    } catch (e) {
      console.error("Failed to check AI status:", e);
      set({
        aiStatus: { running: false, model_id: null },
      });
    }
  },

  generateCommitMessage: async (repoPath: string) => {
    const { commitStyle } = get();
    set({ isGenerating: true, currentMessage: "", streamError: null });
    try {
      const result = await invoke<AiCommitResult>("generate_commit_message", {
        repoPath,
        style: commitStyle,
      });
      if (result.success && result.message) {
        set({ currentMessage: result.message });
        set((s) => ({
          messageHistory: [result.message!, ...s.messageHistory].slice(0, 5),
        }));
      } else {
        set({ streamError: result.error || "Generation failed" });
      }
      set({ isGenerating: false });
      return result;
    } catch (e) {
      set({
        isGenerating: false,
        streamError: `Failed: ${e}`,
      });
      return null;
    }
  },

  generateStreaming: async (repoPath: string) => {
    const { commitStyle } = get();
    set({ isGenerating: true, currentMessage: "", streamError: null });
    try {
      await invoke<string>("generate_commit_message_stream", {
        repoPath,
        style: commitStyle,
      });
    } catch (e) {
      set({
        isGenerating: false,
        streamError: `Failed: ${e}`,
      });
    }
  },

  setCommitStyle: (style) => set({ commitStyle: style }),
  setCurrentMessage: (msg) => set({ currentMessage: msg }),
  clearMessage: () => set({ currentMessage: "", streamError: null }),

  setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

  acceptMessage: () => {
    const msg = get().currentMessage;
    if (msg) {
      set((s) => ({
        messageHistory: [msg, ...s.messageHistory].slice(0, 5),
      }));
    }
    return msg;
  },

  initListeners: async () => {
    if (get()._listenersReady) return;
    set({ _listenersReady: true });

    await listen<string>("ai-token", (event) => {
      set((s) => ({ currentMessage: s.currentMessage + event.payload }));
    });

    await listen("ai-done", () => {
      const msg = get().currentMessage;
      set({ isGenerating: false });
      if (msg) {
        set((s) => ({
          messageHistory: [msg, ...s.messageHistory].slice(0, 5),
        }));
      }
    });

    await listen<string>("ai-error", (event) => {
      set({
        isGenerating: false,
        streamError: event.payload,
      });
    });
  },
}));
