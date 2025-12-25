import { contextBridge, ipcRenderer } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  removeListener(...args: Parameters<typeof ipcRenderer.removeListener>) {
    const [channel, ...omit] = args;
    return ipcRenderer.removeListener(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // Audio and media permissions
  async requestAudioPermissions() {
    try {
      // Request microphone permission
      const micPermission = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      // Request camera permission (for screen capture)
      const cameraPermission = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });

      return {
        microphone: micPermission.state,
        camera: cameraPermission.state,
      };
    } catch (error) {
      console.warn("Permission query failed:", error);
      return { microphone: "unknown", camera: "unknown" };
    }
  },

  // Check if audio devices are available
  async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      console.warn("Failed to enumerate audio devices:", error);
      return [];
    }
  },

  // You can expose other APTs you need here.
  // ...
});
