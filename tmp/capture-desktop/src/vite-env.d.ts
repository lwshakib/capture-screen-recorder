/// <reference types="vite/client" />

interface Window {
  ipcRenderer: {
    on(
      channel: string,
      listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
    ): void;
    off(
      channel: string,
      listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
    ): void;
    removeListener(
      channel: string,
      listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
    ): void;
    send(channel: string, ...args: unknown[]): void;
    invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
    requestAudioPermissions(): Promise<{
      microphone: PermissionState;
      camera: PermissionState;
    }>;
    getAudioDevices(): Promise<MediaDeviceInfo[]>;
  };
}