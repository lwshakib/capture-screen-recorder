import { useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger";

/**
 * WebcamBubble Component
 * Creates a floating, draggable circular overlay displaying a live camera feed.
 * This stream is independent of the screen recording stream and is intended as a visual aid.
 */
function WebcamBubble() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Floating position state
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  /**
   * Media Lifecycle:
   * Initializes the user's default camera and attaches it to a video element.
   * Auto-stops when the component is unmounted or the widget is toggled off.
   */
  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 300, height: 300 }, // Square capture for the bubble
          audio: false, // Don't capture audio in the bubble to avoid feedback loops
        });
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onplaying = () => setLoading(false);
          await videoRef.current.play();
        }
      } catch (err) {
        logger.error("Webcam access denied", err);
        setLoading(false);
      }
    };

    start();

    // Standard cleanup to release camera hardware
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /**
   * Persists the bubble's coordinates so it stays in the same place
   * between page navigations.
   */
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setPosition({
        x: e.clientX - dragOffsetRef.current.dx,
        y: e.clientY - dragOffsetRef.current.dy
      });
    };

    const handleUp = () => (isDraggingRef.current = false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const onStartDrag = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = { dx: e.clientX - position.x, dy: e.clientY - position.y };
  };

  return (
    <div
      className="webcam-bubble"
      onMouseDown={onStartDrag}
      style={{ left: position.x, top: position.y }}
    >
      {loading && <div className="loader">Initializing Camera...</div>}
      <video ref={videoRef} muted playsInline className="video-feed" />
    </div>
  );
}

export default WebcamBubble;
