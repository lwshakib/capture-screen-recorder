"use client";

import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

// Quality selector dependencies
import "videojs-contrib-quality-levels";
import "videojs-hls-quality-selector";

interface VideoPlayerProps {
  videoData: {
    url: string;
    m3u8Url?: string | null;
  };
  thumbnail?: string;
  chapters?: any;
}

export default function VideoPlayer({
  videoData,
  thumbnail,
  chapters,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  const videoUrl = videoData.m3u8Url || videoData.url;

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement("video-js");

      videoElement.classList.add("vjs-big-play-centered");
      videoElement.classList.add("vjs-theme-city"); // Using a modern theme if available or default
      videoRef.current.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, {
        autoplay: false,
        controls: true,
        responsive: true,
        fluid: true,
        poster: thumbnail,
        sources: [
          {
            src: videoUrl,
            type: videoUrl.endsWith(".m3u8")
              ? "application/x-mpegURL"
              : "video/mp4",
          },
        ],
        controlBar: {
          children: [
            "playToggle",
            "volumePanel",
            "currentTimeDisplay",
            "timeDivider",
            "durationDisplay",
            "progressControl",
            "liveDisplay",
            "remainingTimeDisplay",
            "customControlSpacer",
            "playbackRateMenuButton",
            "chaptersButton",
            "descriptionsButton",
            "subsCapsButton",
            "audioTrackButton",
            "fullscreenToggle",
          ],
        },
      }));

      // Initialize quality selector if it's an HLS stream
      if (videoUrl.endsWith(".m3u8")) {
        (player as any).hlsQualitySelector({
          displayCurrentQuality: true,
        });
      }

      // Add chapters if available
      if (chapters && Array.isArray(chapters) && chapters.length > 0) {
        player.ready(() => {
          try {
            const track = player.addTextTrack("chapters", "Chapters", "en");
            if (track) {
              track.mode = "showing";

              chapters.forEach((chapter: any) => {
                const start = chapter.start || chapter.startTime;
                const end = chapter.end || chapter.endTime;
                const title = chapter.title || chapter.name || "Chapter";

                if (typeof start === "number" && typeof end === "number") {
                  // Use window.VTTCue with a fallback or videojs.getComponent('Cue') if needed
                  const CueClass =
                    (window as any).VTTCue || (window as any).TextTrackCue;
                  if (CueClass) {
                    track.addCue(new CueClass(start, end, title));
                  }
                }
              });
            }
          } catch (err) {
            console.error("Error adding chapters to video player:", err);
          }
        });
      }
    }
  }, [videoUrl, thumbnail, chapters]);

  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div className="video-player-container w-full h-full">
      <div data-vjs-player ref={videoRef} />
      <style jsx global>{`
        .video-player-container .video-js {
          border-radius: 1rem;
          overflow: hidden;
        }
        .vjs-theme-city .vjs-big-play-button {
          background-color: rgba(var(--primary), 0.8);
          border: none;
          height: 3em;
          width: 3em;
          line-height: 3em;
          border-radius: 50%;
        }
        .vjs-theme-city .vjs-control-bar {
          background: linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.8) 0%,
            rgba(0, 0, 0, 0) 100%
          );
          height: 4em;
        }
        .vjs-progress-control .vjs-play-progress {
          background-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
