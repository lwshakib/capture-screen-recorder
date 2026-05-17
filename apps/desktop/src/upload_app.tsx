import axios, { AxiosProgressEvent } from "axios"
import { Minimize2, X } from "lucide-react"
import React, { useCallback, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Progress } from "@workspace/ui/components/progress"
import { httpClient } from "./lib/httpClient"
import { logger } from "./lib/logger"

// Interface for tracking the upload status
interface UploadState {
  isUploading: boolean // True while file is being sent to server
  progress: number // Percentage 0-100
  error: string | null // Error message if upload fails
  success: boolean // True after successful upload
  filename?: string // Name of the file being uploaded
}

export default function UploadApp() {
  // State initialization
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
    filename: undefined,
  })

  // Use refs to ensure proper cleanup and prevent duplicate listeners or race conditions
  const hasSetupListener = useRef(false) // Prevents attaching multiple IPC listeners
  const isProcessingUpload = useRef(false) // Prevents overlapping uploads
  const processedRecordings = useRef(new Set<string>()) // Deduplication set for recording IDs

  const handleCloseWindow = useCallback(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("close-upload-window")
    }
  }, [])

  const handleMinimizeWindow = useCallback(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("minimize-upload-window")
    }
  }, [])

  // Main upload logic: Uploads file to Cloudinary and then registers it with the backend
  const handleUpload = useCallback(
    async (videoBlob: Blob, filename?: string) => {
      // Create a unique identifier for this specific recording blob to prevent duplicates
      const recordingId = `${filename}-${videoBlob.size}-${Date.now()}`

      // Check if we're already processing an upload or if this recording was already processed
      if (
        isProcessingUpload.current ||
        processedRecordings.current.has(recordingId)
      ) {
        logger.debug(
          "Upload already in progress or recording already processed",
          { recordingId }
        )
        return
      }

      try {
        isProcessingUpload.current = true
        processedRecordings.current.add(recordingId)

        // Update UI to show upload starting
        setUploadState({
          isUploading: true,
          progress: 0,
          error: null,
          success: false,
          filename: filename,
        })

        // Step 1: Get S3 presigned URL
        const authToken = (await window.ipcRenderer.invoke(
          "get-token"
        )) as string
        if (!authToken) {
          throw new Error(
            "Authentication token not found. Please sign in first."
          )
        }
        const cleanToken = authToken.replace(/^["']+|["']+$/g, "")

        const s3FileName = filename || `capture-recording-${Date.now()}.webm`
        const { data: s3Data } = await httpClient.get("/api/s3/presigned-url", {
          params: {
            fileName: s3FileName,
            contentType: videoBlob.type || "video/webm",
          },
          headers: {
            Authorization: `Bearer ${cleanToken}`,
          },
        })

        // Step 2: Upload directly to S3
        await axios.put(s3Data.url, videoBlob, {
          headers: {
            "Content-Type": videoBlob.type || "video/webm",
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              setUploadState((prev) => ({ ...prev, progress }))
            }
          },
        })

        // Step 3: Handle successful upload
        setUploadState({
          isUploading: false,
          progress: 100,
          error: null,
          success: true,
          filename: filename,
        })

        // Step 4: Register the video in our backend database
        const res = await httpClient.post(
          "/api/token/videos",
          {
            title: filename || `capture-recording-${Date.now()}`,
            description:
              filename ||
              `Screen recording uploaded at ${new Date().toLocaleString()}`,
            path: s3Data.key,
            width: null, // Desktop app doesn't always know dimensions here easily
            height: null,
            byteSize: videoBlob.size,
            duration: null, // Duration is often added after processing or by web app
            format: videoBlob.type || "video/webm",
          },
          {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
            },
          }
        )

        logger.info("Video record created", { recordId: res.data.id })

        // Open the video URL in the browser
        if (res.data.redirectUrl) {
          const videoUrl = res.data.redirectUrl
          logger.info("Opening video URL", { videoUrl })
          window.ipcRenderer.send("open-url", videoUrl)
        }

        logger.info("Upload successful", {
          path: s3Data.key,
        })
      } catch (error) {
        // Handle failures (network error, auth error, etc.)
        logger.error("Upload failed", error)
        setUploadState({
          isUploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : "Upload failed",
          success: false,
          filename: filename,
        })
        // Remove from processed set on error so it can be retried if needed
        processedRecordings.current.delete(recordingId)
      } finally {
        isProcessingUpload.current = false
      }
    },
    []
  )

  // Listen for recording data from main process attached to this window
  React.useEffect(() => {
    // Only set up the listener once
    if (hasSetupListener.current) {
      return
    }

    logger.debug("Setting up IPC listener for recording-data")
    hasSetupListener.current = true

    // Callback that receives raw video data from Electron Main Process
    const handleRecordingData = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const data = args[0] as {
        type: string
        blob: number[] // Raw byte array (u8)
        filename: string
        mimeType: string
      }

      logger.debug("Received recording data event", {
        filename: data.filename,
        type: data.type,
      })

      if (data && data.type === "video-blob") {
        // Convert the array of numbers back to a Blob for upload
        const uint8Array = new Uint8Array(data.blob)
        const videoBlob = new Blob([uint8Array], { type: data.mimeType })

        logger.debug("Converted to Blob", {
          filename: data.filename,
          size: videoBlob.size,
        })

        // Trigger automatic upload
        handleUpload(videoBlob, data.filename)
      } else {
        logger.warn("Invalid data format received", { data })
      }
    }

    // Listen for IPC messages from main process
    if (window.ipcRenderer) {
      window.ipcRenderer.on("recording-data", handleRecordingData)
    }

    const currentRecordings = processedRecordings.current

    // Cleanup function
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeListener("recording-data", handleRecordingData)
      }
      hasSetupListener.current = false
      // Clear processed recordings on cleanup to allow re-uploads if window is reused
      currentRecordings.clear()
    }
  }, [handleUpload]) // Empty dependency array to ensure this only runs once

  return (
    <div className="draggable min-h-screen bg-background p-6">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMinimizeWindow}
            className="non-draggable h-8 w-8 cursor-pointer p-0"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseWindow}
            className="non-draggable h-8 w-8 cursor-pointer p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Upload Progress */}
        {uploadState.isUploading && (
          <div className="space-y-4 rounded-lg border p-4 text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading to Default Workspace...</span>
                <span>{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="w-full" />
              {uploadState.filename && (
                <p className="text-xs text-muted-foreground">
                  {uploadState.filename}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {uploadState.success && !uploadState.isUploading && (
          <div className="rounded-lg border p-4 text-center">
            <p className="text-sm text-foreground">Upload Successful</p>
            {uploadState.filename && (
              <p className="mt-1 text-xs text-muted-foreground">
                {uploadState.filename}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {uploadState.error && !uploadState.isUploading && (
          <div className="rounded-lg border p-4 text-center">
            <p className="text-sm text-foreground">Upload Failed</p>
            {uploadState.filename && (
              <p className="mt-1 text-xs text-muted-foreground">
                {uploadState.filename}
              </p>
            )}
          </div>
        )}

        {/* Default State - Show when not uploading, no success, no error */}
        {!uploadState.isUploading &&
          !uploadState.success &&
          !uploadState.error && (
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Waiting for recording data...
              </p>
            </div>
          )}
      </div>
    </div>
  )
}
