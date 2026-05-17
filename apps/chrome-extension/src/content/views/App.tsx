import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Square,
  Mic,
  Monitor,
  GripHorizontal,
  LogOut,
  Loader2,
  X,
  CheckCircle2,
  Video,
  Settings2,
} from "lucide-react"
import { useExtensionContext } from "../../context/ExtensionContext"
import { useRecorder } from "../hooks/useRecorder"
import CustomSelect from "./CustomSelect"

export default function App() {
  const [show, setShow] = useState(false)
  const { user, status, login, logout, checkAuth } = useExtensionContext()
  const recorder = useRecorder()

  // Settings state
  const [supported] = useState(() => {
    const isAvailable = typeof window !== "undefined" && window.screen
    return [
      {
        label: "Native",
        width: isAvailable ? window.screen.width : 1920,
        height: isAvailable ? window.screen.height : 1080,
      },
      { label: "720p (HD)", width: 1280, height: 720 },
      { label: "1080p (FHD)", width: 1920, height: 1080 },
      { label: "4K (Ultra)", width: 3840, height: 2160 },
    ]
  })
  const [selectedRes, setSelectedRes] = useState(supported[0])
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()

    const setup = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audios = devices.filter((d) => d.kind === "audioinput")
        setAudioInputs(audios)
        setSelectedAudioId(audios[0]?.deviceId || null)
      } catch {}
    }
    setup()

    const handleMessage = (msg: any) => {
      if (msg.action === "TOGGLE") setShow((prev) => !prev)
      if (msg.action === "AUTH_SUCCESS") checkAuth()
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [checkAuth])

  useEffect(() => {
    localStorage.setItem(
      "capture_resolution_selected",
      JSON.stringify(selectedRes)
    )
  }, [selectedRes])

  useEffect(() => {
    if (selectedAudioId)
      localStorage.setItem("capture_audioinput_selected", selectedAudioId)
  }, [selectedAudioId])

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  }

  return (
    <div className="capture-studio-root">
      <AnimatePresence>
        {show && (
          <>
            {/* Setup Window - Only visible when NOT recording */}
            {recorder.state === "idle" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                drag
                dragMomentum={false}
                className="theme-dark pointer-events-auto fixed z-[9999] w-[300px] overflow-hidden rounded-2xl border border-border bg-card/95 font-sans text-foreground shadow-2xl backdrop-blur-2xl"
                style={{ left: "30px", bottom: "30px" }}
              >
                <div className="group flex cursor-grab items-center justify-between border-b border-border/50 bg-primary/5 px-5 py-3.5 active:cursor-grabbing">
                  <div className="flex items-center gap-2">
                    <GripHorizontal className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span className="text-[11px] font-bold tracking-tight text-primary">
                      Capture Studio
                    </span>
                  </div>
                  <button
                    onClick={() => setShow(false)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg transition-all hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-6 p-5">
                  {status === "loading" ? (
                    <div className="flex flex-col items-center gap-3 py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground">
                        Initializing...
                      </span>
                    </div>
                  ) : !user ? (
                    <div className="space-y-4 py-2 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
                        <Video className="h-7 w-7 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold tracking-tight">
                          Sign in to Capture
                        </h3>
                        <p className="px-4 text-[10px] leading-relaxed text-muted-foreground">
                          Connect your account to enable professional recording.
                        </p>
                      </div>
                      <button
                        onClick={login}
                        className="h-11 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90"
                      >
                        Login with Google
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-bold tracking-tight text-muted-foreground">
                            <Monitor className="h-3.5 w-3.5" />
                            <span>Resolution</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {supported.map((r) => (
                              <button
                                key={r.label}
                                onClick={() => setSelectedRes(r)}
                                className={`h-8 rounded-lg border text-[10px] font-bold transition-all ${
                                  selectedRes.width === r.width
                                    ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5"
                                    : "border-transparent bg-accent/30 text-muted-foreground hover:bg-accent/60"
                                }`}
                              >
                                {r.label.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-bold tracking-tight text-muted-foreground">
                            <Mic className="h-3.5 w-3.5" />
                            <span>Audio Source</span>
                          </div>
                          <CustomSelect
                            options={[
                              { label: "Select Microphone...", value: "" },
                              ...audioInputs.map((d) => ({
                                label: d.label || "Default Mic",
                                value: d.deviceId,
                              })),
                            ]}
                            value={selectedAudioId || ""}
                            onChange={(val) => setSelectedAudioId(val || null)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={recorder.startRecording}
                          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Capture
                        </button>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2">
                        <div className="flex items-center gap-2.5 pt-3">
                          <div className="h-8 w-8 rounded-full border border-primary/20 p-0.5">
                            <img
                              src={user.image}
                              className="h-full w-full rounded-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[11px] font-bold">
                              {user.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              Verified Account
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={logout}
                          className="mt-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Recording Status Bar - Only visible WHEN recording */}
            {recorder.state === "recording" && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                drag
                dragMomentum={false}
                className="theme-dark pointer-events-auto fixed z-[10000] flex h-14 items-center gap-4 rounded-2xl border border-border bg-card/95 px-4 text-foreground shadow-2xl backdrop-blur-2xl"
                style={{ left: "50%", bottom: "40px", x: "-50%" }}
              >
                <div className="flex items-center gap-3 border-r border-border/50 pr-4">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-destructive shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
                  <span className="text-sm font-black tracking-tight text-primary tabular-nums">
                    {formatTime(recorder.elapsedMs)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={recorder.stopRecording}
                    className="text-destructive-foreground flex h-10 w-10 items-center justify-center rounded-xl bg-destructive shadow-lg shadow-destructive/20 transition-all hover:opacity-90 active:scale-[0.95]"
                    title="Stop Recording"
                  >
                    <Square className="h-4.5 w-4.5 fill-current" />
                  </button>

                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-accent/30 text-muted-foreground transition-all hover:bg-accent"
                    title="Settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="group cursor-grab pl-2 active:cursor-grabbing">
                  <GripHorizontal className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Webcam is now rendered in a dedicated popup window managed by background.ts */}

      {/* Post-Recording Preview Modal */}
      <AnimatePresence>
        {recorder.recordedVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center bg-background/90 p-8 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="shadow-3xl w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card"
            >
              <div className="space-y-6 p-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">
                    Review Recording
                  </h3>
                  <button
                    onClick={recorder.reset}
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-accent"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 bg-black shadow-2xl">
                  <video
                    src={recorder.recordedVideoUrl}
                    controls
                    className="h-full w-full object-contain"
                  />
                </div>

                {recorder.uploadSuccess ? (
                  <div className="flex animate-in flex-col items-center gap-3 py-6 text-center fade-in slide-in-from-bottom-4">
                    <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h4 className="text-lg font-bold text-green-500">
                      Video Uploaded!
                    </h4>
                    <p className="px-12 text-xs text-muted-foreground">
                      Successfully synced to your cloud library.
                    </p>
                    <button
                      onClick={recorder.reset}
                      className="mt-4 h-10 rounded-xl bg-primary px-8 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      Done
                    </button>
                  </div>
                ) : recorder.isUploading ? (
                  <div className="space-y-4 px-2 py-4">
                    <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                      <span>Uploading</span>
                      <span>{recorder.uploadProgress}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent shadow-inner">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${recorder.uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2.5 text-xs font-medium text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing with cloud...
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={recorder.uploadToS3}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <Play className="h-4.5 w-4.5 fill-current" />
                      Upload to Cloud
                    </button>
                    <a
                      href={recorder.recordedVideoUrl}
                      download={`capture-${Date.now()}.webm`}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/50 bg-secondary text-sm font-bold text-foreground transition-all hover:bg-secondary/80"
                    >
                      <Video className="h-4.5 w-4.5" />
                      Download Local
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
