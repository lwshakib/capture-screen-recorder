import require$$0 from "fs";
import require$$1 from "path";
import { app, BrowserWindow, ipcMain, shell, desktopCapturer, screen, nativeImage, Tray, Menu } from "electron";
import fs$1 from "node:fs";
import path$1 from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Readable } from "stream";
var main = {};
const fs = require$$0;
const path = require$$1;
function log(message) {
  console.log(`[dotenv][DEBUG] ${message}`);
}
const NEWLINE = "\n";
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
const RE_NEWLINES = /\\n/g;
const NEWLINES_MATCH = /\r\n|\n|\r/;
function parse(src, options2) {
  const debug = Boolean(options2 && options2.debug);
  const obj = {};
  src.toString().split(NEWLINES_MATCH).forEach(function(line, idx) {
    const keyValueArr = line.match(RE_INI_KEY_VAL);
    if (keyValueArr != null) {
      const key = keyValueArr[1];
      let val = keyValueArr[2] || "";
      const end = val.length - 1;
      const isDoubleQuoted = val[0] === '"' && val[end] === '"';
      const isSingleQuoted = val[0] === "'" && val[end] === "'";
      if (isSingleQuoted || isDoubleQuoted) {
        val = val.substring(1, end);
        if (isDoubleQuoted) {
          val = val.replace(RE_NEWLINES, NEWLINE);
        }
      } else {
        val = val.trim();
      }
      obj[key] = val;
    } else if (debug) {
      log(`did not match key and value when parsing line ${idx + 1}: ${line}`);
    }
  });
  return obj;
}
function config(options2) {
  let dotenvPath = path.resolve(process.cwd(), ".env");
  let encoding = "utf8";
  let debug = false;
  if (options2) {
    if (options2.path != null) {
      dotenvPath = options2.path;
    }
    if (options2.encoding != null) {
      encoding = options2.encoding;
    }
    if (options2.debug != null) {
      debug = true;
    }
  }
  try {
    const parsed = parse(fs.readFileSync(dotenvPath, { encoding }), { debug });
    Object.keys(parsed).forEach(function(key) {
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
        process.env[key] = parsed[key];
      } else if (debug) {
        log(`"${key}" is already defined in \`process.env\` and will not be overwritten`);
      }
    });
    return { parsed };
  } catch (e) {
    return { error: e };
  }
}
main.config = config;
main.parse = parse;
const options = {};
if (process.env.DOTENV_CONFIG_ENCODING != null) {
  options.encoding = process.env.DOTENV_CONFIG_ENCODING;
}
if (process.env.DOTENV_CONFIG_PATH != null) {
  options.path = process.env.DOTENV_CONFIG_PATH;
}
if (process.env.DOTENV_CONFIG_DEBUG != null) {
  options.debug = process.env.DOTENV_CONFIG_DEBUG;
}
var envOptions = options;
const re = /^dotenv_config_(encoding|path|debug)=(.+)$/;
var cliOptions = function optionMatcher(args) {
  return args.reduce(function(acc, cur) {
    const matches = cur.match(re);
    if (matches) {
      acc[matches[1]] = matches[2];
    }
    return acc;
  }, {});
};
(function() {
  main.config(
    Object.assign(
      {},
      envOptions,
      cliOptions(process.argv)
    )
  );
})();
const _require = createRequire(import.meta.url);
const ffmpeg = _require("fluent-ffmpeg");
const _dirname = path$1.dirname(fileURLToPath(import.meta.url));
globalThis.__dirname = _dirname;
globalThis.__filename = fileURLToPath(import.meta.url);
const MAIN_WINDOW_WIDTH = 360;
const MAIN_WINDOW_HEIGHT = 780;
const STUDIO_WINDOW_WIDTH = 300;
const STUDIO_WINDOW_HEIGHT = 48;
const WEBCAM_WINDOW_SIZE = 220;
const UPLOAD_WINDOW_WIDTH = 500;
const UPLOAD_WINDOW_HEIGHT = 200;
process.env.APP_ROOT = path$1.join(_dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const studioUrl = VITE_DEV_SERVER_URL + "/studio.html";
const uploadUrl = VITE_DEV_SERVER_URL + "/upload.html";
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow;
let studioWindow;
let webcamWindow;
let tray = null;
let isQuiting = false;
let uploadWindow;
let ffmpegCommand = null;
let inputStream = null;
function createTray() {
  if (tray) {
    tray.destroy();
  }
  const iconPath = path$1.join(process.env.VITE_PUBLIC, "logo.ico");
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
      }
    },
    {
      label: "Quit App",
      click: () => {
        isQuiting = true;
        app.quit();
      }
    }
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
      path$1.join(process.env.VITE_PUBLIC, "logo.ico")
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
      preload: path$1.join(_dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
  mainWindow.on("close", (e) => {
    if (!isQuiting) {
      e.preventDefault();
      mainWindow == null ? void 0 : mainWindow.hide();
    }
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuiting = true;
    app.quit();
    mainWindow = null;
    studioWindow = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(
      "capture-screen-recorder",
      process.execPath,
      [path$1.resolve(process.argv[1])]
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
    var _a;
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const token = (_a = commandLine.pop()) == null ? void 0 : _a.split("=").pop();
    mainWindow == null ? void 0 : mainWindow.webContents.send("auth-token", token);
  });
  app.whenReady().then(() => {
    const ffmpegInstaller = _require("@ffmpeg-installer/ffmpeg");
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    createWindow();
    createTray();
  });
}
ipcMain.on("closeApp", () => {
  isQuiting = true;
  app.quit();
});
ipcMain.on("login", (_, redirectUrl) => {
  try {
    console.log("Opening login URL:", redirectUrl);
    shell.openExternal(redirectUrl);
  } catch (error) {
    console.error("Error opening login URL:", error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("login-error", {
        message: error instanceof Error ? error.message : "Failed to open login page"
      });
    }
  }
});
ipcMain.handle("get-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen", "window"],
      thumbnailSize: { width: 240, height: 135 },
      fetchWindowIcons: true
    });
    return sources;
  } catch (error) {
    console.error("Error getting desktop sources:", error);
    return [];
  }
});
ipcMain.handle("get-supported-resolutions", async () => {
  try {
    const displays = screen.getAllDisplays();
    const resolutions = [];
    displays.forEach((display) => {
      const { width: displayWidth, height: displayHeight } = display.size;
      resolutions.push(`${displayHeight}p(${displayWidth}x${displayHeight})`);
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
    const uniqueResolutions = [...new Set(resolutions)].sort((a, b) => {
      var _a, _b;
      const heightA = parseInt(((_a = a.match(/(\d+)p/)) == null ? void 0 : _a[1]) || "0");
      const heightB = parseInt(((_b = b.match(/(\d+)p/)) == null ? void 0 : _b[1]) || "0");
      return heightB - heightA;
    });
    return uniqueResolutions;
  } catch (error) {
    console.error("Error getting supported resolutions:", error);
    return [
      "720p(1280x720)",
      "480p(854x480)",
      "360p(640x360)",
      "240p(426x240)",
      "144p(256x144)"
    ];
  }
});
ipcMain.on("logout", () => {
  studioWindow == null ? void 0 : studioWindow.close();
});
ipcMain.on("open-studio", () => {
  if (studioWindow) return;
  studioWindow = new BrowserWindow({
    icon: nativeImage.createFromPath(
      path$1.join(process.env.VITE_PUBLIC, "logo.ico")
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
      preload: path$1.join(_dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  studioWindow == null ? void 0 : studioWindow.loadURL(studioUrl);
  studioWindow.webContents.openDevTools({ mode: "detach" });
});
ipcMain.on("theme-changed", (_, theme) => {
  const windows = BrowserWindow.getAllWindows();
  console.log("theme-changed", theme);
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send("theme-changed", theme);
    }
  });
});
ipcMain.on("settings-changed", (_, settings) => {
  if (studioWindow && !studioWindow.isDestroyed()) {
    studioWindow.webContents.send("settings-updated", settings);
  }
});
ipcMain.on("webcam:toggle", (_event, payload) => {
  if (payload == null ? void 0 : payload.enabled) {
    if (webcamWindow && !webcamWindow.isDestroyed()) {
      webcamWindow.show();
      return;
    }
    webcamWindow = new BrowserWindow({
      icon: nativeImage.createFromPath(
        path$1.join(process.env.VITE_PUBLIC, "logo.ico")
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
        preload: path$1.join(_dirname, "preload.mjs"),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false
      }
    });
    if (VITE_DEV_SERVER_URL) {
      const camUrl = new URL("webcam.html", VITE_DEV_SERVER_URL).toString();
      webcamWindow.loadURL(camUrl);
    } else {
      webcamWindow.loadFile(path$1.join(RENDERER_DIST, "webcam.html"));
    }
    webcamWindow.setAlwaysOnTop(true, "screen-saver");
    try {
      webcamWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      });
    } catch (_) {
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
ipcMain.on("recording:started", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});
ipcMain.on("recording:stopped", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
});
ipcMain.on(
  "recording:data-available",
  async (_, data) => {
    try {
      const videosDir = path$1.join(app.getPath("videos"), "Capture");
      if (!fs$1.existsSync(videosDir)) {
        fs$1.mkdirSync(videosDir, { recursive: true });
      }
      const filePath = path$1.join(videosDir, data.filename);
      const buffer = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data);
      fs$1.appendFileSync(filePath, buffer);
      console.log(`Chunk saved to: ${filePath}`);
    } catch (error) {
      console.error("Error saving recording:", error);
      if (uploadWindow && !uploadWindow.isDestroyed()) {
        uploadWindow.webContents.send("recording-save-error", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  }
);
ipcMain.on("open-this", (_, url) => {
  shell.openExternal(url);
  if (uploadWindow) {
    uploadWindow.hide();
  }
});
ipcMain.on("open-url", (_, url) => {
  console.log("Opening URL:", url);
  shell.openExternal(url);
  if (uploadWindow) {
    uploadWindow.hide();
  }
});
ipcMain.on(
  "save-recording",
  (_, data) => {
    console.log("Received save-recording request:", {
      filename: data.filename,
      dataLength: data.data.length
    });
    if (uploadWindow && !uploadWindow.isDestroyed()) {
      const recordingData = {
        type: "video-blob",
        blob: data.data,
        // This will be converted to Blob in the renderer
        filename: data.filename,
        mimeType: "video/webm"
        // Default mime type, adjust if needed
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
          path$1.join(process.env.VITE_PUBLIC, "logo.ico")
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
          preload: path$1.join(_dirname, "preload.mjs"),
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          allowRunningInsecureContent: false
        }
      });
      if (VITE_DEV_SERVER_URL) {
        uploadWindow.loadURL(uploadUrl);
        uploadWindow.webContents.openDevTools({ mode: "detach" });
      } else {
        uploadWindow.loadFile(path$1.join(RENDERER_DIST, "upload.html"));
      }
      uploadWindow.webContents.on("did-finish-load", () => {
        const recordingData = {
          type: "video-blob",
          blob: data.data,
          // This will be converted to Blob in the renderer
          filename: data.filename,
          mimeType: "video/webm"
          // Default mime type, adjust if needed
        };
        console.log(
          "Sending recording data to new upload window:",
          recordingData
        );
        uploadWindow == null ? void 0 : uploadWindow.webContents.send("recording-data", recordingData);
      });
      uploadWindow.on("closed", () => {
        uploadWindow = null;
      });
    }
  }
);
ipcMain.on("close-upload-window", () => {
  if (uploadWindow && !uploadWindow.isDestroyed()) {
    uploadWindow.destroy();
    uploadWindow = null;
  }
});
ipcMain.on("minimize-upload-window", () => {
  if (uploadWindow && !uploadWindow.isDestroyed()) {
    uploadWindow.minimize();
  }
});
ipcMain.on("streaming:start", (event, config2) => {
  console.log("Starting live stream with config:", config2);
  if (ffmpegCommand) {
    console.warn("Stream already running, stopping previous one.");
    ffmpegCommand.kill("SIGINT");
    ffmpegCommand = null;
  }
  try {
    inputStream = new Readable({
      read() {
      }
    });
    const baseUrl = config2.rtmpUrl.endsWith("/") ? config2.rtmpUrl.slice(0, -1) : config2.rtmpUrl;
    const fullRtmpUrl = `${baseUrl}/${config2.streamKey}`;
    const [width, height] = config2.resolution.split("x").map((num) => parseInt(num) || 0);
    ffmpegCommand = ffmpeg(inputStream).inputFormat("webm").inputOptions([
      "-analyzeduration 0",
      "-probesize 32",
      "-fflags +genpts+ignthr",
      // ignthr helps with erratic timestamps from browser
      "-thread_queue_size 1024"
      // Buffer more input chunks
    ]).videoCodec("libx264").audioCodec("aac").audioBitrate(config2.audioBitrate || "128k").videoBitrate(config2.videoBitrate || "2500k").fps(config2.fps || 30).size(`${width}x${height}`).outputOptions([
      "-preset ultrafast",
      "-tune zerolatency",
      `-g ${config2.fps * 2}`,
      `-keyint_min ${config2.fps}`,
      "-crf 23",
      // Slightly better quality than 25
      "-pix_fmt yuv420p",
      "-sc_threshold 0",
      "-profile:v main",
      "-level 3.1",
      "-ar 44100",
      "-b:a 128k",
      "-maxrate 4000k",
      "-bufsize 8000k",
      "-f flv",
      "-flvflags no_duration_filesize"
    ]).output(fullRtmpUrl).on("start", (commandLine) => {
      console.log("FFmpeg process started with command:", commandLine);
      event.reply("streaming:started");
    }).on("stderr", (stderrLine) => {
      if (stderrLine.includes("error") || stderrLine.includes("Error")) {
        console.error("FFmpeg Log:", stderrLine);
      } else {
        console.log("FFmpeg Log:", stderrLine);
      }
    }).on("error", (err, stdout, stderr) => {
      console.error("FFmpeg error:", err.message);
      console.error("FFmpeg stderr:", stderr);
      event.reply("streaming:error", { error: err.message });
      ffmpegCommand = null;
      inputStream = null;
    }).on("end", () => {
      console.log("FFmpeg process ended");
      event.reply("streaming:stopped");
      ffmpegCommand = null;
      inputStream = null;
    });
    ffmpegCommand.run();
  } catch (error) {
    console.error("Error starting stream:", error);
    event.reply("streaming:error", { error: error instanceof Error ? error.message : "Unknown error" });
  }
});
ipcMain.on("streaming:data", (_, data) => {
  if (inputStream) {
    try {
      inputStream.push(Buffer.from(data));
    } catch (error) {
      console.error("Error pushing data to FFmpeg:", error);
    }
  }
});
ipcMain.on("streaming:stop", (event) => {
  console.log("Stopping live stream requested.");
  if (inputStream) {
    inputStream.push(null);
  }
  if (ffmpegCommand) {
    ffmpegCommand.kill("SIGINT");
  }
  event.reply("streaming:stopped");
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
