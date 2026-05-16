import * as React from "react";

export default function WebcamApp() {
  // Reference to the video DOM element to invoke play() and assign streams
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  // State to hold the active webcam stream
  const [stream, setStream] = React.useState<MediaStream | null>(null);

  // Initialize webcam access on mount
  React.useEffect(() => {
    const start = async () => {
      try {
        // Request access to the default camera
        const s = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false, // We only need video for the overlay, audio is handled by the main recorder
        });
        setStream(s);
        // Play the stream in the video element
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (_err) {
        // ignore for now (e.g. user denied permission or no camera found)
      }
    };
    void start();
    
    // Cleanup: Stop camera tracks when component unmounts
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Main container - Transparent background
    <div className="w-screen h-screen relative bg-transparent">
      {/* 
        Circular Container (Overlay)
        - 'draggable' allows the user to move this window via Electron's drag behavior
        - 'rounded-full' makes it a perfect circle (assuming square window size)
        - 'overflow-hidden' clips the video to the circle
      */}
      <div className="absolute inset-0 draggable rounded-full overflow-hidden border border-white/10 shadow-xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover" // object-cover ensures video fills the circle without distortion
          autoPlay
          playsInline
          muted // Muted locally to prevent feedback loop
        />
      </div>
    </div>
  );
}
