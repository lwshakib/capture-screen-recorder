"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Globe,
  MoreVertical,
  Play,
  Shield,
  Video as VideoIcon,
} from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

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

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
  onDelete: (video: Video) => void;
  className?: string;
}

export function VideoCard({ video, onClick, onDelete, className }: VideoCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300",
        "bg-accent/5 hover:bg-accent/10 border border-transparent hover:border-accent/20",
        "rounded-2xl shadow-sm hover:shadow-xl",
        className
      )}
    >
      {/* Thumbnail Area */}
      <div 
        className="relative aspect-video bg-muted overflow-hidden cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick(video);
        }}
      >
        <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
          <VideoIcon className="h-10 w-10 text-muted-foreground/50" />
        </div>

        {/* Overlay Play Button (Visible on Hover) */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="h-6 w-6 text-white fill-white ml-1" />
          </div>
        </div>

        {/* Meta Badges (Duration & Privacy) */}
        {(video.duration !== null && video.duration !== undefined) && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white tracking-wider">
            {isFinite(video.duration) ? (
              <>
                {Math.floor(video.duration / 60)}:
                {String(Math.floor(video.duration % 60)).padStart(2, "0")}
              </>
            ) : (
              "--:--"
            )}
          </div>
        )}

        <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-sm">
          {video.privacy === "PUBLIC" ? (
            <Globe className="h-3 w-3 text-white" />
          ) : (
            <Shield className="h-3 w-3 text-white" />
          )}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 
            className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onClick(video);
            }}
          >
            {video.title || "Untitled Video"}
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-accent/10 shadow-2xl">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(video);
                }}
                className="rounded-lg"
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
                onSelect={(e) => {
                  e.preventDefault();
                  onDelete(video);
                }}
              >
                Delete Video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        )}

        <div className="flex-1" />

        {/* Footer Info (User & Date) */}
        <div className="flex items-center justify-between pt-2 border-t border-accent/10 mt-auto">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-white/10">
              {video.user?.image ? (
                <Image
                  src={video.user.image}
                  alt={video.user.name || "User"}
                  width={24}
                  height={24}
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-primary">
                  {video.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-foreground/80 truncate max-w-[100px]">
              {video.user?.name || "Unknown User"}
            </span>
          </div>

          <span className="text-[10px] font-medium text-muted-foreground/60 bg-accent/10 px-2 py-0.5 rounded-full">
            {formatDistanceToNow(new Date(video.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
