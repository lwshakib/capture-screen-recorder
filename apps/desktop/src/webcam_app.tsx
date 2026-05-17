import * as React from "react"

export default function WebcamApp() {
  // Reference to the video DOM element to invoke play() and assign streams
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  // State to hold the active webcam stream
  const [stream, setStream] = React.useState<MediaStream | null>(null)

  // Initialize webcam access on mount
  React.useEffect(() => {
    const start = async () => {
      try {
        // Request access to the default camera
        const s = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false, // We only need video for the overlay, audio is handled by the main recorder
        })
        setStream(s)
        // Play the stream in the video element
        if (videoRef.current) videoRef.current.srcObject = s
      } catch (_err) {
        // ignore for now (e.g. user denied permission or no camera found)
      }
    }
    void start()

    // Cleanup: Stop camera tracks when component unmounts
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    // Main container - Transparent background
    <div className="relative h-screen w-screen bg-transparent">
      {/* 
        Widescreen Container (Overlay)
        - 'draggable' allows the user to move this window via Electron's drag behavior
        - 'rounded-2xl' makes it a beautiful widescreen block
        - 'overflow-hidden' clips the video to the corners
      */}
      <div className="draggable absolute inset-0 overflow-hidden rounded-2xl border border-white/10 shadow-xl">
        <video
          ref={videoRef}
          className="h-full w-full scale-x-[-1] object-contain" // object-contain ensures video fits the square exactly without cropping, mirrored for natural feedback
          autoPlay
          playsInline
          muted // Muted locally to prevent feedback loop
        />
      </div>
    </div>
  )
}
