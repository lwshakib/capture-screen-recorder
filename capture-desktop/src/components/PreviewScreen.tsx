import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";

/**
 * PreviewScreen Component
 * Provides a live video preview of a selected screen or window source.
 */
export default function PreviewScreen({
  selectedDisplayId,
}: {
  selectedDisplayId: string; // The Electron source ID to preview
}) {
  // State to hold the media stream generated for the preview
  const [stream, setStream] = useState<MediaStream | null>(null);

  /**
   * Establishes a connection to the selected display source
   */
  const connectToDisplay = async () => {
    // If no display is selected, stop any existing streams and return
    if (!selectedDisplayId) {
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
      return;
    }

    try {
      // Stop and clear previous tracks before starting new ones
      stream?.getTracks().forEach((t) => t.stop());

      // Define constraints to capture the specific desktop source identified by ID
      const constraints = {
        audio: false, // We don't need audio for thumbnail preview
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: selectedDisplayId,
          },
        } as MediaTrackConstraints,
      };

      // Request the video stream from the browser/Electron API
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Safety: Ensure no audio tracks are accidentally attached to the preview
      newStream.getAudioTracks().forEach((track) => {
        track.stop();
        newStream.removeTrack(track);
      });
      
      setStream(newStream);
    } catch (error) {
      logger.error("Failed to get display media for preview", error);
      setStream(null);
    }
  };

  // Trigger connection logic whenever the selectedDisplayId prop changes
  useEffect(() => {
    connectToDisplay();
  }, [selectedDisplayId]);

  // Cleanup: Ensure all media tracks are stopped when the component unmounts
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  // Render a placeholder if no display is selected
  if (!selectedDisplayId) {
    return (
      <div className="w-full h-48 rounded-md border border-border bg-muted/20 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Select a screen source to preview
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-48 rounded-md overflow-hidden">
      {stream ? (
        // Render the actual live video feed
        <video
          className="w-full h-full object-contain rounded-md"
          autoPlay
          muted
          playsInline
          ref={(el) => {
            if (el && stream) {
              // Assign the stream to the video element's source object
              if (el.srcObject !== stream) {
                el.srcObject = stream;
              }
              // Force muting to prevent accidental audio playback during preview
              el.muted = true;
              el.volume = 0;
            }
          }}
        />
      ) : (
        // Show loading message while connecting
        <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">
          Connecting to source...
        </div>
      )}
    </div>
  );
}
