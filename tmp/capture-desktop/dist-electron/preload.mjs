"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(
      channel,
      (event, ...args2) => listener(event, ...args2)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  removeListener(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.removeListener(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  },
  // Audio and media permissions
  async requestAudioPermissions() {
    try {
      const micPermission = await navigator.permissions.query({
        name: "microphone"
      });
      const cameraPermission = await navigator.permissions.query({
        name: "camera"
      });
      return {
        microphone: micPermission.state,
        camera: cameraPermission.state
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
  }
  // You can expose other APTs you need here.
  // ...
});
