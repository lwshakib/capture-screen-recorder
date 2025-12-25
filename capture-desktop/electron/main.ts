import "dotenv/config";
import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray,
} from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAIN_WINDOW_WIDTH = 360;
const MAIN_WINDOW_HEIGHT = 780;
const STUDIO_WINDOW_WIDTH = 300;
const STUDIO_WINDOW_HEIGHT = 48;
const WEBCAM_WINDOW_SIZE = 220;
const UPLOAD_WINDOW_WIDTH = 500;
const UPLOAD_WINDOW_HEIGHT = 200;

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const studioUrl = VITE_DEV_SERVER_URL + "/studio.html";
const uploadUrl = VITE_DEV_SERVER_URL + "/upload.html";
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let mainWindow: BrowserWindow | null;
let studioWindow: BrowserWindow | null;
let webcamWindow: BrowserWindow | null;
let tray: Tray | null = null;
let isQuiting = false;
let uploadWindow: BrowserWindow | null;

function createTray() {
  if (tray) {
    tray.destroy();
  }

  // Use the PNG logo from public directory
  const iconPath = path.join(process.env.VITE_PUBLIC, "logo.ico");
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open App",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
        if (studioWindow && !studioWindow.isDestroyed()) {
          studioWindow.show();
        }
      },
    },
    {
      label: "Quit App",
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Capture desktop");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
    if (studioWindow && !studioWindow.isDestroyed()) {
      studioWindow.show();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: nativeImage.createFromPath(
      path.join(process.env.VITE_PUBLIC, "logo.ico")
    ),
    frame: false,
    title: "Capture Screen Recorder",
    titleBarStyle: "hidden",
    hasShadow: true,
    transparent: true,
    backgroundColor: "#00000000",
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Test active push message to Renderer-process.
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send(
      "main-process-message",
      new Date().toLocaleString()
    );
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // mainWindow.loadFile('dist/index.html')
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  mainWindow.on("close", (e) => {
    if (!isQuiting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuiting = true;
    app.quit();
    mainWindow = null;
    studioWindow = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(
      "capture-screen-recorder",
      process.execPath,
      [path.resolve(process.argv[1])]
    );
  }
} else {
  app.setAsDefaultProtocolClient("capture-screen-recorder");
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // the commandLine is array of strings in which last element is deep link url
    const token = commandLine.pop()?.split("=").pop();

    mainWindow?.webContents.send("auth-token", token);
  });

  // Create win, load the rest of the app, etc...
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

// IPC handlers
ipcMain.on("closeApp", () => {
  isQuiting = true;
  app.quit();
});

ipcMain.on("login", (_, redirectUrl: string) => {
  // Use dot notation so Vite's define can replace it at build time
  try {
    console.log("Opening login URL:", redirectUrl);
    shell.openExternal(redirectUrl);
  } catch (error) {
    console.error("Error opening login URL:", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("login-error", {
        message:
          error instanceof Error ? error.message : "Failed to open login page",
      });
    }
  }
});

ipcMain.handle("get-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 240, height: 135 },
      fetchWindowIcons: true,
    });
    return sources;
  } catch (error) {
    console.error("Error getting desktop sources:", error);
    return [];
  }
});

