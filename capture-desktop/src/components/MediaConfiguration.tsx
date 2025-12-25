import { useRecorderContext } from "@/context/index";
import { logger } from "@/lib/logger";
import { AlertCircle, CheckCircle, Monitor, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import PreviewScreen from "./PreviewScreen";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResolutionOption = string;

export default function MediaConfiguration() {
  const {
    getScreens,
    getAudioInputs,
    getSupportedResolutions,
    screens,
    audioInputs,
    resolutions,
    settings,
    setSettings,
    isScreensLoading,
    isAudioInputsLoading,
    isResolutionsLoading,
  } = useRecorderContext();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errors, setErrors] = useState<{
    screens?: string;
    audio?: string;
    general?: string;
  }>({});
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Enhanced refresh function with error handling
  const refreshDevices = useCallback(async () => {
    setIsRefreshing(true);
    setErrors({});

    try {
      await Promise.all([
        getScreens().catch((error) => {
          logger.error("Failed to get screens", error);
          setErrors((prev) => ({
            ...prev,
            screens: "Failed to load screen sources",
          }));
        }),
        getAudioInputs().catch((error) => {
          logger.error("Failed to get audio inputs", error);
          setErrors((prev) => ({
            ...prev,
            audio: "Failed to load audio devices",
          }));
        }),
        getSupportedResolutions().catch((error) => {
          logger.error("Failed to get supported resolutions", error);
          setErrors((prev) => ({
            ...prev,
            general: "Failed to load supported resolutions",
          }));
        }),
      ]);

      setLastRefreshTime(new Date());
    } catch (error) {
      logger.error("Refresh failed", error);
      setErrors((prev) => ({ ...prev, general: "Failed to refresh devices" }));
    } finally {
      setIsRefreshing(false);
    }
  }, [getScreens, getAudioInputs, getSupportedResolutions]);

  // Initial load
  useEffect(() => {
    refreshDevices();
    getSupportedResolutions();
  }, [refreshDevices, getSupportedResolutions]);

  // Enhanced default selections with validation
  useEffect(() => {
    if (screens.length > 0 && !settings.screenId) {
      const defaultScreen = screens.find((screen) => screen.id) || screens[0];
      if (defaultScreen) {
        setSettings((prev) => ({ ...prev, screenId: defaultScreen.id }));
      }
    }
  }, [screens, settings.screenId, setSettings]);

  // Send settings to studio app when they change
  useEffect(() => {
    if (settings.screenId || settings.audioInputId || settings.resolution || settings.fps) {
      logger.debug("Sending settings to studio", { settings });
      window.ipcRenderer.send("settings-changed", settings);
    }
  }, [settings]);

  useEffect(() => {
    if (audioInputs.length > 0 && !settings.audioInputId) {
      const defaultAudio =
        audioInputs.find((audio) => audio.deviceId) || audioInputs[0];
      if (defaultAudio) {
        setSettings((prev) => ({
          ...prev,
          audioInputId: defaultAudio.deviceId,
        }));
      }
    }
  }, [audioInputs, settings.audioInputId, setSettings]);

  useEffect(() => {
    if (resolutions.length > 0 && !settings.resolution) {
      // Default to 720p for better performance
      const defaultResolution =
        resolutions.find((r) => r.includes("720p")) || resolutions[0];
      setSettings((prev) => ({ ...prev, resolution: defaultResolution }));
    }
  }, [resolutions, settings.resolution, setSettings]);

  useEffect(() => {
    if (!settings.fps) {
      // Default to 60 FPS for smoother video
      setSettings((prev) => ({ ...prev, fps: 60 }));
    }
  }, [settings.fps, setSettings]);

  // Validate current selections
  const isScreenValid = screens.some(
    (screen) => screen.id === settings.screenId
  );
  const isAudioValid = audioInputs.some(
    (audio) => audio.deviceId === settings.audioInputId
  );
  const isResolutionValid = resolutions.includes(
    settings.resolution as ResolutionOption
  );

  const formatDeviceName = (name: string, maxLength: number = 40) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
  };

  return (
    <div className="h-full">
      <Header />
      <div className="flex-1 px-4 py-2">
        {/* Error Alerts */}
        {errors.general && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        {/* Refresh Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Media Sources</span>
            {lastRefreshTime && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastRefreshTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDevices}
            disabled={isRefreshing || isScreensLoading || isAudioInputsLoading}
            className="h-8 w-8 p-0"
            title="Refresh devices"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Screen Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Screen Source</label>
              {settings.screenId && (
                <div className="flex items-center gap-2">
                  {isScreenValid ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                </div>
              )}
            </div>

            {errors.screens && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {errors.screens}
                </AlertDescription>
              </Alert>
            )}

            <Select
              value={settings.screenId || ""}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, screenId: value }))
              }
              disabled={isScreensLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isScreensLoading
                      ? "Loading screens..."
                      : "Select a screen source"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {screens.length === 0 && !isScreensLoading && (
                  <SelectItem value="" disabled>
                    No screens available
                  </SelectItem>
                )}
                {screens.map((screen) => (
                  <SelectItem key={screen.id} value={screen.id}>
                    <span>{formatDeviceName(screen.name)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Audio Source Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Audio Source</label>
              {settings.audioInputId && (
                <div className="flex items-center gap-2">
                  {isAudioValid ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                </div>
              )}
            </div>

            {errors.audio && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {errors.audio}
                </AlertDescription>
              </Alert>
            )}

            <Select
              value={settings.audioInputId || ""}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, audioInputId: value }))
              }
              disabled={isAudioInputsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isAudioInputsLoading
                      ? "Loading audio devices..."
                      : "Select an audio source"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {audioInputs.length === 0 && !isAudioInputsLoading && (
                  <SelectItem value="" disabled>
                    No audio devices available
                  </SelectItem>
                )}
                {audioInputs.map((audioInput) => (
                  <SelectItem
                    key={audioInput.deviceId}
                    value={audioInput.deviceId}
                  >
                    <span>
                      {formatDeviceName(
                        audioInput.label ||
                          `Audio Input ${audioInput.deviceId.slice(0, 8)}`
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Resolution</label>
              {settings.resolution && (
                <div className="flex items-center gap-2">
                  {isResolutionValid ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  )}
                </div>
              )}
            </div>

            {isResolutionsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Loading device-supported resolutions...</span>
              </div>
            )}

            <Select
              value={settings.resolution || ""}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, resolution: value }))
              }
              disabled={isResolutionsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isResolutionsLoading
                      ? "Loading resolutions..."
                      : "Select a resolution"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {resolutions.length === 0 && !isResolutionsLoading && (
                  <SelectItem value="" disabled>
                    No resolutions available
                  </SelectItem>
                )}
                {resolutions.map((resolution) => (
                  <SelectItem key={resolution} value={resolution}>
                    <span>{resolution}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FPS Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Frame Rate (FPS)</label>
              {settings.fps && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>

            <Select
              value={settings.fps?.toString() || ""}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, fps: parseInt(value, 10) }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select FPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 FPS (Cinematic)</SelectItem>
                <SelectItem value="30">30 FPS (Standard)</SelectItem>
                <SelectItem value="60">60 FPS (Smooth)</SelectItem>
                <SelectItem value="120">120 FPS (Ultra Smooth)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configuration Status */}
          <div className="pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className={`w-2 h-2 rounded-full ${
                  isScreenValid && isAudioValid && isResolutionValid && settings.fps
                    ? "bg-green-500"
                    : "bg-yellow-500"
                }`}
              />
              <span>
                {isScreenValid && isAudioValid && isResolutionValid && settings.fps
                  ? "Configuration complete"
                  : "Configuration incomplete"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Screen */}
      <div className="pt-2 px-4">
        <div className="flex items-center gap-2 mb-2">
          <Monitor className="size-4 opacity-70" />
          <span className="text-xs">Preview</span>
        </div>
        <PreviewScreen selectedDisplayId={settings.screenId || ""} />
      </div>
    </div>
  );
}
