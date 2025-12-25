import { useEffect, useState } from "react";

interface StudioSettings {
  screenId: string | null;
  audioInputId: string | null;
  resolution: string | null;
  fps: number | null;
}

export function useStudioSettings() {
  const [settings, setSettings] = useState<StudioSettings>({
    screenId: null,
    audioInputId: null,
    resolution: null,
    fps: null,
  });

  useEffect(() => {
    // Listen for settings updates from the main window
    const handleSettingsUpdate = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const newSettings = args[0] as StudioSettings;
      setSettings(newSettings);
    };

    // Add event listener for settings updates
    window.ipcRenderer.on("settings-updated", handleSettingsUpdate);

    // Cleanup function
    return () => {
      window.ipcRenderer.off("settings-updated", handleSettingsUpdate);
    };
  }, []);

  return {
    settings,
    setSettings,
  };
}