ipcMain.handle("get-supported-resolutions", async () => {
  try {
    // Get all displays
    const displays = screen.getAllDisplays();

    // Create resolution options based on available displays
    const resolutions: string[] = [];

    displays.forEach((display) => {
      const { width: displayWidth, height: displayHeight } = display.size;

      // Add native resolution
      resolutions.push(`${displayHeight}p(${displayWidth}x${displayHeight})`);

      // Add common lower resolutions that are supported
      if (displayWidth >= 1920 && displayHeight >= 1080) {
        resolutions.push("1080p(1920x1080)");
        resolutions.push("720p(1280x720)");
        resolutions.push("480p(854x480)");
        resolutions.push("360p(640x360)");
        resolutions.push("240p(426x240)");
        resolutions.push("144p(256x144)");
      } else if (displayWidth >= 1280 && displayHeight >= 720) {
        resolutions.push("720p(1280x720)");
        resolutions.push("480p(854x480)");
        resolutions.push("360p(640x360)");
        resolutions.push("240p(426x240)");
        resolutions.push("144p(256x144)");
      } else if (displayWidth >= 854 && displayHeight >= 480) {
        resolutions.push("480p(854x480)");
        resolutions.push("360p(640x360)");
        resolutions.push("240p(426x240)");
        resolutions.push("144p(256x144)");
      } else if (displayWidth >= 640 && displayHeight >= 360) {
        resolutions.push("360p(640x360)");
        resolutions.push("240p(426x240)");
        resolutions.push("144p(256x144)");
      } else if (displayWidth >= 426 && displayHeight >= 240) {
        resolutions.push("240p(426x240)");
        resolutions.push("144p(256x144)");
      } else if (displayWidth >= 256 && displayHeight >= 144) {
        resolutions.push("144p(256x144)");
      }
    });

    // Remove duplicates and sort by resolution (highest first)
    const uniqueResolutions = [...new Set(resolutions)].sort((a, b) => {
      const heightA = parseInt(a.match(/(\d+)p/)?.[1] || "0");
      const heightB = parseInt(b.match(/(\d+)p/)?.[1] || "0");
      return heightB - heightA;
    });

    return uniqueResolutions;
  } catch (error) {
    console.error("Error getting supported resolutions:", error);
    // Fallback to basic resolutions if error occurs
    return [
      "720p(1280x720)",
      "480p(854x480)",
      "360p(640x360)",
      "240p(426x240)",
      "144p(256x144)",
    ];
  }
});

ipcMain.on("logout", () => {
  studioWindow?.close();
});

ipcMain.on("open-studio", () => {
  if (studioWindow) return;
  studioWindow = new BrowserWindow({
    icon: nativeImage.createFromPath(
      path.join(process.env.VITE_PUBLIC, "logo.ico")
    ),
    frame: false,
    title: "Capture Studio - Recording Controls",
    titleBarStyle: "hidden",
    hasShadow: false,
    transparent: true,
    x: Math.floor(
      (screen.getPrimaryDisplay().workAreaSize.width - STUDIO_WINDOW_WIDTH) / 2
    ),
    y: 5,
    backgroundColor: "#00000000",
    width: STUDIO_WINDOW_WIDTH,
    height: STUDIO_WINDOW_HEIGHT,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  studioWindow?.loadURL(studioUrl);
  studioWindow.webContents.openDevTools({ mode: "detach" });
});

// Handle theme synchronization between windows
ipcMain.on("theme-changed", (_, theme) => {
  // Broadcast theme change to all windows
  const windows = BrowserWindow.getAllWindows();
  console.log("theme-changed", theme);
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send("theme-changed", theme);
    }
  });
});

// Handle settings synchronization to studio window
ipcMain.on("settings-changed", (_, settings) => {
  if (studioWindow && !studioWindow.isDestroyed()) {
    studioWindow.webContents.send("settings-updated", settings);
  }
});

// Toggle webcam window
ipcMain.on("webcam:toggle", (_event, payload: { enabled: boolean }) => {
  if (payload?.enabled) {
    if (webcamWindow && !webcamWindow.isDestroyed()) {
      webcamWindow.show();
      return;
    }
    webcamWindow = new BrowserWindow({
      icon: nativeImage.createFromPath(
        path.join(process.env.VITE_PUBLIC, "logo.ico")
      ),
      frame: false,
      title: "Capture Webcam - Camera Overlay",
      titleBarStyle: "hidden",
      hasShadow: false,
      transparent: true,
      backgroundColor: "#00000000",
      width: WEBCAM_WINDOW_SIZE,
      height: WEBCAM_WINDOW_SIZE,
      resizable: false,
      fullscreenable: false,
      maximizable: false,
      minimizable: false,
      alwaysOnTop: true,
      x: Math.floor(
        screen.getPrimaryDisplay().workAreaSize.width - WEBCAM_WINDOW_SIZE - 10
      ),
      y: Math.floor(
        screen.getPrimaryDisplay().workAreaSize.height - WEBCAM_WINDOW_SIZE - 10
      ),
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    if (VITE_DEV_SERVER_URL) {
      const camUrl = new URL("webcam.html", VITE_DEV_SERVER_URL).toString();
      webcamWindow.loadURL(camUrl);
    } else {
      webcamWindow.loadFile(path.join(RENDERER_DIST, "webcam.html"));
    }

    // Keep above other windows and visible over fullscreen if possible
    webcamWindow.setAlwaysOnTop(true, "screen-saver");
    try {
      webcamWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
    } catch (_) {
      // older Electron versions may not support the options signature
      webcamWindow.setVisibleOnAllWorkspaces(true);
    }
  } else {
    if (webcamWindow && !webcamWindow.isDestroyed()) {
      webcamWindow.close();
      webcamWindow = null;
    }
  }
});

ipcMain.on("hideToTray", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
  if (studioWindow && !studioWindow.isDestroyed()) {
    studioWindow.hide();
  }
});

// Hide main window when recording starts
ipcMain.on("recording:started", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});

