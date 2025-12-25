import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";

export default function PreviewScreen({
  selectedDisplayId,
}: {
  selectedDisplayId: string;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const connectToDisplay = async () => {
    if (!selectedDisplayId) {
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
      return;
    }

    try {
      stream?.getTracks().forEach((t) => t.stop());

      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: selectedDisplayId,
          },
        } as MediaTrackConstraints,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Remove any audio tracks that might have been added (safety measure)
      newStream.getAudioTracks().forEach((track) => {
        track.stop();
        newStream.removeTrack(track);
      });
      
      setStream(newStream);
    } catch (error) {
      logger.error("Failed to get display media for preview", error);
      // ignore for now
      setStream(null);
    }
  };

  useEffect(() => {
    connectToDisplay();
  }, [selectedDisplayId]);
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

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
        <video
          className="w-full h-full object-contain rounded-md"
          autoPlay
          muted
          playsInline
          ref={(el) => {
            if (el && stream) {
              if (el.srcObject !== stream) {
                el.srcObject = stream;
              }
              // Ensure video is muted and volume is 0 (no audio playback)
              el.muted = true;
              el.volume = 0;
            }
          }}
        />
      ) : (
        <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">
          Connecting to source...
        </div>
      )}
    </div>
  );
}
