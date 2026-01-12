import axios from "axios";
import {
  Camera,
  Circle,
  Download,
  Pause,
  Play,
  Square,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getWebUrlOrNull } from "../../utils/env";
import { logger } from "../../utils/logger";

type Resolution = { label: string; width: number; height: number };

type RecorderState = "idle" | "recording" | "paused";

function RecordingCard() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("capture_show_webcam");
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 20,
    y: 20,
  });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const selectedResolution = useMemo<Resolution | null>(() => {
    try {
      const raw = localStorage.getItem("capture_resolution_selected");
      return raw ? (JSON.parse(raw) as Resolution) : null;
    } catch {
      return null;
    }
  }, []);

  const selectedAudioDeviceId = useMemo<string | null>(() => {
    try {
      return localStorage.getItem("capture_audioinput_selected");
    } catch {
      return null;
    }
  }, []);

  const dispatchRecordingState = (isRecording: boolean) => {
    try {
      const evt = new CustomEvent("capture:recording-state", {
        detail: { recording: isRecording },
      });
      window.dispatchEvent(evt);
    } catch {}
  };

  const startTimer = () => {
    if (timerIntervalRef.current) return;
    startedAtRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const running = startedAtRef.current ? now - startedAtRef.current : 0;
      setElapsedMs(accumulatedMsRef.current + running);
    };
    tick();
    timerIntervalRef.current = window.setInterval(
      tick,
      200
    ) as unknown as number;
  };

  const pauseTimer = () => {
    if (startedAtRef.current) {
      accumulatedMsRef.current += Date.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setElapsedMs(accumulatedMsRef.current);
  };

  const resetTimer = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    startedAtRef.current = null;
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
  };

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = hours > 0 ? String(hours).padStart(2, "0") + ":" : "";
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${hh}${mm}:${ss}`;
  };

  const cleanupStreams = () => {
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        // For display tracks, try to help Chrome release screen sharing
        if (track.kind === "video" && track.label.includes("screen")) {
          try {
            // Force Chrome to release screen sharing
            track.enabled = false;
            track.stop();
          } catch {}
        }
      });
      combinedStreamRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }

    // Additional cleanup for Chrome screen sharing
    try {
      // Request a minimal stream to help Chrome release screen sharing
      navigator.mediaDevices
        .getUserMedia({ video: false, audio: false })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch(() => {});
    } catch {}
  };

  const startRecording = async () => {
    setError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          width: selectedResolution?.width,
          height: selectedResolution?.height,
        } as MediaTrackConstraints,
        audio: true,
      });

      let micStream: MediaStream | null = null;
      if (selectedAudioDeviceId) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: selectedAudioDeviceId } },
            video: false,
          });
        } catch {
          // Ignore mic errors, proceed with display audio only
        }
      }

      const combined = new MediaStream();
      displayStream.getVideoTracks().forEach((t) => combined.addTrack(t));
      // Prefer mic if present; otherwise include display audio if available
      const micAudio = micStream?.getAudioTracks()[0];
      const displayAudio = displayStream.getAudioTracks()[0];
      if (micAudio) combined.addTrack(micAudio);
      else if (displayAudio) combined.addTrack(displayAudio);

      combinedStreamRef.current = combined;

      const mimeType =
        [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ].find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(
        combined,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });

        // Store the blob and create URL for the modal
        setRecordedVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setShowModal(true);

        // Cleanup tracks
        cleanupStreams();
        setState("idle");
      };

      // Handle screen sharing cancellation
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        cleanupStreams();
        setState("idle");
        resetTimer();
        dispatchRecordingState(false);
      };

      recorder.start(200);
      setState("recording");
      startTimer();
      dispatchRecordingState(true);
    } catch (e: any) {
      setError(e?.message || "Failed to start recording");
      cleanupStreams();
      setState("idle");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }

    // Force stop all tracks immediately
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        // For display tracks, also try to revoke permissions
        if (track.kind === "video" && track.label.includes("screen")) {
          try {
            // This helps Chrome understand we're done with screen sharing
            navigator.mediaDevices.getUserMedia({ video: false, audio: false });
          } catch {}
        }
      });
      combinedStreamRef.current = null;
    }

    // Try to force Chrome to release screen sharing
    try {
      // Request a dummy stream to help Chrome release screen sharing
      navigator.mediaDevices
        .getUserMedia({ video: false, audio: false })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch(() => {});
    } catch {}

    resetTimer();
    dispatchRecordingState(false);
    setState("idle");
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.pause();
      setState("paused");
      pauseTimer();
      dispatchRecordingState(true);
    }
  };

  const resumeRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "paused") {
      rec.resume();
      setState("recording");
      startTimer();
      dispatchRecordingState(true);
    }
  };

  const toggleWebcam = () => {
    try {
      chrome.runtime.sendMessage({ action: "TOGGLE_WEBCAM" });
    } catch {}
    try {
      const next = !showWebcam;
      setShowWebcam(next);
      localStorage.setItem("capture_show_webcam", JSON.stringify(next));
      const evt = new Event("capture:webcam-toggle");
      window.dispatchEvent(evt);
    } catch {}
  };

  const closeModal = () => {
    setShowModal(false);
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    setRecordedVideoBlob(null);
    setUploadSuccess(false);
    setUploadedVideoId(null);
    setUploadProgress(0);
  };

  const downloadVideo = () => {
    if (recordedVideoBlob) {
      const url = URL.createObjectURL(recordedVideoBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capture-recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  const uploadToCloud = async () => {
    if (!recordedVideoBlob) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      // Get auth token
      const token = await chrome.storage.local.get("authToken");
      if (!token.authToken) {
        setError("Please sign in to upload videos");
        setIsUploading(false);
        return;
      }

      const webUrl = getWebUrlOrNull();
      if (!webUrl) {
        setError("Upload service not configured. Please set VITE_WEB_URL.");
        setIsUploading(false);
        return;
      }

      const res = await fetch(`${webUrl}/api/token/cloudinary-signature`, {
        headers: {
          Authorization: `Bearer ${token.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${res.status}: ${res.statusText}`
        );
      }
      const data = await res.json();

      if (
        !data.signature ||
        !data.timestamp ||
        !data.folder ||
        !data.apiKey ||
        !data.cloudName
      ) {
        throw new Error(
          "Invalid response from server: missing required fields"
        );
      }

      const formData = new FormData();
      formData.append(
        "file",
        recordedVideoBlob,
        `capture-recording-${Date.now()}.webm`
      );
      formData.append("signature", data.signature);
      formData.append("timestamp", data.timestamp.toString());
      formData.append("folder", data.folder);
      formData.append("api_key", data.apiKey);
      formData.append("cloud_name", data.cloudName);

      const uploadResponse = await axios.post(
        `https://api.cloudinary.com/v1_1/${data.cloudName}/auto/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(progress);
            }
          },
        }
      );

      if (uploadResponse.status === 200) {
        const videoData = uploadResponse.data;
        const res = await fetch(`${webUrl}/api/token/videos`, {
          method: "POST",
          body: JSON.stringify({
            name: `capture-recording-${Date.now()}.webm`,
            description: "Recording from Capture",
            videoData: videoData,
          }),
          headers: {
            Authorization: `Bearer ${token.authToken}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const videoResponse = await res.json();

          // Try to extract video ID from different possible response formats
          const videoId = videoResponse.newVideo.id;

          setUploadedVideoId(videoId);
          setUploadSuccess(true);

          // Redirect to video page after a short delay
          if (videoId) {
            setTimeout(() => {
              const webUrl = getWebUrlOrNull();
              if (webUrl) {
                window.open(`${webUrl}/videos/${videoId}`, "_blank");
              }
            }, 1500);
          }
        } else {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.message || `HTTP ${res.status}: ${res.statusText}`
          );
        }
      } else {
        throw new Error(
          `Upload failed: ${uploadResponse.statusText || "Unknown error"}`
        );
      }
    } catch (error) {
      logger.error("Upload error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.";
      setError(errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
      // Don't close modal on error, let user see the error and retry
    } finally {
      // Reset uploading state is handled in catch block
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup if unmounted while recording
      cleanupStreams();
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      // Cleanup video URL if modal is open
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  // Initialize and persist position
  useEffect(() => {
    try {
      const saved = localStorage.getItem("capture_recording_card_position");
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        setPosition(parsed);
        return;
      }
    } catch {}
    // Default bottom-left after measure
    requestAnimationFrame(() => {
      const height = containerRef.current?.offsetHeight ?? 100;
      setPosition({ x: 20, y: Math.max(20, window.innerHeight - height - 20) });
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "capture_recording_card_position",
        JSON.stringify(position)
      );
    } catch {}
  }, [position]);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const w = containerRef.current?.offsetWidth ?? 260;
      const h = containerRef.current?.offsetHeight ?? 100;
      const x = Math.min(
        Math.max(0, clientX - dragOffsetRef.current.dx),
        window.innerWidth - w
      );
      const y = Math.min(
        Math.max(0, clientY - dragOffsetRef.current.dy),
        window.innerHeight - h
      );
      setPosition({ x, y });
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onHeaderDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      dx: clientX - position.x,
      dy: clientY - position.y,
    };
  };

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onHeaderDragStart(e.clientX, e.clientY);
  };

  const onHeaderTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    onHeaderDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <>
      <div
        className="recording-card"
        ref={containerRef}
        style={{ left: position.x, top: position.y }}
      >
        <div
          className="recording-card__header"
          onMouseDown={onHeaderMouseDown}
          onTouchStart={onHeaderTouchStart}
        >
          <span>Recorder</span>
          {(state === "recording" || state === "paused") && (
            <span
              className={`recording-card__timer recording-card__timer--${state}`}
              aria-live="polite"
            >
              <span className="recording-card__dot" />{" "}
              {formatElapsed(elapsedMs)}
            </span>
          )}
        </div>
        <div className="recording-card__controls">
          {state === "idle" && (
            <button
              className="icon-btn icon-btn-primary"
              onClick={startRecording}
              aria-label="Start recording"
            >
              <Circle size={16} />
            </button>
          )}
          {state !== "idle" && (
            <button
              className="icon-btn icon-btn-danger"
              onClick={stopRecording}
              aria-label="Stop recording"
            >
              <Square size={16} />
            </button>
          )}
          <button
            className="icon-btn"
            onClick={state === "paused" ? resumeRecording : pauseRecording}
            disabled={state === "idle"}
            aria-label={state === "paused" ? "Resume" : "Pause"}
          >
            {state === "paused" ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            className={`icon-btn${showWebcam ? " icon-btn-selected" : ""}`}
            onClick={toggleWebcam}
            aria-label="Toggle webcam"
            aria-pressed={showWebcam}
          >
            <Camera size={16} />
          </button>
        </div>
        {error && <div className="recording-card__error">{error}</div>}
      </div>

      {/* Video Preview Modal */}
      {showModal && recordedVideoUrl && (
        <div className="recording-modal-overlay" onClick={closeModal}>
          <div className="recording-modal" onClick={(e) => e.stopPropagation()}>
            <div className="recording-modal__header">
              <h3>
                {uploadSuccess
                  ? "Upload Complete!"
                  : isUploading
                  ? "Uploading..."
                  : "Recording Complete"}
              </h3>
              <button
                className="recording-modal__close-btn"
                onClick={closeModal}
                aria-label="Close modal"
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="recording-modal__success">
                <div className="recording-modal__success-icon">✓</div>
                <h4>Video uploaded successfully!</h4>
                {uploadedVideoId ? (
                  <p>Redirecting to video page...</p>
                ) : (
                  <p>Video uploaded but could not redirect automatically.</p>
                )}
              </div>
            ) : isUploading ? (
              <div className="recording-modal__uploading">
                <div className="recording-modal__progress">
                  <div className="recording-modal__progress-bar">
                    <div
                      className="recording-modal__progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="recording-modal__progress-text">
                    {uploadProgress}%
                  </span>
                </div>
                <p className="recording-modal__upload-status">
                  Uploading your recording...
                </p>
              </div>
            ) : (
              <>
                <div className="recording-modal__video-container">
                  <video
                    src={recordedVideoUrl}
                    controls
                    autoPlay
                    muted
                    className="recording-modal__video"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="recording-modal__actions">
                  <button
                    className="recording-modal__btn recording-modal__btn--download"
                    onClick={downloadVideo}
                    disabled={isUploading}
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <button
                    className="recording-modal__btn recording-modal__btn--upload"
                    onClick={uploadToCloud}
                    disabled={isUploading}
                  >
                    <Upload size={16} />
                    Upload to Cloud
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default RecordingCard;
