import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "../../utils/logger";
import { Loader2, CameraOff, GripVertical } from "lucide-react";

export default function WebcamBubble() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 640 },
            facingMode: "user"
          },
          audio: false,
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onplaying = () => setLoading(false);
          await videoRef.current.play();
        }
      } catch (err: any) {
        logger.error("Webcam access failed", err);
        setError(err.name === "NotAllowedError" ? "Permission Denied" : "Camera Unavailable");
        setLoading(false);
      }
    };
    
    start();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="pointer-events-auto fixed z-[10000] w-48 h-48 rounded-2xl overflow-hidden border-4 border-primary shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-black ring-4 ring-primary/10 group cursor-grab active:cursor-grabbing"
      style={{ right: "40px", bottom: "40px" }}
    >
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-md z-10"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-[10px] font-bold text-primary mt-2 tracking-widest uppercase">Waking Camera</span>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-xl z-10 px-4 text-center"
          >
            <CameraOff className="h-6 w-6 text-destructive mb-2" />
            <span className="text-[10px] font-bold text-destructive leading-tight">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag handle hint on hover */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        <GripVertical className="h-4 w-4 text-white/50" />
      </div>

      <video 
        ref={videoRef} 
        muted 
        playsInline 
        className="w-full h-full object-contain scale-x-[-1]" 
      />
      
      {/* Glossy overlay effect */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_40px_rgba(255,255,255,0.05)] border border-white/10" />
    </motion.div>
  );
}
