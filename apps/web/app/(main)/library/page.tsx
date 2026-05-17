"use client";

import { VideoCard } from "@/components/video/VideoCard";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Video as VideoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

/**
 * Video Interface
 * Defines the structure of a video object as returned by the API.
 */
interface Video {
  id: string;
  title: string | null;
  description: string | null;
  url: string | null;
  duration: number | null;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string | null;
    image: string | null;
  };
}

/**
 * VideoSkeleton Component
 */
function VideoSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-accent/5 animate-pulse">
      <div className="aspect-video bg-accent/10" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-accent/10 rounded" />
        <div className="h-3 w-1/2 bg-accent/10 rounded" />
        <div className="pt-4 flex justify-between items-center border-t border-accent/10">
          <div className="h-4 w-4 bg-accent/10 rounded-full" />
          <div className="h-3 w-16 bg-accent/10 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * VideosPage (My Library)
 */
export default function VideosPage() {
  // ... state and logic remain the same ...
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/videos`);
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("Failed to load videos. Please try again.");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoClick = (video: Video) => {
    router.push(`/video/${video.id}`);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (isDeleting) return;
    setIsDeleting(videoId);
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete video");
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast.success("Video deleted successfully");
      setVideoToDelete(null);
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-6 lg:p-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            My Library
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage and view your captured recordings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="px-3 py-1 text-xs font-medium bg-accent/10 border-none"
          >
            {videos.length} {videos.length === 1 ? "Video" : "Videos"}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-2xl flex items-center justify-between">
            <p className="font-medium">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchVideos}
              className="text-destructive hover:bg-destructive/20 underline-offset-4 hover:underline"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <VideoSkeleton key={index} />
            ))
          ) : error ? null : videos.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-accent/5 rounded-3xl border-2 border-dashed border-accent/10">
              <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <VideoIcon className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
              <p className="text-muted-foreground text-center max-w-xs mb-8">
                Start recording your screen to see your videos here.
              </p>
            </div>
          ) : (
            videos.map((video) => (
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              disabled={!!isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Video"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
