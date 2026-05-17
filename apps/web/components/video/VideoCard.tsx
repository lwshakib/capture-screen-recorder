"use client"

import { formatDistanceToNow } from "date-fns"
import {
  Globe,
  MoreVertical,
  Play,
  Shield,
  Video as VideoIcon,
} from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface Video {
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

interface VideoCardProps {
  video: Video
  onClick: (video: Video) => void
  onDelete: (video: Video) => void
  className?: string
}

export function VideoCard({
  video,
  onClick,
  onDelete,
  className,
}: VideoCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300",
        "border border-transparent bg-accent/5 hover:border-accent/20 hover:bg-accent/10",
        "rounded-2xl shadow-sm hover:shadow-xl",
        className
      )}
    >
      {/* Thumbnail Area */}
      <div
        className="relative aspect-video cursor-pointer overflow-hidden bg-muted"
        onClick={(e) => {
          e.stopPropagation()
          onClick(video)
        }}
      >
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
          <VideoIcon className="h-10 w-10 text-muted-foreground/50" />
        </div>

        {/* Overlay Play Button (Visible on Hover) */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 scale-90 transform items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-md transition-transform group-hover:scale-100">
            <Play className="ml-1 h-6 w-6 fill-white text-white" />
          </div>
        </div>

        {/* Meta Badges (Duration & Privacy) */}
        {video.duration !== null && video.duration !== undefined && (
          <div className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white backdrop-blur-sm">
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

        <div className="absolute top-3 right-3 rounded-lg bg-black/40 p-1.5 backdrop-blur-sm">
          {video.privacy === "PUBLIC" ? (
            <Globe className="h-3 w-3 text-white" />
          ) : (
            <Shield className="h-3 w-3 text-white" />
          )}
        </div>
      </div>

      {/* Info Area */}
      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="line-clamp-2 cursor-pointer text-sm leading-tight font-semibold text-foreground transition-colors group-hover:text-primary"
            onClick={(e) => {
              e.stopPropagation()
              onClick(video)
            }}
          >
            {video.title || "Untitled Video"}
          </h3>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-xl border-accent/10 shadow-2xl"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onClick(video)
                }}
                className="rounded-lg"
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  onDelete(video)
                }}
              >
                Delete Video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {video.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {video.description}
          </p>
        )}

        <div className="flex-1" />

        {/* Footer Info (User & Date) */}
        <div className="mt-auto flex items-center justify-between border-t border-accent/10 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-primary/10">
              {video.user?.image ? (
                <Image
                  src={video.user.image}
                  alt={video.user.name || "User"}
                  width={24}
                  height={24}
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary">
                  {video.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <span className="max-w-[100px] truncate text-[10px] font-medium text-foreground/80">
              {video.user?.name || "Unknown User"}
            </span>
          </div>

          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60">
            {formatDistanceToNow(new Date(video.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
