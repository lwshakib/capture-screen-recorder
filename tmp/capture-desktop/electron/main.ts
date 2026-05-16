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
import { createRequire } from "node:module";
import { Readable } from 'stream';
import type { FfmpegCommand } from 'fluent-ffmpeg';

const _require = createRequire(import.meta.url);
const ffmpeg = _require('fluent-ffmpeg');
const _dirname = path.dirname(fileURLToPath(import.meta.url));

// Polyfill __dirname and __filename for libraries that expect it in a CJS environment
// This is necessary because we are running in an ESM environment (created by Vite)
// but some Electron/Node libraries still rely on CommonJS globals.
// @ts-ignore
globalThis.__dirname = _dirname;
// @ts-ignore
globalThis.__filename = fileURLToPath(import.meta.url);

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
process.env.APP_ROOT = path.join(_dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const studioUrl = VITE_DEV_SERVER_URL + "/studio.html";
const uploadUrl = VITE_DEV_SERVER_URL + "/upload.html";
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Main window reference (The dashboard/landing page)
let mainWindow: BrowserWindow | null;
// Studio window reference (The floating control bar)
let studioWindow: BrowserWindow | null;
// Webcam window reference (The circular camera overlay)
let webcamWindow: BrowserWindow | null;
// System tray icon reference
let tray: Tray | null = null;
// Flag to prevent app from quitting when window is closed (macOS style behavior or minimization)
let isQuiting = false;
// Upload window reference (The post-recording modal)
let uploadWindow: BrowserWindow | null;

// Streaming state
interface StreamConfig {
  rtmpUrl: string;
  streamKey: string;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  resolution: string;
}

let ffmpegCommand: FfmpegCommand | null = null;
let inputStream: Readable | null = null;

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
        // Restore/Show Main Window if it exists
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
        // Restore/Show Studio Window if it exists
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
  // Create the main browser window for the application
  mainWindow = new BrowserWindow({
    icon: nativeImage.createFromPath(
      path.join(process.env.VITE_PUBLIC, "logo.ico")
    ),
    frame: false, // Frameless window for custom styling
    title: "Capture Screen Recorder",
    titleBarStyle: "hidden", // Hide default title bar
    hasShadow: true,
    transparent: true, // Allow transparency in the window
    backgroundColor: "#00000000", // Fully transparent background
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    resizable: false, // Fixed size
    webPreferences: {
      preload: path.join(_dirname, "preload.mjs"), // Preload script for safe IPC communication
      nodeIntegration: false, // Security: Disable Node.js integration in renderer
      contextIsolation: true, // Security: Isolate context to prevent prototype pollution
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

    // Send the auth token to the renderer process
    mainWindow?.webContents.send("auth-token", token);
  });

  // Create win, load the rest of the app, etc...
  app.whenReady().then(() => {
    const ffmpegInstaller = _require('@ffmpeg-installer/ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
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

// IPC Handler: Get available screen/window sources for recording
ipcMain.handle("get-sources", async () => {
  try {
    // desktopCapturer allows Electron to see open windows and screens
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

// IPC Handler: Calculate supported recording resolutions based on current display(s)
ipcMain.handle("get-supported-resolutions", async () => {
  try {
    // Get all connected displays from Electron's screen module
    const displays = screen.getAllDisplays();

    // Create available resolution options based on available displays
    const resolutions: string[] = [];

    displays.forEach((display) => {
      const { width: displayWidth, height: displayHeight } = display.size;

      // Always add the display's native resolution
      resolutions.push(`${displayHeight}p(${displayWidth}x${displayHeight})`);

      // Add common standard resolutions if the display supports them
      if (displayWidth >= 1920 && displayHeight >= 1080) {
        // ... (standard resolutions logic)
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

    // Remove duplicates and sort by resolution height (highest first)
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

// IPC Handler: Open the 'Studio' window (Small floating control bar)
ipcMain.on("open-studio", () => {
  if (studioWindow) return; // Prevent multiple studio windows
  
  studioWindow = new BrowserWindow({
    icon: nativeImage.createFromPath(
      path.join(process.env.VITE_PUBLIC, "logo.ico")
    ),
    frame: false, // Removes the OS window frame for the floating control bar
    title: "Capture Studio - Recording Controls",
    titleBarStyle: "hidden", // Hides native title bar
    hasShadow: false, // Disables shadow for a flat floating UI
    transparent: true, // Enables transparency for custom non-rectangular shapes if needed
    // Center the studio window horizontally
    x: Math.floor(
      (screen.getPrimaryDisplay().workAreaSize.width - STUDIO_WINDOW_WIDTH) / 2
    ),
    y: 5, // Position fixed at the top of the screen
    backgroundColor: "#00000000", // Fully transparent background color
    width: STUDIO_WINDOW_WIDTH, // Fixed width for the control bar
    height: STUDIO_WINDOW_HEIGHT, // Fixed height for the control bar
    fullscreenable: false, // Prevents the window from entering fullscreen mode
    maximizable: false, // Removes the ability to maximize the window
    minimizable: false, // Removes the ability to minimize (managed via tray/main app)
    resizable: false, // Prevents manual resizing of the control UI
    webPreferences: {
      preload: path.join(_dirname, "preload.mjs"),
      nodeIntegration: false, // Security: Disable direct Node access
      contextIsolation: true, // Security: Isolate preload context
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
// IPC Handler: Toggle the webcam overlay window
ipcMain.on("webcam:toggle", (_event, payload: { enabled: boolean }) => {
  if (payload?.enabled) {
    // If webcam window already exists, just show it
    if (webcamWindow && !webcamWindow.isDestroyed()) {
      webcamWindow.show();
      return;
    }

    // Create a new circular/overlay webcam window
    webcamWindow = new BrowserWindow({
      icon: nativeImage.createFromPath(
        path.join(process.env.VITE_PUBLIC, "logo.ico")
      ),
      frame: false, // Removes the OS window frame for a custom overlay
      title: "Capture Webcam - Camera Overlay",
      titleBarStyle: "hidden", // Hides native title bar
      hasShadow: false, // Disables shadow for a flat overlay
      transparent: true, // Enables transparency for custom shapes (e.g., circular webcam)
      backgroundColor: "#00000000", // Fully transparent background
      width: WEBCAM_WINDOW_SIZE, // Fixed width for the webcam overlay
      height: WEBCAM_WINDOW_SIZE, // Fixed height for the webcam overlay
      resizable: false, // Prevents manual resizing
      fullscreenable: false, // Prevents entering fullscreen
      maximizable: false, // Prevents maximizing
      minimizable: false, // Prevents minimizing
      alwaysOnTop: true, // Keep it above other apps
      // Position at bottom-right corner
      x: Math.floor(
        screen.getPrimaryDisplay().workAreaSize.width - WEBCAM_WINDOW_SIZE - 10
      ),
      y: Math.floor(
        screen.getPrimaryDisplay().workAreaSize.height - WEBCAM_WINDOW_SIZE - 10
      ),
      webPreferences: {
        preload: path.join(_dirname, "preload.mjs"),
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

    // Ensure the webcam stays on top even of fullscreen apps
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
    // Hide/Close if disabled
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

// IPC Handler: Receive recording video chunks from renderer
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

      // Create the full file path for dragging saving
      const filePath = path.join(videosDir, data.filename);

      // Convert the data array to a Buffer and append to file
      // This allows writing large files incrementally as chunks arrive
      const buffer = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data);
      fs.appendFileSync(filePath, buffer);

      console.log(`Chunk saved to: ${filePath}`);
    } catch (error) {
      console.error("Error saving recording:", error);
      // Notify the renderer process if saving fails
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

// IPC Handler: Finish recording and open the upload/preview window
ipcMain.on(
  "save-recording",
  (_, data: { data: number[]; filename: string }) => {
    console.log("Received save-recording request:", {
      filename: data.filename,
      dataLength: data.data.length,
    });

    if (uploadWindow && !uploadWindow.isDestroyed()) {
      // If upload window exists, just update it with new data
      const recordingData = {
        type: "video-blob",
        blob: data.data, // This will be converted to Blob in the renderer
        filename: data.filename,
        mimeType: "video/webm", // Default mime type
      };
      
      uploadWindow.webContents.send("recording-data", recordingData);
      uploadWindow.show();
    } else {
      // Create new upload window if it doesn't exist
      // Create new upload window if it doesn't exist
      uploadWindow = new BrowserWindow({
        icon: nativeImage.createFromPath(
          path.join(process.env.VITE_PUBLIC, "logo.ico")
        ),
        frame: false, // Custom UI, no system frame
        title: "Capture Uploading",
        titleBarStyle: "hidden", // Hide native bars
        hasShadow: true, // Drop shadow for depth
        transparent: true, // Allow transparency in background
        backgroundColor: "#00000000",
        width: UPLOAD_WINDOW_WIDTH, // Fixed width for upload modal
        height: UPLOAD_WINDOW_HEIGHT, // Fixed height for upload modal
        resizable: false, // Prevent user resizing as it's a fixed dialog
        fullscreenable: false, // Not meant for fullscreen
        maximizable: false, // Cannot maximize
        minimizable: false, // Cannot minimize (modal behavior)
        webPreferences: {
          preload: path.join(_dirname, "preload.mjs"),
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

      // Send the recording data once the window is actually loaded
      // The 'did-finish-load' event ensures the page is ready to receive data via IPC
      uploadWindow.webContents.on("did-finish-load", () => {
        const recordingData = {
          type: "video-blob",
          blob: data.data, 
          filename: data.filename,
          mimeType: "video/webm",
        };
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

// Live Streaming IPC Handlers
// IPC Handler: Start Live Streaming via FFmpeg
ipcMain.on("streaming:start", (event, config: StreamConfig) => {
  console.log("Starting live stream with config:", config);

  // Stop any existing stream before starting a new one
  if (ffmpegCommand) {
    console.warn("Stream already running, stopping previous one.");
    ffmpegCommand.kill("SIGINT");
    ffmpegCommand = null;
  }

  try {
    // Create a readable stream to feed video data into FFmpeg
    inputStream = new Readable({
      read() {} // No-op, we push data manually
    });

    // Construct the RTMP URL
    const baseUrl = config.rtmpUrl.endsWith('/') ? config.rtmpUrl.slice(0, -1) : config.rtmpUrl;
    const fullRtmpUrl = `${baseUrl}/${config.streamKey}`;
    const [width, height] = config.resolution.split('x').map(num => parseInt(num) || 0);

    // Initial FFmpeg command setup
    ffmpegCommand = ffmpeg(inputStream)
      .inputFormat('webm') // Explicitly tell FFmpeg the input is WebM (from MediaRecorder)
      .inputOptions([
        '-analyzeduration 0', // Reduce delay
        '-probesize 32',      // Reduce delay
        '-fflags +genpts+ignthr', // ignthr helps with erratic timestamps from browser MediaRecorder
        '-thread_queue_size 1024' // Increase buffer to avoid "thread_queue_size" warnings
      ])
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate(config.audioBitrate || '128k')
      .videoBitrate(config.videoBitrate || '2500k')
      .fps(config.fps || 30)
      .size(`${width}x${height}`)
      .outputOptions([
        '-preset ultrafast', // Use lowest CPU usage, sacrificing compression efficiency
        '-tune zerolatency', // Optimize for low latency (essential for live streams)
        `-g ${config.fps * 2}`, // Keyframe interval (GOP size) - 2 seconds usually recommended for streaming
        `-keyint_min ${config.fps}`,
        '-crf 23', // Constant Rate Factor (Quality) - Lower is better. 23 is default for x264.
        '-pix_fmt yuv420p', // Ensure compatibility with most players
        '-sc_threshold 0', // Disable scene change detection
        '-profile:v main', // Main profile is widely supported
        '-level 3.1',
        '-ar 44100', // Audio sample rate
        '-b:a 128k', // Audio bitrate
        '-maxrate 4000k', // Max bitrate burst
        '-bufsize 8000k', // Buffer size for bitrate control
        '-f flv', // FLV container required for RTMP
        '-flvflags no_duration_filesize' // Optimization for streaming
      ])
      .output(fullRtmpUrl)
      // Event Handlers
      .on('start', (commandLine: string) => {
        console.log('FFmpeg process started with command:', commandLine);
        event.reply('streaming:started');
      })
      .on('stderr', (stderrLine: string) => {
        // Log all FFmpeg output for debugging purposes
        if (stderrLine.includes('error') || stderrLine.includes('Error')) {
           console.error('FFmpeg Log:', stderrLine);
        } else {
           console.log('FFmpeg Log:', stderrLine);
        }
      })
      .on('error', (err: Error, stdout: string, stderr: string) => {
        console.error('FFmpeg error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        event.reply('streaming:error', { error: err.message });
        ffmpegCommand = null;
        inputStream = null;
      })
      .on('end', () => {
        console.log('FFmpeg process ended');
        event.reply('streaming:stopped');
        ffmpegCommand = null;
        inputStream = null;
      });

    if (ffmpegCommand) {
      ffmpegCommand.run();
    }
  } catch (error) {
    console.error('Error starting stream:', error);
    event.reply('streaming:error', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// IPC Handler: Receive streaming data chunks from Renderer
ipcMain.on("streaming:data", (_, data: ArrayBuffer) => {
  if (inputStream) {
    try {
      // Push the data chunk into the FFmpeg input stream
      inputStream.push(Buffer.from(data));
    } catch (error) {
      console.error('Error pushing data to FFmpeg:', error);
    }
  }
});

// IPC Handler: Stop the live stream
ipcMain.on("streaming:stop", (event) => {
  console.log("Stopping live stream requested.");
  // Signal EOF to input stream
  if (inputStream) {
    inputStream.push(null);
  }
  // Kill FFmpeg process
  if (ffmpegCommand) {
    ffmpegCommand.kill("SIGINT");
  }
  event.reply('streaming:stopped');
});
