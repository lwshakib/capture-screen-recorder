import axios from "axios";
import { create } from "zustand";
import { logger } from "../lib/logger";
import { env } from "../lib/env";

/**
 * User Type definition
 * Represents the authenticated user's profile information.
 */
type User = {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  image: string;
};

// Resolution options supported by the app
type ResolutionOption = string;

/**
 * RecorderState Type definition
 * Global state for the entire recording application using Zustand.
 */
type RecorderState = {
  // User Management
  user: User | null;
  setUser: (user: User) => void;
  token: string | null;
  setToken: (token: string) => void;
  getUser: (token: string) => Promise<void>; // Fetches user data from backend
  logout: () => void; // Clears session and notifies main process
  isUserLoading: boolean;
  setIsUserLoading: (isUserLoading: boolean) => void;

  // Media Management (Screens/Windows)
  screens: Electron.DesktopCapturerSource[];
  setScreens: (screens: Electron.DesktopCapturerSource[]) => void;
  getScreens: () => Promise<void>; // Invokes main process to get available capture sources
  isScreensLoading: boolean;
  setIsScreensLoading: (isScreensLoading: boolean) => void;

  // Media Management (Audio/Microphones)
  audioInputs: MediaDeviceInfo[];
  setAudioInputs: (audioInputs: MediaDeviceInfo[]) => void;
  getAudioInputs: () => Promise<void>; // Uses browser API to list microphones
  isAudioInputsLoading: boolean;
  setIsAudioInputsLoading: (isAudioInputsLoading: boolean) => void;

  // Configuration (Resolutions & FPS)
  resolutions: ResolutionOption[];
  setResolutions: (resolutions: ResolutionOption[]) => void;
  getSupportedResolutions: () => Promise<void>; // Gets hardware-supported scale factors
  isResolutionsLoading: boolean;
  setIsResolutionsLoading: (isResolutionsLoading: boolean) => void;

  // Active Settings (Shared across windows)
  settings: {
    screenId: string | null;
    audioInputId: string | null;
    resolution: string | null;
    fps: number | null;
    isStreamingEnabled: boolean;
    rtmpUrl: string;
    streamKey: string;
  };
  // Updater for settings with support for functional updates
  setSettings: (
    settings:
      | {
          screenId: string | null;
          audioInputId: string | null;
          resolution: string | null;
          fps: number | null;
          isStreamingEnabled: boolean;
          rtmpUrl: string;
          streamKey: string;
        }
      | ((prev: {
          screenId: string | null;
          audioInputId: string | null;
          resolution: string | null;
          fps: number | null;
          isStreamingEnabled: boolean;
          rtmpUrl: string;
          streamKey: string;
        }) => {
          screenId: string | null;
          audioInputId: string | null;
          resolution: string | null;
          fps: number | null;
          isStreamingEnabled: boolean;
          rtmpUrl: string;
          streamKey: string;
        })
  ) => void;
};

/**
 * useRecorderContext Store
 * Implemention of the global state store using Zustand.
 */
