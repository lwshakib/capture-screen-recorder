"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCaptureStore } from "@/context";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Resolution = { label: string; width: number; height: number };

type RecorderState = "idle" | "recording" | "paused";

const CANDIDATE_RESOLUTIONS: Resolution[] = [
  { label: "144p (256×144)", width: 256, height: 144 },
  { label: "240p (426×240)", width: 426, height: 240 },
  { label: "360p (640×360)", width: 640, height: 360 },
  { label: "480p (640×480)", width: 640, height: 480 },
  { label: "720p (1280×720)", width: 1280, height: 720 },
  { label: "1080p (1920×1080)", width: 1920, height: 1080 },
  { label: "1440p (2560×1440)", width: 2560, height: 1440 },
  { label: "2160p (3840×2160)", width: 3840, height: 2160 },
];

interface RecordVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordVideoDialog({
  open,
  onOpenChange,
}: RecordVideoDialogProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);

  const [supportedResolutions, setSupportedResolutions] = useState<
    Resolution[]
  >([]);
  const [selectedResolution, setSelectedResolution] =
    useState<Resolution | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const { addVideo } = useCaptureStore();

  // Probe for supported resolutions
  useEffect(() => {
    if (!open) return;

    const probe = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        const caps =
          typeof track.getCapabilities === "function"
            ? (track.getCapabilities() as any)
            : {};
        const widthCaps = caps.width;
        const heightCaps = caps.height;
        stream.getTracks().forEach((t) => t.stop());

        if (widthCaps && heightCaps) {
          const minW = widthCaps.min ?? 0;
          const maxW = widthCaps.max ?? Number.MAX_SAFE_INTEGER;
          const minH = heightCaps.min ?? 0;
          const maxH = heightCaps.max ?? Number.MAX_SAFE_INTEGER;
          const filtered = CANDIDATE_RESOLUTIONS.filter(
            (r) =>
              r.width >= minW &&
              r.width <= maxW &&
              r.height >= minH &&
              r.height <= maxH
          ).sort((a, b) => a.width - b.width);
          setSupportedResolutions(filtered);
          setSelectedResolution(
            filtered[filtered.length - 1] ?? filtered[0] ?? null
          );
        } else {
          setSupportedResolutions(CANDIDATE_RESOLUTIONS);
          setSelectedResolution(CANDIDATE_RESOLUTIONS[5]); // Default to 1080p
        }
      } catch {
        setSupportedResolutions(CANDIDATE_RESOLUTIONS);
        setSelectedResolution(CANDIDATE_RESOLUTIONS[5]); // Default to 1080p
      }
    };

    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        setAudioInputs(audios);
        if (audios.length > 0) {
          setSelectedAudioId(audios[0].deviceId);
        }
      } catch {
        setAudioInputs([]);
      }
    };

    probe();
    enumerate();
  }, [open]);

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

  const cleanupStreams = () => {
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((track) => {
        track.stop();
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
      if (selectedAudioId) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: { exact: selectedAudioId } },
            video: false,
          });
        } catch {
          // Ignore mic errors, proceed with display audio only
        }
      }

      const combined = new MediaStream();
      displayStream.getVideoTracks().forEach((t) => combined.addTrack(t));
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

        setRecordedVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setShowPreview(true);

        cleanupStreams();
        setState("idle");
        resetTimer();
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        cleanupStreams();
        setState("idle");
        resetTimer();
      };

      recorder.start(200);
      setState("recording");
      startTimer();
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
    cleanupStreams();
    resetTimer();
    setState("idle");
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.pause();
      setState("paused");
      pauseTimer();
    }
  };

  const resumeRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "paused") {
      rec.resume();
      setState("recording");
      startTimer();
    }
  };

  const closePreview = () => {
    setShowPreview(false);
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

  const uploadToCloud = useCallback(async () => {
    if (!recordedVideoBlob) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const { data: signature } = await axios.get("/api/cloudinary-signature");
      const uploadApi = `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`;

      const formData = new FormData();
      formData.append(
        "file",
        recordedVideoBlob,
        `capture-recording-${Date.now()}.webm`
      );
      formData.append("api_key", signature.apiKey);
      formData.append("timestamp", signature.timestamp);
      formData.append("folder", signature.folder);
      formData.append("signature", signature.signature);

      const { data: response } = await axios.post(uploadApi, formData, {
        onUploadProgress: (progress) => {
          if (progress.total) {
            const progressPercent = Math.round(
              (progress.loaded * 100) / progress.total
            );
            setUploadProgress(progressPercent);
          }
        },
      });

      toast.info("Creating video record...");
      const videoData = {
        name: response.original_filename || `capture-recording-${Date.now()}`,
        description: "Recording from Capture",
        videoData: response,
      };

      const videoResponse = await axios.post("/api/videos", videoData);

      if (videoResponse.data.newVideo) {
        addVideo(videoResponse.data.newVideo);
        setUploadedVideoId(videoResponse.data.newVideo.id);
        setUploadSuccess(true);
        toast.success(
          "Video uploaded successfully! Processing will begin shortly."
        );

        // Close dialog after a short delay
        setTimeout(() => {
          closePreview();
          onOpenChange(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(
        error?.response?.data?.error || "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, [recordedVideoBlob, addVideo, onOpenChange]);

  useEffect(() => {
    return () => {
      cleanupStreams();
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  const handleClose = useCallback(() => {
    if (state !== "idle") {
      if (
        confirm(
          "Recording in progress. Are you sure you want to stop and close?"
        )
      ) {
        stopRecording();
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Video</DialogTitle>
            <DialogDescription>
              Configure your recording settings and start capturing your screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Resolution Selection */}
            <div className="space-y-3">
              <Label>Recording Resolution</Label>
              <RadioGroup
                value={
                  selectedResolution
                    ? `${selectedResolution.width}x${selectedResolution.height}`
                    : undefined
                }
                onValueChange={(value) => {
                  const [width, height] = value.split("x").map(Number);
                  const res = supportedResolutions.find(
                    (r) => r.width === width && r.height === height
                  );
                  if (res) setSelectedResolution(res);
                }}
                disabled={state !== "idle"}
              >
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {supportedResolutions.map((res) => {
                    const val = `${res.width}x${res.height}`;
                    return (
                      <div key={val} className="flex items-center space-x-2">
                        <RadioGroupItem value={val} id={val} />
                        <Label
                          htmlFor={val}
                          className="cursor-pointer font-normal text-sm"
                        >
                          {res.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Audio Input Selection */}
            <div className="space-y-3">
              <Label>Audio Input</Label>
              <Select
                value={selectedAudioId || undefined}
                onValueChange={setSelectedAudioId}
                disabled={state !== "idle" || audioInputs.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      audioInputs.length === 0
                        ? "No microphones detected"
                        : "Select microphone"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {audioInputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || "Microphone"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t">
              {state === "idle" && (
                <Button
                  onClick={startRecording}
                  disabled={!selectedResolution}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Circle className="h-5 w-5 fill-current" />
                  Start Recording
                </Button>
              )}

              {state !== "idle" && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-lg">
                    <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
                    <span className="font-mono text-sm">
                      {formatElapsed(elapsedMs)}
                    </span>
                  </div>
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Square className="h-5 w-5" />
                    Stop
                  </Button>
                  <Button
                    onClick={
                      state === "paused" ? resumeRecording : pauseRecording
                    }
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    {state === "paused" ? (
                      <>
                        <Play className="h-5 w-5" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-5 w-5" />
                        Pause
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {showPreview && recordedVideoUrl && (
        <Dialog open={showPreview} onOpenChange={closePreview}>
          <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>
                {uploadSuccess
                  ? "Upload Complete!"
                  : isUploading
                  ? "Uploading..."
                  : "Recording Complete"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {uploadSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xl text-white">✓</span>
                  </div>
                  <h4 className="text-base font-semibold">
                    Video uploaded successfully!
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {uploadedVideoId
                      ? "Redirecting to video page..."
                      : "Video uploaded but could not redirect automatically."}
                  </p>
                </div>
              ) : isUploading ? (
                <div className="py-6 space-y-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    Uploading your recording... {uploadProgress}%
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden max-h-48">
                    <video
                      src={recordedVideoUrl}
                      controls
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}
            </div>

            {!uploadSuccess && !isUploading && (
              <div className="flex items-center gap-3 pt-4 border-t shrink-0">
                <Button
                  variant="outline"
                  onClick={downloadVideo}
                  disabled={isUploading}
                  className="flex items-center gap-2 flex-1"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  onClick={uploadToCloud}
                  disabled={isUploading}
                  className="flex items-center gap-2 flex-1"
                >
                  <Upload className="h-4 w-4" />
                  Upload to Cloud
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
