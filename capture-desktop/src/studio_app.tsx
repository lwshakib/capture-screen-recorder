import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  Circle,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Webcam,
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { useStudioSettings } from "./hooks/useStudioSettings";

// Constants
const RESOLUTION_DIMENSIONS = {
  "144p(256x144)": { width: 256, height: 144 },
  "240p(426x240)": { width: 426, height: 240 },
  "360p(640x360)": { width: 640, height: 360 },
  "480p(854x480)": { width: 854, height: 480 },
  "720p(1280x720)": { width: 1280, height: 720 },
  "1080p(1920x1080)": { width: 1920, height: 1080 },
  "1440p(2560x1440)": { width: 2560, height: 1440 },
  "4K(3840x2160)": { width: 3840, height: 2160 },
} as const;

type ResolutionKey = keyof typeof RESOLUTION_DIMENSIONS;

const RECORDING_CONFIG = {
  DEFAULT_RESOLUTION: "1080p(1920x1080)" as ResolutionKey,
  DEFAULT_FPS: 60, // Default FPS for smoother video
  VIDEO_BITRATE: 10000000, // 10 Mbps for better quality
  AUDIO_BITRATE: 192000, // 192 kbps for high-quality audio
  AUDIO_SAMPLE_RATE: 48000, // 48kHz for high-quality audio
  AUDIO_CHANNELS: 2, // Stereo for better quality
  TIMER_INTERVAL_MS: 1000,
  RECORDING_CHUNK_INTERVAL_MS: 1000,
} as const;

const SUPPORTED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

// Types
interface VideoDimensions {
  width: number;
  height: number;
}

interface AudioConstraints {
  deviceId: string | { exact: string };
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
}

// Helper functions
const createAudioConstraints = (
  deviceId: string,
  useExact = true
): AudioConstraints => ({
  deviceId: useExact ? { exact: deviceId } : deviceId,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: RECORDING_CONFIG.AUDIO_SAMPLE_RATE,
  channelCount: RECORDING_CONFIG.AUDIO_CHANNELS,
});

const createVideoConstraints = (screenId: string): MediaTrackConstraints =>
  ({
    mandatory: {
      chromeMediaSource: "desktop",
      chromeMediaSourceId: screenId,
    },
  } as unknown as MediaTrackConstraints);

const getSupportedMimeType = (): string | null => {
  return (
    SUPPORTED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ||
    null
  );
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const generateFilename = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `screen-recording-${timestamp}.webm`;
};

const clearTimer = (
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>
) => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};

const startTimer = (
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setRecordingTime: React.Dispatch<React.SetStateAction<number>>
) => {
  clearTimer(timerRef);
  timerRef.current = setInterval(() => {
    setRecordingTime((prev) => prev + 1);
  }, RECORDING_CONFIG.TIMER_INTERVAL_MS);
};

const stopAllTracks = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const getDisplayStream = async (
  screenId: string,
  shouldCaptureSystemAudio: boolean
): Promise<MediaStream> => {
  const videoConstraints = createVideoConstraints(screenId);

  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: videoConstraints,
      audio: shouldCaptureSystemAudio,
    });
  } catch (error) {
    logger.warn("getDisplayMedia failed, falling back to getUserMedia", error);
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints,
    });
  }
};

const getMicrophoneStream = async (
  audioInputId: string
): Promise<MediaStream | null> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const deviceExists = devices.some(
      (d) => d.kind === "audioinput" && d.deviceId === audioInputId
    );

    if (!deviceExists) {
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: createAudioConstraints(audioInputId, true),
        video: false,
      });
    } catch {
      // Fallback: try without exact deviceId match
      return await navigator.mediaDevices.getUserMedia({
        audio: createAudioConstraints(audioInputId, false),
        video: false,
      });
    }
  } catch (error) {
    logger.warn("Failed to get microphone audio", error);
    return null;
  }
};

