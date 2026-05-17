"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
} from "lucide-react"

interface VideoPlayerProps {
  videoData: {
    url: string
  }
  initialDuration?: number | null
  thumbnail?: string
  className?: string
}

export function VideoPlayer({
  videoData,
  initialDuration,
  thumbnail,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const [isPaused, setIsPaused] = useState(true)
  const [isTheater, setIsTheater] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [previewPosition, setPreviewPosition] = useState(0)
  const [progressPosition, setProgressPosition] = useState(0)

  // Refs for synchronous scrubbing control
  const isScrubbingRef = useRef(false)
  const wasPausedRef = useRef(false)
  const durationRef = useRef(duration)
  const didSeekHackRef = useRef(false)

  // Keep durationRef in sync across renders to prevent stale closures
  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  // Play/Pause toggle
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current
          .play()
          .catch((err) => console.error("Play error:", err))
      } else {
        videoRef.current.pause()
      }
    }
  }

  // Mute toggle
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Theater mode toggle
  const toggleTheater = () => {
    setIsTheater(!isTheater)
  }

  // Picture in Picture toggle
  const togglePiP = async () => {
    if (!videoRef.current) return
    try {
      if (videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture()
      } else {
        await document.exitPictureInPicture()
      }
    } catch (err) {
      console.error("PiP error:", err)
    }
  }

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (videoRef.current) {
      videoRef.current.volume = val
      videoRef.current.muted = val === 0
      setIsMuted(val === 0)
    }
  }

  // Playback speed change
  const handleSpeedChange = () => {
    let nextRate = playbackRate + 0.25
    if (nextRate > 2) nextRate = 0.25
    setPlaybackRate(nextRate)
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate
    }
  }

  // Format duration
  const formatDuration = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "--:--"

    const seconds = Math.floor(time % 60)
    const minutes = Math.floor(time / 60) % 60
    const hours = Math.floor(time / 3600)
    const leadingZero = (n: number) => n.toString().padStart(2, "0")

    if (hours === 0) {
      return `${minutes}:${leadingZero(seconds)}`
    }
    return `${hours}:${leadingZero(minutes)}:${leadingZero(seconds)}`
  }

  // Timeline interaction
  const handleTimelineUpdate = (e: React.MouseEvent | MouseEvent) => {
    if (!timelineRef.current || !videoRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent =
      Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width
    setPreviewPosition(percent)

    if (isScrubbingRef.current) {
      setProgressPosition(percent)
    }
  }

  const toggleScrubbing = (e: React.MouseEvent | MouseEvent) => {
    if (!timelineRef.current || !videoRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent =
      Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width

    const scrubbing = e.type === "mousedown" || (e as MouseEvent).buttons === 1

    isScrubbingRef.current = scrubbing
    setIsScrubbing(scrubbing)

    const nativeDuration = videoRef.current.duration

    if (scrubbing) {
      wasPausedRef.current = videoRef.current.paused
      videoRef.current.pause()
    } else {
      if (nativeDuration > 0 && isFinite(nativeDuration)) {
        videoRef.current.currentTime = percent * nativeDuration
        setProgressPosition(percent)
      }
      if (!wasPausedRef.current) {
        videoRef.current
          .play()
          .catch((err) => console.error("Resume play error:", err))
      }
    }

    handleTimelineUpdate(e)
  }

  // Add document mouse event listeners once
  useEffect(() => {
    const handleDocumentMouseUp = (e: MouseEvent) => {
      if (isScrubbingRef.current) {
        toggleScrubbing(e)
      }
    }
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (isScrubbingRef.current) {
        handleTimelineUpdate(e)
      }
    }

    document.addEventListener("mouseup", handleDocumentMouseUp)
    document.addEventListener("mousemove", handleDocumentMouseMove)
    return () => {
      document.removeEventListener("mouseup", handleDocumentMouseUp)
      document.removeEventListener("mousemove", handleDocumentMouseMove)
    }
  }, [])

  // Sync with video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setIsPaused(false)
    const onPause = () => setIsPaused(true)
    const onTimeUpdate = () => {
      // If we performed the seek hack, reset playhead to 0 once duration resolves
      if (didSeekHackRef.current) {
        if (video.duration && isFinite(video.duration) && video.duration > 0) {
          didSeekHackRef.current = false
          video.currentTime = 0
        }
        return
      }

      setCurrentTime(video.currentTime)
      if (!isScrubbingRef.current) {
        const activeDuration =
          video.duration && isFinite(video.duration) && video.duration > 0
            ? video.duration
            : durationRef.current
        if (activeDuration > 0) {
          setProgressPosition(video.currentTime / activeDuration)
        }
      }
    }
    const onLoadedMetadata = () => {
      if (video.duration === Infinity) {
        // WebM Chrome Infinity duration fix: Seek to end to trigger duration calculation
        didSeekHackRef.current = true
        video.currentTime = 1e9
      } else if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration)
      } else if (initialDuration) {
        setDuration(initialDuration)
      }
    }
    const onDurationChange = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration)
      }
    }
    const onFullscreenChange = () =>
      setIsFullScreen(!!document.fullscreenElement)

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("timeupdate", onTimeUpdate)
    video.addEventListener("loadedmetadata", onLoadedMetadata)
    video.addEventListener("durationchange", onDurationChange)
    document.addEventListener("fullscreenchange", onFullscreenChange)

    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("timeupdate", onTimeUpdate)
      video.removeEventListener("loadedmetadata", onLoadedMetadata)
      video.removeEventListener("durationchange", onDurationChange)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tagName = document.activeElement?.tagName.toLowerCase()
      if (tagName === "input" || tagName === "textarea") return

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault()
          togglePlay()
          break
        case "f":
          toggleFullScreen()
          break
        case "t":
          toggleTheater()
          break
        case "m":
          toggleMute()
          break
        case "arrowleft":
        case "j":
          if (videoRef.current) videoRef.current.currentTime -= 5
          break
        case "arrowright":
        case "l":
          if (videoRef.current) videoRef.current.currentTime += 5
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [playbackRate])

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/container relative flex w-full justify-center bg-black transition-all duration-300",
        isTheater
          ? "max-h-[80vh] w-full"
          : "mx-auto aspect-video max-w-[1000px] overflow-hidden rounded-xl",
        isFullScreen ? "h-screen max-h-none max-w-none" : "",
        isScrubbing ? "cursor-grabbing" : "",
        className
      )}
    >
      <video
        ref={videoRef}
        src={videoData.url}
        className="h-full w-full"
        onClick={togglePlay}
        onDoubleClick={toggleFullScreen}
      />

      {/* Controls Container */}
      <div
        className={cn(
          "absolute right-0 bottom-0 left-0 z-10 flex flex-col text-white transition-opacity duration-150",
          "before:absolute before:right-0 before:bottom-0 before:left-0 before:-z-10 before:aspect-[6/1] before:bg-gradient-to-t before:from-black/80 before:to-transparent",
          isPaused
            ? "opacity-100"
            : "opacity-0 group-hover/container:opacity-100 focus-within:opacity-100"
        )}
      >
        {/* Timeline */}
        <div
          ref={timelineRef}
          className="group/timeline mx-3 mb-1 flex h-2 cursor-pointer items-center"
          onMouseMove={handleTimelineUpdate}
          onMouseDown={toggleScrubbing}
        >
          <div className="relative h-[3px] w-full bg-white/30 transition-all duration-75 group-hover/timeline:h-full">
            {/* Progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-red-600"
              style={{ width: `${progressPosition * 100}%` }}
            />
            {/* Preview (Hover) */}
            <div
              className="absolute top-0 bottom-0 left-0 hidden bg-white/30 group-hover/timeline:block"
              style={{ width: `${previewPosition * 100}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-red-600 transition-transform group-hover/timeline:scale-100"
              style={{ left: `${progressPosition * 100}%` }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 p-2">
          <button
            onClick={togglePlay}
            className="rounded-md p-1.5 transition-colors hover:bg-white/10"
          >
            {isPaused ? (
              <Play className="h-5 w-5 fill-current" />
            ) : (
              <Pause className="h-5 w-5 fill-current" />
            )}
          </button>

          <div className="group/volume flex items-center">
            <button
              onClick={toggleMute}
              className="rounded-md p-1.5 transition-colors hover:bg-white/10"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="any"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="ml-1 h-1 w-0 origin-left scale-x-0 cursor-pointer accent-white transition-all duration-150 group-hover/volume:w-20 group-hover/volume:scale-x-100"
            />
          </div>

          <div className="flex items-center gap-1 px-2 text-xs font-medium">
            <span>{formatDuration(currentTime)}</span>
            <span className="opacity-70">/</span>
            <span className="opacity-70">{formatDuration(duration)}</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={handleSpeedChange}
            className="w-12 rounded-md px-2 py-1 text-center text-sm font-bold transition-colors hover:bg-white/10"
          >
            {playbackRate}x
          </button>

          <button
            onClick={togglePiP}
            className="hidden rounded-md p-1.5 transition-colors hover:bg-white/10 md:block"
          >
            <PictureInPicture className="h-5 w-5" />
          </button>

          <button
            onClick={toggleFullScreen}
            className="rounded-md p-1.5 transition-colors hover:bg-white/10"
          >
            {isFullScreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
