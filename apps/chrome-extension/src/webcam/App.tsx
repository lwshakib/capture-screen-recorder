import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CameraOff, Loader2 } from "lucide-react"
import { logger } from "../utils/logger"

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const startCamera = async () => {
      let stream: MediaStream | null = null
      try {
        setLoading(true)
        setError(null)

        // Request user camera permissions and stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false, // Webcam window does not capture audio directly to avoid double recording
        })

        streamRef.current = stream
      } catch (err: any) {
        logger.error("Webcam window camera access failed:", err)
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera permission denied. Please allow camera access in extension settings."
          )
        } else {
          setError(
            "Camera is currently unavailable or in use by another application."
          )
        }
        setLoading(false)
        return // Exit early
      }

      // If stream acquisition succeeded, we definitely have camera access
      try {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onplaying = () => setLoading(false)
          await videoRef.current.play().catch((playErr) => {
            logger.warn(
              "Webcam window play promise rejected (usually safe):",
              playErr
            )
          })
        }
      } catch (playSetupErr) {
        logger.warn("Webcam window play setup exception:", playSetupErr)
      } finally {
        setLoading(false)
      }
    }

    startCamera()

    // Force window to remain non-resizable by snapping back to original size
    const enforceWindowSize = () => {
      window.resizeTo(380, 380)
    }
    window.addEventListener("resize", enforceWindowSize)

    // Clean up streams when popup is closed/unmounted
    return () => {
      window.removeEventListener("resize", enforceWindowSize)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black font-sans text-foreground antialiased select-none">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mt-3 animate-pulse text-xs font-bold tracking-widest text-primary uppercase">
              Starting Camera...
            </span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center"
          >
            <div className="mb-3 rounded-full border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <CameraOff className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-sm font-bold tracking-tight text-white">
              Camera Access Blocked
            </h3>
            <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mirrored webcam stream for natural user coordination */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 h-48 w-48 scale-x-[-1] bg-black object-contain"
        style={{ pointerEvents: "none" }}
      />

      {/* Subtle glossy layout overlay for a premium SaaS look */}
      <div className="pointer-events-none absolute inset-0 border border-white/5 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)]" />
    </div>
  )
}
