"use client"

import { VideoCard } from "@/components/video/VideoCard"
import { RecordVideoDialog } from "@/components/video/record-video-dialog"
import { UploadVideoDialog } from "@/components/video/upload-video-dialog"
import { authClient } from "@/lib/auth-client"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  ArrowRight,
  Clock,
  HardDrive,
  History,
  Sparkles,
  TrendingUp,
  Upload,
  Video,
  Video as VideoIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

interface VideoData {
  id: string
  title: string | null
  description: string | null
  url: string | null
  duration: number | null
  privacy: string
  createdAt: string
  updatedAt: string
  user?: {
    name: string | null
    image: string | null
  }
}

function VideoSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-accent/5">
      <div className="aspect-video bg-accent/10" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-accent/10" />
        <div className="h-3 w-1/2 rounded bg-accent/10" />
        <div className="flex items-center justify-between border-t border-accent/10 pt-4">
          <div className="h-4 w-4 rounded-full bg-accent/10" />
          <div className="h-3 w-16 rounded bg-accent/10" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const session = authClient.useSession()
  const user = session.data?.user

  const [videos, setVideos] = useState<VideoData[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [videoToDelete, setVideoToDelete] = useState<VideoData | null>(null)

  const [isRecordOpen, setIsRecordOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const fetchVideos = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/videos`)
      if (!response.ok) {
        throw new Error("Failed to fetch videos")
      }
      const data = await response.json()
      setVideos(data || [])
    } catch (error) {
      console.error("Error fetching videos:", error)
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleVideoClick = (video: VideoData) => {
    router.push(`/video/${video.id}`)
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (isDeleting) return
    setIsDeleting(videoId)
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete video")
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
      toast.success("Video deleted successfully")
      setVideoToDelete(null)
    } catch (error) {
      console.error("Error deleting video:", error)
      toast.error("Failed to delete video. Please try again.")
    } finally {
      setIsDeleting(null)
    }
  }

  // Compute stats
  const totalVideos = videos.length
  const recentVideos = videos.slice(0, 3) // Get 3 most recent

  // Simulated storage calculation: each video is about ~15MB on average for the demo
  const estimatedStorageUsed = (totalVideos * 15.4).toFixed(1)
  const storageLimit = 1000 // 1 GB (1000 MB)
  const storagePercentage = Math.min(
    100,
    Math.max(2, (parseFloat(estimatedStorageUsed) / storageLimit) * 100)
  )

  return (
    <div className="container mx-auto max-w-7xl space-y-12 p-6 lg:p-10">
      {/* Sleek Minimalist Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-accent/15 pb-8 md:flex-row md:items-center">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || "Recorder"}! 👋
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Create screen captures, manage library records, and explore
            auto-generated transcripts with your AI assistant.
          </p>
        </div>

        {/* Minimal Statistics */}
        <div className="flex items-center gap-6">
          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <HardDrive className="h-3.5 w-3.5" /> Storage Used
            </span>
            <p className="text-xl font-bold">{estimatedStorageUsed} MB</p>
          </div>
          <div className="h-8 w-px bg-accent/20" />
          <div className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Total Videos
            </span>
            <p className="text-xl font-bold">{totalVideos}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Record Screen */}
          <button
            onClick={() => setIsRecordOpen(true)}
            className="group flex items-start gap-4 rounded-xl border border-accent/15 bg-accent/5 p-6 text-left transition-all hover:border-accent/30 hover:bg-accent/10"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
              <Video className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Record Screen</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Capture screen, chrome tabs, microphone, and system audio inputs
                on-demand.
              </p>
            </div>
          </button>

          {/* Upload Video */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="group flex items-start gap-4 rounded-xl border border-accent/15 bg-accent/5 p-6 text-left transition-all hover:border-accent/30 hover:bg-accent/10"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
              <Upload className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">Upload Video</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Import local `.webm` or `.mp4` video captures to access
                automated transcript tools.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Videos Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <History className="h-5 w-5 text-muted-foreground" /> Recent
            Recordings
          </h2>
          {totalVideos > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/library")}
              className="gap-1 rounded-lg text-xs font-semibold transition-colors hover:bg-accent/10"
            >
              View Full Library <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <VideoSkeleton key={index} />
            ))
          ) : totalVideos === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-accent/15 bg-accent/5 py-16">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <VideoIcon className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <h3 className="mb-1 text-base font-semibold">No videos yet</h3>
              <p className="mb-6 max-w-xs text-center text-xs text-muted-foreground">
                Start recording or upload a clip above to build your capture
                library.
              </p>
            </div>
          ) : (
            recentVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={handleVideoClick}
                onDelete={setVideoToDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Sleek Minimalist Promotional Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-accent/15 bg-accent/5 p-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-accent/20 px-2 py-0.5 text-[10px] tracking-wider uppercase"
            >
              AI Support
            </Badge>
            <h3 className="flex items-center gap-1.5 text-base font-bold">
              AI Summaries & Chat Assistant{" "}
              <Sparkles className="h-4 w-4 fill-current text-yellow-500" />
            </h3>
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            Get instant summarizations, full searchable auto-transcripts, and
            chat with an intelligent LLM trained explicitly on your recording
            data. Click on any video card in your library to start iterating.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/library")}
          className="self-start rounded-lg border-accent/20 px-4 py-2 text-xs font-semibold hover:bg-accent/10 md:self-auto"
        >
          Explore Assistant
        </Button>
      </div>

      {/* Record Dialog Trigger */}
      <RecordVideoDialog open={isRecordOpen} onOpenChange={setIsRecordOpen} />

      {/* Upload Dialog Trigger */}
      <UploadVideoDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />

      {/* Confirmation Dialog for Deletions */}
      <AlertDialog
        open={!!videoToDelete}
        onOpenChange={(open) => !open && setVideoToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              video{" "}
              <span className="font-semibold text-foreground">
                "{videoToDelete?.title || "Untitled Video"}"
              </span>{" "}
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none bg-accent/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                videoToDelete && handleDeleteVideo(videoToDelete.id)
              }
              className="text-destructive-foreground rounded-xl bg-destructive hover:bg-destructive/90"
              disabled={!!isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Video"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