const combineStreams = (
  displayStream: MediaStream,
  micStream: MediaStream | null,
  audioInputId: string | null
): MediaStream => {
  const combinedStream = new MediaStream();

  // Add all video tracks from display stream
  displayStream
    .getVideoTracks()
    .forEach((track) => combinedStream.addTrack(track));

  const micAudio = micStream?.getAudioTracks()[0];
  const systemAudioTracks = displayStream.getAudioTracks();

  // Stop system audio if microphone is being used
  if (audioInputId && systemAudioTracks.length > 0) {
    systemAudioTracks.forEach((track) => track.stop());
  }

  // Add audio: prefer microphone, fallback to system audio
  if (micAudio) {
    combinedStream.addTrack(micAudio);
  } else if (systemAudioTracks[0] && !audioInputId) {
    combinedStream.addTrack(systemAudioTracks[0]);
  }

  if (combinedStream.getVideoTracks().length === 0) {
    throw new Error("No video tracks available");
  }

  return combinedStream;
};

export default function StudioApp() {
  const { settings } = useStudioSettings();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [webcamVisible, setWebcamVisible] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSaveRef = useRef<boolean>(true); // Flag to control whether to save on stop

  React.useEffect(() => {
    const connect = async () => {
      if (!settings?.screenId) return;

      try {
        stopAllTracks(stream);

        const shouldCaptureSystemAudio = !settings?.audioInputId;
        const displayStream = await getDisplayStream(
          settings.screenId,
          shouldCaptureSystemAudio
        );

        const micStream = settings?.audioInputId
          ? await getMicrophoneStream(settings.audioInputId)
          : null;

        const combinedStream = combineStreams(
          displayStream,
          micStream,
          settings?.audioInputId || null
        );

        setStream(combinedStream);
      } catch (err) {
        logger.error("Failed to get screen stream", err);
      }
    };
    void connect();

    return () => {
      if (isRecording) {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== "inactive") {
          rec.stop();
        }
        setIsRecording(false);
        setIsPaused(false);
        clearTimer(timerRef);
        window.ipcRenderer.send("recording:stopped");
      }
      stopAllTracks(stream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const createResizedStream = useCallback(
    (originalStream: MediaStream): MediaStream => {
      if (!settings?.resolution) {
        return originalStream;
      }

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", {
          alpha: false,
          desynchronized: true, // Better performance
        });

        if (!ctx) {
          logger.warn("Could not get canvas context, using original stream");
          return originalStream;
        }

        const resolutionKey = settings.resolution as ResolutionKey;
        const targetDimensions: VideoDimensions =
          RESOLUTION_DIMENSIONS[resolutionKey] ||
          RESOLUTION_DIMENSIONS[RECORDING_CONFIG.DEFAULT_RESOLUTION];

        canvas.width = targetDimensions.width;
        canvas.height = targetDimensions.height;

        // Use better image smoothing for quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const video = document.createElement("video");
        video.srcObject = originalStream;
        video.muted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");

        const fps = settings?.fps || RECORDING_CONFIG.DEFAULT_FPS;
        const resizedStream = canvas.captureStream(fps);

        // Preserve audio tracks from original stream
        originalStream.getAudioTracks().forEach((track) => {
          resizedStream.addTrack(track);
        });

        let animationFrameId: number;
        let isActive = true;

        const drawFrame = (): void => {
          if (!isActive) {
            return;
          }

          if (video.videoWidth && video.videoHeight) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }

          if (isActive) {
            animationFrameId = requestAnimationFrame(drawFrame);
          }
        };

        video.onloadedmetadata = (): void => {
          video.play().catch((err) => logger.warn("Video play failed", err));
          drawFrame();
        };

        const videoTrack = originalStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener("ended", () => {
            isActive = false;
            cancelAnimationFrame(animationFrameId);
          });
        }

        return resizedStream;
      } catch (error) {
        logger.error("Failed to create resized stream", error);
        return originalStream;
      }
    },
    [settings?.resolution, settings?.fps]
  );

  const resetRecordingState = React.useCallback((): void => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    clearTimer(timerRef);
  }, []);

  const startRecording = React.useCallback(async (): Promise<void> => {
    if (!stream || isRecording) {
      return;
    }

    if (stream.getVideoTracks().length === 0) {
      logger.error("No video tracks in stream");
      return;
    }

    const recordingStream = createResizedStream(stream);

    try {
      const selectedMimeType = getSupportedMimeType();

      if (!selectedMimeType) {
        logger.error("No supported MIME type found for MediaRecorder");
        return;
      }

      const recorder = new MediaRecorder(recordingStream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: RECORDING_CONFIG.VIDEO_BITRATE,
        audioBitsPerSecond: RECORDING_CONFIG.AUDIO_BITRATE,
      });

      chunksRef.current = [];
      shouldSaveRef.current = true; // Default: save when stopped normally
      const filename = generateFilename();

      const handleDataAvailable = (event: BlobEvent): void => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          // Send incremental data for real-time processing
          event.data
            .arrayBuffer()
            .then((buffer) => {
              window.ipcRenderer.send("recording:data-available", {
                data: Array.from(new Uint8Array(buffer)),
                filename,
              });
            })
            .catch((error) => {
              logger.error("Failed to process recording data chunk", error);
            });
        }
      };

      const handleStop = async (): Promise<void> => {
        try {
          // Only save if shouldSave flag is true AND there are chunks available
          if (!shouldSaveRef.current) {
            logger.debug(
              "Recording discarded or restarted - not saving to prevent upload window"
            );
            chunksRef.current = [];
            return;
          }

          // Only save if there are chunks available
          if (chunksRef.current.length === 0) {
            logger.debug("No chunks to save");
            return;
          }

          const blob = new Blob(chunksRef.current, { type: selectedMimeType });
          const arrayBuffer = await blob.arrayBuffer();
          window.ipcRenderer.send("save-recording", {
            data: Array.from(new Uint8Array(arrayBuffer)),
            filename,
          });
          chunksRef.current = [];
        } catch (error) {
          logger.error("Failed to save recording", error);
        } finally {
          // Reset the flag after handling stop
          shouldSaveRef.current = true;
        }
      };

      const handleError = (event: Event): void => {
        const recorderEvent = event as { error?: Error };
        const error =
          recorderEvent.error || new Error("Unknown MediaRecorder error");
        logger.error("MediaRecorder error", error);
        resetRecordingState();
        window.ipcRenderer.send("recording:stopped", { filename });
      };

      const handleStart = (): void => {
        setIsRecording(true);
        setIsPaused(false);
        setRecordingTime(0);
        window.ipcRenderer.send("recording:started");
        startTimer(timerRef, setRecordingTime);
      };

      recorder.ondataavailable = handleDataAvailable;
      recorder.onstop = handleStop;
      recorder.onerror = handleError;
      recorder.onstart = handleStart;

      mediaRecorderRef.current = recorder;
      recorder.start(RECORDING_CONFIG.RECORDING_CHUNK_INTERVAL_MS);
    } catch (error) {
      logger.error("Failed to start recording", error);
      resetRecordingState();
    }
  }, [stream, isRecording, createResizedStream, resetRecordingState]);

  const togglePause = React.useCallback((): void => {
    const rec = mediaRecorderRef.current;
    if (!rec || !isRecording) {
      return;
    }

    try {
      if (rec.state === "paused") {
        rec.resume();
        setIsPaused(false);
        startTimer(timerRef, setRecordingTime);
      } else if (rec.state === "recording") {
        rec.pause();
        setIsPaused(true);
        clearTimer(timerRef);
      }
    } catch (error) {
      logger.error("Failed to toggle pause", error);
    }
  }, [isRecording]);

  const stopRecording = React.useCallback((): void => {
    const rec = mediaRecorderRef.current;
    if (!rec) {
      return;
    }

    try {
      if (rec.state !== "inactive") {
        rec.stop();
      }

      resetRecordingState();

      // Notify main process that recording stopped
      window.ipcRenderer.send("recording:stopped");
    } catch (error) {
      logger.error("Failed to stop recording", error);
      resetRecordingState();
    }
  }, [resetRecordingState]);

  const discardRecording = React.useCallback((): void => {
    const rec = mediaRecorderRef.current;

    // Set flag to prevent saving/uploading
    shouldSaveRef.current = false;

    // Clear chunks immediately to prevent any data from being saved
    chunksRef.current = [];

    // Stop the recording if it's active
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }

    // Reset recording state
    resetRecordingState();

    // Notify main process that recording was discarded (no upload window)
    window.ipcRenderer.send("recording:stopped");

    logger.debug("Recording discarded - no upload window will open");
  }, [resetRecordingState]);

  const toggleWebcam = React.useCallback((): void => {
    const newState = !webcamVisible;
    setWebcamVisible(newState);
    window.ipcRenderer.send("webcam:toggle", { enabled: newState });
  }, [webcamVisible]);

  const restartRecording = React.useCallback(async (): Promise<void> => {
    if (!stream) {
      logger.warn("Cannot restart recording: no stream available");
      return;
    }

    if (!isRecording) {
      // If not recording, we can't restart - just return
      logger.debug("Cannot restart: not currently recording");
      return;
    }

    const rec = mediaRecorderRef.current;

    try {
      // Set flag to prevent saving/uploading the previous recording
      shouldSaveRef.current = false;

      // Clear chunks immediately to prevent any data from being saved
      chunksRef.current = [];

      // Stop current recording (it's either "recording" or "paused" at this point)
      if (rec && (rec.state === "recording" || rec.state === "paused")) {
        rec.stop();
      }

      // Clear the MediaRecorder reference to allow new one to be created
      mediaRecorderRef.current = null;

      // Reset state immediately but keep stream reference
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      clearTimer(timerRef);

      // Notify main process that previous recording was discarded (no upload window)
      window.ipcRenderer.send("recording:stopped");

      logger.debug("Previous recording discarded - starting new recording");

      // Wait a moment for cleanup to complete and state to update
      // This ensures MediaRecorder has time to properly stop and React state updates
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Verify stream is still valid before starting new recording
      if (stream && stream.getVideoTracks().length > 0) {
        // Check if any video tracks are still active
        const hasActiveVideoTrack = stream
          .getVideoTracks()
          .some((track) => track.readyState === "live");

        if (hasActiveVideoTrack) {
          // Ensure we have a fresh state - double check MediaRecorder is cleared
          const currentRecorder = mediaRecorderRef.current;
          if (currentRecorder === null) {
            // Start new recording automatically
            // Create a new recording stream
            const recordingStream = createResizedStream(stream);

            try {
              const selectedMimeType = getSupportedMimeType();

              if (!selectedMimeType) {
                logger.error("No supported MIME type found for MediaRecorder");
                return;
              }

              const newRecorder = new MediaRecorder(recordingStream, {
                mimeType: selectedMimeType,
                videoBitsPerSecond: RECORDING_CONFIG.VIDEO_BITRATE,
                audioBitsPerSecond: RECORDING_CONFIG.AUDIO_BITRATE,
              });

              chunksRef.current = [];
              shouldSaveRef.current = true; // Reset flag for new recording
              const filename = generateFilename();

              const handleDataAvailable = (event: BlobEvent): void => {
                if (event.data.size > 0) {
                  chunksRef.current.push(event.data);
                  event.data
                    .arrayBuffer()
                    .then((buffer) => {
                      window.ipcRenderer.send("recording:data-available", {
                        data: Array.from(new Uint8Array(buffer)),
                        filename,
                      });
                    })
                    .catch((error) => {
                      logger.error(
                        "Failed to process recording data chunk",
                        error
                      );
                    });
                }
              };

              const handleStop = async (): Promise<void> => {
                try {
                  if (!shouldSaveRef.current) {
                    logger.debug(
                      "Recording discarded or restarted - not saving to prevent upload window"
                    );
                    chunksRef.current = [];
                    return;
                  }

                  if (chunksRef.current.length === 0) {
                    logger.debug("No chunks to save");
                    return;
                  }

                  const blob = new Blob(chunksRef.current, {
                    type: selectedMimeType,
                  });
                  const arrayBuffer = await blob.arrayBuffer();
                  window.ipcRenderer.send("save-recording", {
                    data: Array.from(new Uint8Array(arrayBuffer)),
                    filename,
                  });
                  chunksRef.current = [];
                } catch (error) {
                  logger.error("Failed to save recording", error);
                } finally {
                  shouldSaveRef.current = true;
                }
              };

              const handleError = (event: Event): void => {
                const recorderEvent = event as { error?: Error };
                const error =
                  recorderEvent.error ||
                  new Error("Unknown MediaRecorder error");
                logger.error("MediaRecorder error", error);
                resetRecordingState();
                window.ipcRenderer.send("recording:stopped", { filename });
              };

              const handleStart = (): void => {
                setIsRecording(true);
                setIsPaused(false);
                setRecordingTime(0);
                window.ipcRenderer.send("recording:started");
                startTimer(timerRef, setRecordingTime);
              };

              newRecorder.ondataavailable = handleDataAvailable;
              newRecorder.onstop = handleStop;
              newRecorder.onerror = handleError;
              newRecorder.onstart = handleStart;

              mediaRecorderRef.current = newRecorder;
              newRecorder.start(RECORDING_CONFIG.RECORDING_CHUNK_INTERVAL_MS);
              logger.debug("New recording started successfully after restart");
            } catch (error) {
              logger.error(
                "Failed to start new recording after restart",
                error
              );
              mediaRecorderRef.current = null;
              resetRecordingState();
            }
          } else {
            logger.warn(
              "MediaRecorder ref still exists - cannot start new recording",
              currentRecorder
            );
          }
        } else {
          logger.warn("Cannot restart: video track is no longer active");
        }
      } else {
        logger.warn("Cannot restart: stream is invalid or has no video tracks");
      }
    } catch (error) {
      logger.error("Failed to restart recording", error);
      resetRecordingState();
    }
  }, [stream, isRecording, createResizedStream, resetRecordingState]);

  return (
    <div
      className={cn(
        "w-screen px-4 h-12 rounded-full bg-background/90 border border-border backdrop-blur flex items-center justify-between shadow-2xl draggable",
        "dark:bg-background/90 dark:border-border"
      )}
    >
      <div className="flex items-center justify-between gap-1 w-screen">
        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size={isRecording ? "sm" : "icon"}
          className={cn(
            "non-draggable cursor-pointer transition-all duration-200",
            isRecording
              ? "px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg animate-pulse"
              : "hover:bg-destructive/10 dark:hover:bg-destructive/20"
          )}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!stream}
        >
          {isRecording ? (
            <div className="flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5 text-white" />

              <span className="text-xs font-semibold text-white">
                {formatTime(recordingTime)}
              </span>
            </div>
          ) : (
            <Circle className="w-4 h-4 text-destructive fill-destructive" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="non-draggable cursor-pointer"
          onClick={togglePause}
          disabled={!isRecording}
        >
          {isRecording && !isPaused ? (
            <Pause className="w-4 h-4" />
          ) : isRecording && isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="non-draggable cursor-pointer"
          onClick={discardRecording}
          disabled={!isRecording}
          title="Discard recording (no upload)"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="non-draggable cursor-pointer"
          onClick={restartRecording}
          disabled={!isRecording || !stream}
          title="Restart recording (discard previous & start new)"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="non-draggable cursor-pointer"
          onClick={toggleWebcam}
          title="Toggle webcam"
        >
          <Webcam className={cn("w-4 h-4", webcamVisible && "text-primary")} />
        </Button>
      </div>
    </div>
  );
}
