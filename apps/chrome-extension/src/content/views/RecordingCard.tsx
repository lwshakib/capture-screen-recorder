import axios from "axios"
import {
  Play,
  Square,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
} from "lucide-react"
import { useRef, useState } from "react"
import { WEB_URL } from "../../lib/constants"
import { logger } from "../../utils/logger"

/**
 * RecordingCard Component
 * The primary controller for the capture process. Handles screen sharing,
 * audio mixing, media recording, and final file uploads to S3.
 */

type RecorderState = "idle" | "recording" | "paused"

function RecordingCard() {
  const [state, setState] = useState<RecorderState>("idle")
  const [error, setError] = useState<string | null>(null)

  // Media pipeline refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const combinedStreamRef = useRef<MediaStream | null>(null)

  // Post-recording state
  const [showModal, setShowModal] = useState(false)
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)

  // Upload status and progress tracking
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Timer state
  const timerIntervalRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef<number>(0)
  const [elapsedMs, setElapsedMs] = useState<number>(0)

  /**
   * Screen Recording Orchestration
   */
  const startRecording = async () => {
    try {
      setError(null)
      // Step 1: Capture screen/window
      const resJSON = localStorage.getItem("capture_resolution_selected")
      const res = resJSON ? JSON.parse(resJSON) : { width: 1280, height: 720 }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: res.width, height: res.height },
        audio: true,
      })

      // Step 2: Capture Microphone
      let micStream: MediaStream | null = null
      const micId = localStorage.getItem("capture_audioinput_selected")
      if (micId) {
        micStream = await navigator.mediaDevices
          .getUserMedia({
            audio: { deviceId: { exact: micId } },
          })
          .catch(() => null)
      }

      // Step 3: Mix Audio and Video
      const combined = new MediaStream()
      displayStream.getVideoTracks().forEach((t) => combined.addTrack(t))

      const audioTrack =
        micStream?.getAudioTracks()[0] || displayStream.getAudioTracks()[0]
      if (audioTrack) combined.addTrack(audioTrack)

      combinedStreamRef.current = combined

      // Step 4: Initialize Recorder
      const recorder = new MediaRecorder(combined, {
        mimeType: "video/webm;codecs=vp9,opus",
      })
      mediaRecorderRef.current = recorder
      recordedChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        })
        setRecordedVideoBlob(finalBlob)
        setRecordedVideoUrl(URL.createObjectURL(finalBlob))
        setShowModal(true)
        cleanup()
      }

      displayStream.getVideoTracks()[0].onended = () => stopRecording()

      recorder.start(1000)
      setState("recording")
      startedAtRef.current = Date.now()
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedMs(
          accumulatedMsRef.current + (Date.now() - (startedAtRef.current || 0))
        )
      }, 200)

      // Notify App of recording state
      window.dispatchEvent(
        new CustomEvent("capture:recording-state", {
          detail: { recording: true },
        })
      )
    } catch (err: any) {
      setError(err.message || "Failed to start recording")
      logger.error("Recording start failed", err)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setState("idle")
    window.dispatchEvent(
      new CustomEvent("capture:recording-state", {
        detail: { recording: false },
      })
    )
  }

  const cleanup = () => {
    combinedStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current)
    accumulatedMsRef.current = 0
    setElapsedMs(0)
  }

  /**
   * S3 Upload Flow (Mirrors Desktop App)
   */
  const uploadToS3 = async () => {
    if (!recordedVideoBlob) return
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const { authToken } = await chrome.storage.local.get("authToken")
      if (!authToken) throw new Error("Please sign in to upload")

      const rawToken = authToken || ""
      const cleanToken =
        typeof rawToken === "string"
          ? rawToken.replace(/^["']+|["']+$/g, "")
          : ""
      const fileName = `capture-extension-${Date.now()}.webm`

      // 1. Get Presigned URL
      const presignedRes = await axios.get(`${WEB_URL}/api/s3/presigned-url`, {
        params: { fileName, contentType: recordedVideoBlob.type },
        headers: { Authorization: `Bearer ${cleanToken}` },
      })
      const { url: uploadUrl, key } = presignedRes.data

      // 2. Direct S3 Upload
      await axios.put(uploadUrl, recordedVideoBlob, {
        headers: { "Content-Type": recordedVideoBlob.type },
        onUploadProgress: (p) => {
          setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1)))
        },
      })

      // 3. Register Video
      await axios.post(
        `${WEB_URL}/api/token/videos`,
        {
          title: `Extension Recording - ${new Date().toLocaleDateString()}`,
          description: `Recorded via Chrome Extension on ${window.location.hostname}`,
          path: key,
          byteSize: recordedVideoBlob.size,
          duration: isFinite(elapsedMs) ? Math.floor(elapsedMs / 1000) : 0,
          format: recordedVideoBlob.type,
        },
        {
          headers: { Authorization: `Bearer ${cleanToken}` },
        }
      )

      setUploadSuccess(true)
      logger.info("Extension recording uploaded and registered successfully")
    } catch (err: any) {
      setError(err.message || "Upload failed")
      logger.error("Upload failed", err)
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="recording-card pointer-events-auto flex w-[280px] flex-col gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state === "recording" && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          )}
          <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">
            {state === "recording" ? "Live Recording" : "Recorder Ready"}
          </span>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
          <span className="text-[10px] font-bold text-primary tabular-nums">
            {formatTime(elapsedMs)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {state === "idle" ? (
          <button
            onClick={startRecording}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-current" />
            Start Capture
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="text-destructive-foreground flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-xs font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop Recording
          </button>
        )}

        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-accent/50 transition-colors hover:bg-accent">
          <Camera className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[10px] leading-tight font-medium text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {/* Preview Modal */}
      {showModal && (
        <div className="pointer-events-auto fixed inset-0 z-[6000] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-in overflow-hidden rounded-3xl border border-border bg-card shadow-2xl duration-200 zoom-in-95">
            <div className="border-bottom flex items-center justify-between border-border bg-accent/5 p-4">
              <h3 className="text-sm font-bold tracking-tight uppercase">
                Review Recording
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-inner">
                <video
                  src={recordedVideoUrl || ""}
                  controls
                  className="h-full w-full object-contain"
                />
              </div>

              {uploadSuccess ? (
                <div className="flex animate-in flex-col items-center justify-center py-6 text-center fade-in slide-in-from-bottom-4">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-green-500">Upload Complete!</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your video is now available in your Capture library.
                  </p>
                  <button
                    onClick={() => setShowModal(false)}
                    className="mt-6 rounded-xl bg-primary px-6 py-2 text-xs font-bold text-primary-foreground"
                  >
                    Close Preview
                  </button>
                </div>
              ) : isUploading ? (
                <div className="flex flex-col gap-3 px-2 py-4">
                  <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    <span>Uploading to Cloud</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
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
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={uploadToS3}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Upload className="h-4 w-4" />
                    Upload to Capture
                  </button>
                  <a
                    href={recordedVideoUrl || ""}
                    download={`capture-${Date.now()}.webm`}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary text-xs font-bold text-secondary-foreground transition-all hover:bg-accent"
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
  )
}

export default RecordingCard
