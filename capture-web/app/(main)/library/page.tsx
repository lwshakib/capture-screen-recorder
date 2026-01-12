"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Video as VideoIcon,
  Play,
  MoreVertical,
  Shield,
  Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";

/**
 * Video Interface
 * Defines the structure of a video object as returned by the API.
 */
interface Video {
  id: string;
  name: string | null;
  description: string | null;
  thumbnail_url: string | null;
  videoUrl: string | null;
  duration: string | null;
  status: string;
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
 * Displayed while videos are loading. 
 * Provides a "shimmering" layout that matches the real Video Card.
 */
function VideoSkeleton() {
  return (
    <Card className="overflow-hidden border-none bg-accent/5 shadow-none">
      <CardContent className="p-0">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * VideosPage (My Library)
 * This is the dashboard where users can see all their recorded videos.
 * Features:
 * - Real-time video list fetching.
 * - Video deletion with confirmation.
 * - Navigation to video details page.
 * - Responsive grid layout.
 */
export default function VideosPage() {
  // --- State Management ---
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Stores ID of video currently being deleted
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null); // Target for Alert Dialog
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Data Fetching Logic:
   * Fetches all videos for the authenticated user from the backend.
   */
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/all-videos`);
      if (!response.ok) {
        throw new Error("Failed to fetch videos");
      }
      const data = await response.json();
      if (data.videos) {
        setVideos(data.videos);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError("Failed to load videos. Please try again.");
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Navigate to detailed view
  const handleVideoClick = (video: Video) => {
    router.push(`/video/${video.id}`);
  };

  /**
   * Deletion Flow:
   * 1. Send DELETE request to API.
   * 2. Remove video from local state on success.
   * 3. Show notification.
   */
  const handleDeleteVideo = async (videoId: string) => {
    if (isDeleting) return;

    setIsDeleting(videoId);
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete video");
      }

      // Optimistic/Immediate UI update
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
      {/* Page Header Area */}
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
        {/* Error Notification Banner */}
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

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {isLoading ? (
            // Show skeletons while loading
            Array.from({ length: 8 }).map((_, index) => (
              <VideoSkeleton key={index} />
            ))
          ) : error ? null : videos.length === 0 ? (
            // Empty State UI
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-accent/5 rounded-3xl border-2 border-dashed border-accent/10">
              <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <VideoIcon className="h-10 w-10 text-muted-foreground opacity-40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
              <p className="text-muted-foreground text-center max-w-xs mb-8">
                Start recording your screen to see your videos here.
              </p>
            </div>
          ) : (
            // Actual Video Cards
            videos.map((video) => (
              <Card
                key={video.id}
                className="group relative overflow-hidden border-none bg-accent/5 hover:bg-accent/10 transition-all duration-300 shadow-none cursor-pointer rounded-2xl"
                onClick={() => handleVideoClick(video)}
              >
                <CardContent className="p-0">
                  {/* Thumbnail Area */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.name || "Video Thumbnail"}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                        <VideoIcon className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}

                    {/* Overlay Play Button (Visible on Hover) */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="h-6 w-6 text-white fill-white ml-1" />
                      </div>
                    </div>

                    {/* Meta Badges (Duration & Privacy) */}
                    {video.duration && (
                      <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white tracking-wider">
                        {video.duration}
                      </div>
                    )}

                    <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm">
                      {video.privacy === "public" ? (
                        <Globe className="h-3 w-3 text-white" />
                      ) : (
                        <Shield className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {video.name || "Untitled Video"}
                      </h3>
                      
                      {/* Context Menu (Actions) Area */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()} // Prevent card click navigation
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mt-1 -mr-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoClick(video);
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={(e) => {
                              e.preventDefault(); // Keep menu open for dialog
                              setVideoToDelete(video);
                            }}
                          >
                            Delete Video
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Optional Video Description */}
                    {video.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}

                    {/* Footer Info (User & Date) */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                          {video.user?.image ? (
                            <Image
                              src={video.user.image}
                              alt={video.user.name || "User"}
                              width={20}
                              height={20}
                              className="object-cover"
                            />
                          ) : (
                            <div className="bg-primary/10 h-full w-full flex items-center justify-center text-[10px] font-bold">
                              {video.user?.name?.charAt(0) || "U"}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                          {video.user?.name || "Anonymous"}
                        </span>
                      </div>

                      <span className="text-[10px] font-medium text-muted-foreground/60">
                        {formatDistanceToNow(new Date(video.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                "{videoToDelete?.name || "Untitled Video"}"
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
