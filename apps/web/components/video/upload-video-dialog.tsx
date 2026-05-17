"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Progress } from "@workspace/ui/components/progress"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Upload, FileVideo, X, CheckCircle2, Loader2 } from "lucide-react"
import { useState, useRef } from "react"
import axios from "axios"
import { toast } from "sonner"
import { useCaptureStore } from "@/context"

interface UploadVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadVideoDialog({
  open,
  onOpenChange,
}: UploadVideoDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addVideo } = useCaptureStore()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith("video/")) {
        toast.error("Please select a valid video file.")
        return
      }
      setFile(selectedFile)
      setSuccess(false)
      setProgress(0)
    }
  }

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      video.src = URL.createObjectURL(file)
    })
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      setProgress(0)

      // 1. Get video duration
      const duration = await getDuration(file)

      // 2. Get presigned URL for upload
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`
      const presignedResponse = await axios.get("/api/s3/presigned-url", {
        params: {
          fileName,
          contentType: file.type,
        },
      })

      const { url, key } = presignedResponse.data

      // 3. Upload directly to S3/R2
      await axios.put(url, file, {
        headers: {
          "Content-Type": file.type,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || file.size)
          )
          setProgress(percentCompleted)
        },
      })

      toast.info("Registering video...")

      // 4. Register in database
      const videoData = {
        name: file.name,
        description: "Uploaded via Capture Web",
        path: key,
        duration: duration && isFinite(duration) ? Math.floor(duration) : 0,
        byteSize: file.size,
        format: file.type,
      }

      const videoResponse = await axios.post("/api/videos", videoData)
      const { newVideo } = videoResponse.data

      if (newVideo) {
        // 5. Get a signed download URL for the new video
        const signedUrlResponse = await axios.get(
          `/api/s3/signed-url?key=${key}`
        )
        const { url: downloadUrl } = signedUrlResponse.data

        // 6. Update global store
        addVideo({
          id: newVideo.id,
          title: newVideo.title,
          url: downloadUrl,
          thumbnail: "",
          duration: newVideo.duration,
          createdAt: new Date(newVideo.createdAt),
        })
      }

      setSuccess(true)
      toast.success("Video uploaded successfully!")

      // Reset after a short delay
      setTimeout(() => {
        onOpenChange(false)
        setFile(null)
        setSuccess(false)
        setProgress(0)
      }, 2000)
    } catch (error: any) {
      console.error("Upload failed:", error)
      toast.error(
        error.response?.data?.error ||
          "Failed to upload video. Please try again."
      )
    } finally {
      setUploading(false)
    }
  }

  const resetFile = () => {
    setFile(null)
    setProgress(0)
    setSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription>
            Choose a video file to upload to your library.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4">
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP4, WebM, or QuickTime (max 100MB)
                  </p>
                </div>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative flex items-center rounded-xl border bg-muted/30 p-4">
              <div className="mr-4 rounded-lg bg-primary/10 p-2">
                <FileVideo className="h-6 w-6 text-primary" />
              </div>
              <div className="mr-8 min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!uploading && !success && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-full"
                  onClick={resetFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {success && (
                <div className="absolute top-1/2 right-4 -translate-y-1/2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {success && (
            <div className="flex animate-in items-center justify-center gap-2 text-sm font-medium text-green-500 duration-300 fade-in zoom-in">
              <CheckCircle2 className="h-4 w-4" />
              <span>Upload complete!</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading || success}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading
              </>
            ) : success ? (
              "Done"
            ) : (
              "Upload Video"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