// Show main window when recording stops
ipcMain.on("recording:stopped", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
});

ipcMain.on(
  "recording:data-available",
  async (_, data: { data: []; filename: string }) => {
    try {
      // Get the user's Videos directory
      const videosDir = path.join(app.getPath("videos"), "Capture");

      // Create Capture directory if it doesn't exist
      if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
      }

      // Create the full file path
      const filePath = path.join(videosDir, data.filename);

      // Convert the data array to a Buffer and write to file
      const buffer = Buffer.from(data.data);
      fs.writeFileSync(filePath, buffer);

      console.log(`Recording saved successfully to: ${filePath}`);
    } catch (error) {
      console.error("Error saving recording:", error);
      // Optionally notify the renderer process about the error
      if (uploadWindow && !uploadWindow.isDestroyed()) {
        uploadWindow.webContents.send("recording-save-error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }
);

ipcMain.on("open-this", (_, url: string) => {
  shell.openExternal(url);
  if (uploadWindow) {
    uploadWindow.hide();
  }
});

ipcMain.on("open-url", (_, url: string) => {
  console.log("Opening URL:", url);
  shell.openExternal(url);
  if (uploadWindow) {
    uploadWindow.hide();
  }
});

ipcMain.on(
  "save-recording",
  (_, data: { data: number[]; filename: string }) => {
    console.log("Received save-recording request:", {
      filename: data.filename,
      dataLength: data.data.length,
    });

    if (uploadWindow && !uploadWindow.isDestroyed()) {
      // Convert the data array back to a format the upload app can use
      const recordingData = {
        type: "video-blob",
        blob: data.data, // This will be converted to Blob in the renderer
        filename: data.filename,
        mimeType: "video/webm", // Default mime type, adjust if needed
      };
      console.log(
        "Sending recording data to existing upload window:",
        recordingData
      );
      uploadWindow.webContents.send("recording-data", recordingData);
      uploadWindow.show();
    } else {
      uploadWindow = new BrowserWindow({
        icon: nativeImage.createFromPath(
          path.join(process.env.VITE_PUBLIC, "logo.ico")
        ),
        frame: false,
        title: "Capture Uploading",
        titleBarStyle: "hidden",
        hasShadow: true,
        transparent: true,
        backgroundColor: "#00000000",
        width: UPLOAD_WINDOW_WIDTH,
        height: UPLOAD_WINDOW_HEIGHT,
        resizable: false,
        fullscreenable: false,
        maximizable: false,
        minimizable: false,
        webPreferences: {
          preload: path.join(__dirname, "preload.mjs"),
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          allowRunningInsecureContent: false,
        },
      });

      // Load the upload page
      if (VITE_DEV_SERVER_URL) {
        uploadWindow.loadURL(uploadUrl);
        uploadWindow.webContents.openDevTools({ mode: "detach" });
      } else {
        uploadWindow.loadFile(path.join(RENDERER_DIST, "upload.html"));
      }

      // Send the recording data once the window is ready
      uploadWindow.webContents.on("did-finish-load", () => {
        const recordingData = {
          type: "video-blob",
          blob: data.data, // This will be converted to Blob in the renderer
          filename: data.filename,
          mimeType: "video/webm", // Default mime type, adjust if needed
        };
        console.log(
          "Sending recording data to new upload window:",
          recordingData
        );
        uploadWindow?.webContents.send("recording-data", recordingData);
      });

      // Handle window close
      uploadWindow.on("closed", () => {
        uploadWindow = null;
      });
    }
  }
);

// Handle upload window close
ipcMain.on("close-upload-window", () => {
  if (uploadWindow && !uploadWindow.isDestroyed()) {
    uploadWindow.destroy();
    uploadWindow = null;
  }
});

// Handle upload window minimize
ipcMain.on("minimize-upload-window", () => {
  if (uploadWindow && !uploadWindow.isDestroyed()) {
    uploadWindow.minimize();
  }
});
