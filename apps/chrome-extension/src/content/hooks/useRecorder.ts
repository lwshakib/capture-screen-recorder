import { useState, useRef } from "react"
import axios from "axios"
import { WEB_URL } from "../../lib/constants"
import { logger } from "../../utils/logger"

export type RecorderState = "idle" | "recording" | "paused"

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle")
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const combinedStreamRef = useRef<MediaStream | null>(null)

  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const timerIntervalRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef<number>(0)
  const [elapsedMs, setElapsedMs] = useState<number>(0)

  const startRecording = async () => {
    try {
      setError(null)
      const resJSON = localStorage.getItem("capture_resolution_selected")
      const res = resJSON ? JSON.parse(resJSON) : { width: 1280, height: 720 }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: res.width, height: res.height },
        audio: true,
      })

      let micStream: MediaStream | null = null
      const micId = localStorage.getItem("capture_audioinput_selected")
      if (micId) {
        micStream = await navigator.mediaDevices
          .getUserMedia({
            audio: { deviceId: { exact: micId } },
          })
          .catch(() => null)
      }

      const combined = new MediaStream()
      displayStream.getVideoTracks().forEach((t) => combined.addTrack(t))

      const audioTrack =
        micStream?.getAudioTracks()[0] || displayStream.getAudioTracks()[0]
      if (audioTrack) combined.addTrack(audioTrack)

      combinedStreamRef.current = combined

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

  const uploadToS3 = async () => {
    if (!recordedVideoBlob) return
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const { authToken } = await chrome.storage.local.get("authToken")
      if (!authToken) throw new Error("Please sign in to upload")

      const cleanToken =
        typeof authToken === "string"
          ? authToken.replace(/^["']+|["']+$/g, "")
          : ""
      const fileName = `capture-extension-${Date.now()}.webm`

      const presignedRes = await axios.get(`${WEB_URL}/api/s3/presigned-url`, {
        params: { fileName, contentType: recordedVideoBlob.type },
        headers: { Authorization: `Bearer ${cleanToken}` },
      })
      const { url: uploadUrl, key } = presignedRes.data

      await axios.put(uploadUrl, recordedVideoBlob, {
        headers: { "Content-Type": recordedVideoBlob.type },
        onUploadProgress: (p) => {
          setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1)))
        },
      })

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
    } catch (err: any) {
      setError(err.message || "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const reset = () => {
    setRecordedVideoBlob(null)
    setRecordedVideoUrl(null)
    setUploadSuccess(false)
    setUploadProgress(0)
    setError(null)
  }

  return {
    state,
    error,
    startRecording,
    stopRecording,
    uploadToS3,
    recordedVideoUrl,
    isUploading,
    uploadProgress,
    uploadSuccess,
    elapsedMs,
    reset,
  }
}