export const useRecorderContext = create<RecorderState>()((set) => ({
  user: null,
  setUser: (user: User) => set({ user }),
  token: null,
  setToken: (token: string) => set({ token }),
  
  // Fetches detailed user information using the JWT token
  getUser: async (token: string) => {
    try {
      set({ isUserLoading: true });
      // Remove potential wrapping quotes from the token string
      const cleanToken = token.replace(/^["']+|["']+$/g, "");
      const { data } = await axios.get<{ user: User }>(
        `${env.VITE_WEB_URL}/api/token/users`,
        {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      set({ user: data.user });
      logger.info("User fetched successfully", { userId: data.user.id });
    } catch (error) {
      logger.error("Error fetching user", error);
      // Fallback: clear user state on failure to maintain security
      set({ user: null });
    } finally {
      set({ isUserLoading: false });
    }
  },

  // Performs logout by cleaning local state and storage
  logout: () => {
    // Clear in-memory state
    set({ user: null, token: null, isUserLoading: false });
    // Remove persistent token
    localStorage.removeItem("auth-token-v2");
    // Notify Electron main process to handle backend session cleanup or redirects
    window.ipcRenderer.send("logout");
  },

  isUserLoading: false,
  setIsUserLoading: (isUserLoading: boolean) => set({ isUserLoading }),
  screens: [],
  setScreens: (screens: Electron.DesktopCapturerSource[]) => set({ screens }),
  audioInputs: [],
  setAudioInputs: (audioInputs: MediaDeviceInfo[]) => set({ audioInputs }),

  // Fetches list of available screens/windows from the operating system
  getScreens: async () => {
    try {
      set({ isScreensLoading: true });
      // Invoke Electron main process (IPC) to get sources
      const sources = await window.ipcRenderer.invoke<
        Electron.DesktopCapturerSource[]
      >("get-sources");
      set({ screens: sources });
      logger.debug("Screens fetched", { count: sources.length });
    } catch (error) {
      logger.error("Error fetching screens", error);
      set({ screens: [] });
    } finally {
      set({ isScreensLoading: false });
    }
  },

  // Enumerates available audio recording devices (Microphones)
  getAudioInputs: async () => {
    try {
      set({ isAudioInputsLoading: true });
      // Use standard browser navigator API
      const enumerateDevices =
        await window.navigator.mediaDevices.enumerateDevices();
      const audioInputs = enumerateDevices.filter(
        (device) => device.kind === "audioinput"
      );
      set({ audioInputs });
      logger.debug("Audio inputs fetched", { count: audioInputs.length });
    } catch (error) {
      logger.error("Error fetching audio inputs", error);
      set({ audioInputs: [] });
    } finally {
      set({ isAudioInputsLoading: false });
    }
  },

  // Fetches resolution scale factors supported by the primary display
  getSupportedResolutions: async () => {
    set({ isResolutionsLoading: true });
    try {
      // IPC call to main process which calculates supported dimensions
      const supportedResolutions = await window.ipcRenderer.invoke<string[]>(
        "get-supported-resolutions"
      );
      set({ resolutions: supportedResolutions });
      logger.debug("Supported resolutions fetched", {
        count: supportedResolutions.length,
      });
    } catch (error) {
      logger.error("Failed to get supported resolutions", error);
      // Hardcoded fallback list in case logic fails
      set({
        resolutions: [
          "720p(1280x720)",
          "480p(854x480)",
          "360p(640x360)",
          "240p(426x240)",
          "144p(256x144)",
        ],
      });
    } finally {
      set({ isResolutionsLoading: false });
    }
  },

  isScreensLoading: false,
  setIsScreensLoading: (isScreensLoading: boolean) => set({ isScreensLoading }),
  isAudioInputsLoading: false,
  setIsAudioInputsLoading: (isAudioInputsLoading: boolean) =>
    set({ isAudioInputsLoading }),
  isResolutionsLoading: false,
  setIsResolutionsLoading: (isResolutionsLoading: boolean) =>
    set({ isResolutionsLoading }),
  resolutions: [],
  setResolutions: (resolutions: ResolutionOption[]) => set({ resolutions }),

  // Shared configuration for recording and streaming
  settings: {
    screenId: null,
    audioInputId: null,
    resolution: null,
    fps: null,
    isStreamingEnabled: false,
    rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
    streamKey: "",
  },

  // Updates settings, supporting both direct objects and functional updates
  setSettings: (
    settings:
      | {
          screenId: string | null;
          audioInputId: string | null;
          resolution: string | null;
          fps: number | null;
          isStreamingEnabled: boolean;
          rtmpUrl: string;
          streamKey: string;
        }
      | ((prev: {
          screenId: string | null;
          audioInputId: string | null;
          resolution: string | null;
          fps: number | null;
          isStreamingEnabled: boolean;
          rtmpUrl: string;
          streamKey: string;
        }) => {
          screenId: string | null;
          audioInputId: string | null;
          resolution: string | null;
          fps: number | null;
          isStreamingEnabled: boolean;
          rtmpUrl: string;
          streamKey: string;
        })
  ) =>
    set((state) => ({
      settings:
        typeof settings === "function" ? settings(state.settings) : settings,
    })),
}));
