import axios from "axios";
import { create } from "zustand";
import { logger } from "../lib/logger";
import { env } from "../lib/env";

type User = {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  image: string;
};

// Resolution options supported by the app
type ResolutionOption = string;

type RecorderState = {
  user: User | null;
  setUser: (user: User) => void;
  token: string | null;
  setToken: (token: string) => void;
  getUser: (token: string) => Promise<void>;
  logout: () => void;
  isUserLoading: boolean;
  setIsUserLoading: (isUserLoading: boolean) => void;
  screens: Electron.DesktopCapturerSource[];
  setScreens: (screens: Electron.DesktopCapturerSource[]) => void;
  audioInputs: MediaDeviceInfo[];
  setAudioInputs: (audioInputs: MediaDeviceInfo[]) => void;
  getScreens: () => Promise<void>;
  getAudioInputs: () => Promise<void>;
  getSupportedResolutions: () => Promise<void>;
  isScreensLoading: boolean;
  setIsScreensLoading: (isScreensLoading: boolean) => void;
  isAudioInputsLoading: boolean;
  setIsAudioInputsLoading: (isAudioInputsLoading: boolean) => void;
  isResolutionsLoading: boolean;
  setIsResolutionsLoading: (isResolutionsLoading: boolean) => void;
  resolutions: ResolutionOption[];
  setResolutions: (resolutions: ResolutionOption[]) => void;
  settings: {
    screenId: string | null;
    audioInputId: string | null;
    resolution: string | null;
    fps: number | null;
    isStreamingEnabled: boolean;
    rtmpUrl: string;
    streamKey: string;
  };
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

export const useRecorderContext = create<RecorderState>()((set) => ({
  user: null,
  setUser: (user: User) => set({ user }),
  token: null,
  setToken: (token: string) => set({ token }),
  getUser: async (token: string) => {
    try {
      set({ isUserLoading: true });
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
      // Reset user state on error
      set({ user: null });
    } finally {
      set({ isUserLoading: false });
    }
  },
  logout: () => {
    // Clear user data and token from state
    set({ user: null, token: null, isUserLoading: false });
    // Clear token from localStorage
    localStorage.removeItem("auth-token-v2");
    window.ipcRenderer.send("logout");
  },
  isUserLoading: false,
  setIsUserLoading: (isUserLoading: boolean) => set({ isUserLoading }),
  screens: [],
  setScreens: (screens: Electron.DesktopCapturerSource[]) => set({ screens }),
  audioInputs: [],
  setAudioInputs: (audioInputs: MediaDeviceInfo[]) => set({ audioInputs }),
  getScreens: async () => {
    try {
      set({ isScreensLoading: true });
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
  getAudioInputs: async () => {
    try {
      set({ isAudioInputsLoading: true });
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
  getSupportedResolutions: async () => {
    set({ isResolutionsLoading: true });
    try {
      const supportedResolutions = await window.ipcRenderer.invoke<string[]>(
        "get-supported-resolutions"
      );
      set({ resolutions: supportedResolutions });
      logger.debug("Supported resolutions fetched", {
        count: supportedResolutions.length,
      });
    } catch (error) {
      logger.error("Failed to get supported resolutions", error);
      // Fallback to basic resolutions if error occurs
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
  settings: {
    screenId: null,
    audioInputId: null,
    resolution: null,
    fps: null,
    isStreamingEnabled: false,
    rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
    streamKey: "",
  },
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
