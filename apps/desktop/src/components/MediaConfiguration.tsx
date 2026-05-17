import { useRecorderContext } from "@/context/index";
import { logger } from "@/lib/logger";
import { AlertCircle, CheckCircle, Monitor, RefreshCw, Video, Cloud } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Header from "./Header";
import PreviewScreen from "./PreviewScreen";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Switch } from "@workspace/ui/components/switch";
import { Input } from "@workspace/ui/components/input";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";

type ResolutionOption = string;

/**
 * MediaConfiguration Component
 * Main UI for the dashboard where users select their recording sources (screen, audio),
 * adjust quality settings (resolution, FPS), and configure live streaming credentials.
 */
export default function MediaConfiguration() {
  // Destructure state and actions from the global recorder context
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

  // Local state for UI feedback (refreshing, errors)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errors, setErrors] = useState<{
    screens?: string;
    audio?: string;
    general?: string;
  }>({});
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  /**
   * Enhanced refresh function
   * Simultaneously fetches screen sources, audio inputs, and supported resolutions.
   * Includes error isolation for each operation.
   */
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

  // Effect: Initialization load on component mount
  useEffect(() => {
    refreshDevices();
    getSupportedResolutions();
  }, [refreshDevices, getSupportedResolutions]);

  // Effect: Set a default Screen Source if none is selected
  useEffect(() => {
    if (screens.length > 0 && !settings.screenId) {
      const defaultScreen = screens.find((screen) => screen.id) || screens[0];
      if (defaultScreen) {
        setSettings((prev) => ({ ...prev, screenId: defaultScreen.id }));
      }
    }
  }, [screens, settings.screenId, setSettings]);

  // Effect: Synchronize settings with the dedicated "Studio" floating window via IPC
  useEffect(() => {
    if (
      settings.screenId ||
      settings.audioInputId ||
      settings.resolution ||
      settings.fps ||
      settings.isStreamingEnabled
    ) {
      logger.debug("Sending settings to studio", { settings });
      window.ipcRenderer.send("settings-changed", settings);
    }
  }, [settings]);

  // Effect: Set a default Audio Source if none is selected
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

  // Effect: Set a default Resolution (preferring 720p for standard quality)
  useEffect(() => {
    if (resolutions.length > 0 && !settings.resolution) {
      // Default to 720p for better performance
      const defaultResolution =
        resolutions.find((r) => r.includes("720p")) || resolutions[0];
      setSettings((prev) => ({ ...prev, resolution: defaultResolution }));
    }
  }, [resolutions, settings.resolution, setSettings]);

  // Effect: Set a default frame rate (60 FPS for smoothness)
  useEffect(() => {
    if (!settings.fps) {
      // Default to 60 FPS for smoother video
      setSettings((prev) => ({ ...prev, fps: 60 }));
    }
  }, [settings.fps, setSettings]);

  /**
   * Validation logic to check if currently selected devices are still present in lists
   */
  const isScreenValid = screens.some(
    (screen) => screen.id === settings.screenId
  );
  const isAudioValid = audioInputs.some(
    (audio) => audio.deviceId === settings.audioInputId
  );
  const isResolutionValid = resolutions.includes(
    settings.resolution as ResolutionOption
  );

  /**
   * Truncates long device names for UI layout stability
   */
  const formatDeviceName = (name: string, maxLength: number = 40) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength - 3) + "...";
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* App Header section */}
      <Header />
      
      {/* Scrollable content area with hidden scrollbar */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-2 non-draggable">
        {/* Error Alerts Display */}
        {errors.general && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}

        {/* Refresh Header with manual refresh button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Media Sources</span>
            {lastRefreshTime && (
              <span className="text-xs text-muted-foreground">
                {lastRefreshTime.toLocaleTimeString()}
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
          {/* Section 1: Screen Source Selection (Desktop Capturer) */}
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

          {/* Section 2: Audio Source Selection (Microphone) */}
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

          {/* Visual Preview Section (Thumbnail of selected screen) */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="size-4 opacity-70" />
              <span className="text-xs">Preview</span>
            </div>
            <PreviewScreen selectedDisplayId={settings.screenId || ""} />
          </div>

          {/* Advanced Accordion Section */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="text-sm font-semibold">Advanced Settings</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* Section 3: Output Resolution Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Resolution</label>
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
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  )}

                  <Select
                    value={settings.resolution || ""}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, resolution: value }))
                    }
                    disabled={isResolutionsLoading}
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue
                        placeholder={
                          isResolutionsLoading
                            ? "Loading..."
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
                          <span className="text-xs">{resolution}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section 4: Frame Rate (FPS) Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Frame Rate (FPS)</label>
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
                    <SelectTrigger className="w-full h-8 text-xs">
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

                {/* Section: Upload to Cloud Toggle */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-primary" />
                      <label className="text-xs font-medium">Upload to Cloud</label>
                    </div>
                    <Switch
                      id="cloud-upload-switch"
                      checked={settings.isCloudUploadEnabled}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, isCloudUploadEnabled: checked }))
                      }
                    />
                  </div>
                </div>

                {/* Section 5: Live Streaming Configuration (YouTube RTMP) */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-red-600" />
                      <label className="text-xs font-medium">Live Stream (YouTube)</label>
                    </div>
                    <Switch
                      checked={settings.isStreamingEnabled}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => ({ ...prev, isStreamingEnabled: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">RTMP URL</label>
                      <Input
                        placeholder="rtmp://a.rtmp.youtube.com/live2"
                        value={settings.rtmpUrl}
                        onChange={(e) => setSettings(prev => ({ ...prev, rtmpUrl: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Stream Key</label>
                      <Input
                        type="password"
                        placeholder="Enter your stream key"
                        value={settings.streamKey}
                        onChange={(e) => setSettings(prev => ({ ...prev, streamKey: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Footer Status Indicators */}
          <div className="pt-2 pb-4">
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
    </div>
  );
}
