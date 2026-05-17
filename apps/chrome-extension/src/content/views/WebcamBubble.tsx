import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { logger } from "../../utils/logger"
import { Loader2, CameraOff, GripVertical } from "lucide-react"

export default function WebcamBubble() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true)
        setError(null)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 640 },
            facingMode: "user",
          },
          audio: false,
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onplaying = () => setLoading(false)
          await videoRef.current.play()
        }
      } catch (err: any) {
        logger.error("Webcam access failed", err)
        setError(
          err.name === "NotAllowedError"
            ? "Permission Denied"
            : "Camera Unavailable"
        )
        setLoading(false)
      }
    }

    start()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group pointer-events-auto fixed z-[10000] h-48 w-48 cursor-grab overflow-hidden rounded-2xl border-4 border-primary bg-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-4 ring-primary/10 active:cursor-grabbing"
      style={{ right: "40px", bottom: "40px" }}
    >
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/80 backdrop-blur-md"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="mt-2 text-[10px] font-bold tracking-widest text-primary uppercase">
              Waking Camera
            </span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-destructive/10 px-4 text-center backdrop-blur-xl"
          >
            <CameraOff className="mb-2 h-6 w-6 text-destructive" />
            <span className="text-[10px] leading-tight font-bold text-destructive">
              {error}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag handle hint on hover */}
      <div className="pointer-events-none absolute top-1/2 left-4 z-20 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4 text-white/50" />
      </div>

      <video
        ref={videoRef}
        muted
        playsInline
        className="h-full w-full scale-x-[-1] object-contain"
      />

      {/* Glossy overlay effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.05)]" />
    </motion.div>
  )
}
