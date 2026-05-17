import axios from "axios";
import { 
  Play, 
  Square, 
  Upload, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Camera
} from "lucide-react";
import { useRef, useState } from "react";
import { WEB_URL } from "../../lib/constants";
import { logger } from "../../utils/logger";

/**
 * RecordingCard Component
 * The primary controller for the capture process. Handles screen sharing,
 * audio mixing, media recording, and final file uploads to S3.
 */

type RecorderState = "idle" | "recording" | "paused";

function RecordingCard() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  
  // Media pipeline refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  
  // Post-recording state
  const [showModal, setShowModal] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  
  // Upload status and progress tracking
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Timer state
  const timerIntervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  /**
   * Screen Recording Orchestration
   */
  const startRecording = async () => {
    try {
      setError(null);
      // Step 1: Capture screen/window
      const resJSON = localStorage.getItem("capture_resolution_selected");
      const res = resJSON ? JSON.parse(resJSON) : { width: 1280, height: 720 };
      
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: res.width, height: res.height },
        audio: true,
      });

      // Step 2: Capture Microphone
      let micStream: MediaStream | null = null;
      const micId = localStorage.getItem("capture_audioinput_selected");
      if (micId) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: micId } },
        }).catch(() => null);
      }

      // Step 3: Mix Audio and Video
      const combined = new MediaStream();
      displayStream.getVideoTracks().forEach(t => combined.addTrack(t));
      
      const audioTrack = micStream?.getAudioTracks()[0] || displayStream.getAudioTracks()[0];
      if (audioTrack) combined.addTrack(audioTrack);
      
      combinedStreamRef.current = combined;

      // Step 4: Initialize Recorder
      const recorder = new MediaRecorder(combined, { 
        mimeType: "video/webm;codecs=vp9,opus" 
      });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        setRecordedVideoBlob(finalBlob);
        setRecordedVideoUrl(URL.createObjectURL(finalBlob));
        setShowModal(true);
        cleanup();
      };

      displayStream.getVideoTracks()[0].onended = () => stopRecording();

      recorder.start(1000);
      setState("recording");
      startedAtRef.current = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - (startedAtRef.current || 0)));
      }, 200);

      // Notify App of recording state
      window.dispatchEvent(new CustomEvent("capture:recording-state", { detail: { recording: true } }));

    } catch (err: any) {
      setError(err.message || "Failed to start recording");
      logger.error("Recording start failed", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setState("idle");
    window.dispatchEvent(new CustomEvent("capture:recording-state", { detail: { recording: false } }));
  };

  const cleanup = () => {
    combinedStreamRef.current?.getTracks().forEach(t => t.stop());
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
  };

  /**
   * S3 Upload Flow (Mirrors Desktop App)
   */
  const uploadToS3 = async () => {
    if (!recordedVideoBlob) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      const { authToken } = await chrome.storage.local.get("authToken");
      if (!authToken) throw new Error("Please sign in to upload");
      
      const rawToken = authToken || "";
      const cleanToken = typeof rawToken === "string" ? rawToken.replace(/^["']+|["']+$/g, "") : "";
      const fileName = `capture-extension-${Date.now()}.webm`;

      // 1. Get Presigned URL
      const presignedRes = await axios.get(`${WEB_URL}/api/s3/presigned-url`, {
        params: { fileName, contentType: recordedVideoBlob.type },
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      const { url: uploadUrl, key } = presignedRes.data;

      // 2. Direct S3 Upload
      await axios.put(uploadUrl, recordedVideoBlob, {
        headers: { "Content-Type": recordedVideoBlob.type },
        onUploadProgress: (p) => {
          setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1)));
        }
      });

      // 3. Register Video
      await axios.post(`${WEB_URL}/api/token/videos`, {
        title: `Extension Recording - ${new Date().toLocaleDateString()}`,
        description: `Recorded via Chrome Extension on ${window.location.hostname}`,
        path: key,
        byteSize: recordedVideoBlob.size,
        duration: isFinite(elapsedMs) ? Math.floor(elapsedMs / 1000) : 0,
        format: recordedVideoBlob.type
      }, {
        headers: { Authorization: `Bearer ${cleanToken}` }
      });

      setUploadSuccess(true);
      logger.info("Extension recording uploaded and registered successfully");
    } catch (err: any) {
      setError(err.message || "Upload failed");
      logger.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recording-card pointer-events-auto flex flex-col gap-2 p-3 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl w-[280px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state === "recording" && (
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {state === "recording" ? "Live Recording" : "Recorder Ready"}
          </span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
          <span className="text-[10px] font-bold tabular-nums text-primary">{formatTime(elapsedMs)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {state === "idle" ? (
          <button 
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 h-10 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Capture
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 h-10 bg-destructive text-destructive-foreground rounded-xl font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-destructive/20"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop Recording
          </button>
        )}
        
        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent/50 border border-border hover:bg-accent transition-colors">
          <Camera className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-medium leading-tight">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {/* Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-bottom border-border bg-accent/5">
              <h3 className="font-bold text-sm uppercase tracking-tight">Review Recording</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
                <video 
                  src={recordedVideoUrl || ''} 
                  controls 
                  className="w-full h-full object-contain"
                />
              </div>

              {uploadSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in slide-in-from-bottom-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-green-500">Upload Complete!</h4>
                  <p className="text-xs text-muted-foreground mt-1">Your video is now available in your Capture library.</p>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold"
                  >
                    Close Preview
                  </button>
                </div>
              ) : isUploading ? (
                <div className="flex flex-col gap-3 py-4 px-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Uploading to Cloud</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing upload...
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={uploadToS3}
                    className="flex-1 flex items-center justify-center gap-2 h-11 bg-primary text-primary-foreground rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    Upload to Capture
                  </button>
                  <a 
                    href={recordedVideoUrl || ''} 
                    download={`capture-${Date.now()}.webm`}
                    className="flex-1 flex items-center justify-center gap-2 h-11 bg-secondary text-secondary-foreground rounded-2xl font-bold text-xs border border-border hover:bg-accent transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Save Locally
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordingCard;
