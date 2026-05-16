import { contextBridge, ipcRenderer } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  // Listens to a channel, when a new message arrives listener would be called with listener(event, args...)
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  // Removes the specified listener from the listener array for the specified channel
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  // Removes all listeners, or those of the specified 'channel'
  removeListener(...args: Parameters<typeof ipcRenderer.removeListener>) {
    const [channel, ...omit] = args;
    return ipcRenderer.removeListener(channel, ...omit);
  },
  // Asynchronously sends a message to the main process via channel, along with arguments
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  // Sends a message to the main process via channel and expect a result asynchronously
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // Audio and media permissions helper
  // This helps check if the user has granted access to microphone/camera
  async requestAudioPermissions() {
    try {
      // Request microphone permission status
      const micPermission = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      // Request camera permission status (required for screen capture in some contexts)
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

  // Check if audio input devices (microphones) are available
  // Returns a list of available audio input devices
  async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Filter to only include audio input devices
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      console.warn("Failed to enumerate audio devices:", error);
      return [];
    }
  },

  // You can expose other APTs you need here.
  // ...
});
