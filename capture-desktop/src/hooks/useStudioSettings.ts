import { useEffect, useState } from "react";

// Interface defining the configuration sync'd across windows
interface StudioSettings {
  screenId: string | null;
  audioInputId: string | null;
  resolution: string | null;
  fps: number | null;
  isStreamingEnabled: boolean;
  rtmpUrl: string;
  streamKey: string;
}

/**
 * useStudioSettings Hook
 * Used in secondary windows (Studio window) to receive real-time setting updates
 * from the main dashboard window via Electron IPC.
 */
export function useStudioSettings() {
  // Local state for settings, synced with main process
  const [settings, setSettings] = useState<StudioSettings>({
    screenId: null,
    audioInputId: null,
    resolution: null,
    fps: null,
    isStreamingEnabled: false,
    rtmpUrl: "rtmp://a.rtmp.youtube.com/live2",
    streamKey: "",
  });

  useEffect(() => {
    /**
     * Callback for setting updates
     * Receives the updated settings object from Electron's main process.
     */
    const handleSettingsUpdate = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const newSettings = args[0] as StudioSettings;
      // Update local state, triggering a re-render in the Studio window
      setSettings(newSettings);
    };

    // Listen for 'settings-updated' broadcast from the Main Process
    if (window.ipcRenderer) {
      window.ipcRenderer.on("settings-updated", handleSettingsUpdate);

      // Cleanup: stop listening when the component (window) is closed
      return () => {
        window.ipcRenderer.off("settings-updated", handleSettingsUpdate);
      };
    }
  }, []);

  return {
    settings,
    setSettings,
  };
}
