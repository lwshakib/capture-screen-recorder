import { useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger";

function WebcamBubble() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: 20,
    y: 20,
  }));
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const onPlaying = () => setLoading(false);
          videoRef.current.addEventListener("playing", onPlaying, {
            once: true,
          });
          await videoRef.current.play().catch(() => {
            setLoading(false);
          });
        }
      } catch (err) {
        logger.error("Failed to get webcam:", err);
        setLoading(false);
      }
    };

    const stop = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setLoading(false);
    };

    start();
    return () => {
      stop();
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("capture_webcam_position");
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        setPosition(parsed);
      } else {
        const size = 300; // match CSS container size
        const x = 20; // bottom-left default
        const y = Math.max(20, window.innerHeight - size - 20);
        setPosition({ x, y });
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("capture_webcam_position", JSON.stringify(position));
    } catch {}
  }, [position]);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const size = 300; // match CSS
      const x = Math.min(
        Math.max(0, clientX - dragOffsetRef.current.dx),
        window.innerWidth - size
      );
      const y = Math.min(
        Math.max(0, clientY - dragOffsetRef.current.dy),
        window.innerHeight - size
      );
      setPosition({ x, y });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      dx: clientX - position.x,
      dy: clientY - position.y,
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  return (
    <div
      className="webcam-preview"
      style={{ left: position.x, top: position.y }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {loading && (
        <div className="webcam-loading">
          <div className="webcam-skeleton" />
          <span className="webcam-loading-text">Loading Webcam…</span>
        </div>
      )}
      <video ref={videoRef} className="webcam-video" muted playsInline />
    </div>
  );
}

export default WebcamBubble;
