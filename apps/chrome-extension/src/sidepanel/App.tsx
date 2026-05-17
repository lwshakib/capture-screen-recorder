import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  Square,
  Mic,
  Monitor,
  LogOut,
  Loader2,
  X,
  CheckCircle2,
  Video,
  ChevronRight,
  ShieldCheck,
  CloudUpload,
  Download,
  Moon,
  Sun,
} from "lucide-react"

import { useExtensionContext } from "../context/ExtensionContext"
import { useRecorder } from "../content/hooks/useRecorder"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

export default function App() {
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
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    checkAuth()

    const setup = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audios = devices.filter(
          (d) => d.kind === "audioinput" && d.deviceId
        )
        setAudioInputs(audios)
        setSelectedAudioId(audios[0]?.deviceId || null)
      } catch {}
    }
    setup()

    // Initial theme
    const savedTheme = localStorage.getItem("capture_theme") as
      | "light"
      | "dark"
      | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [checkAuth])

  // Listen for auth success from background to update authentication status in real-time
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === "AUTH_SUCCESS") checkAuth()
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [checkAuth])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("capture_theme", theme)
  }, [theme])

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
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {/* Side Panel Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card/50 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-bold tracking-tight">
            Capture Studio
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="mr-2 flex items-center gap-2">
            <Sun
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                theme === "light" ? "text-primary" : "text-muted-foreground"
              )}
            />
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
              size="sm"
            />
            <Moon
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                theme === "dark" ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          {user && (
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col p-6">
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Syncing workspace...
            </span>
          </div>
        ) : !user ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pt-8 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2.5rem] border border-primary/10 bg-primary/5 shadow-inner">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Secure Access
              </h1>
              <p className="px-6 text-sm leading-relaxed text-muted-foreground">
                Sign in to your Capture account to unlock cloud storage and pro
                recording tools.
              </p>
            </div>
            <Button
              onClick={login}
              size="lg"
              className="h-14 w-full rounded-2xl shadow-2xl shadow-primary/20"
            >
              Connect Capture Account
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col space-y-8"
          >
            {/* Control Center */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider text-muted-foreground">
                  Control Center
                </h2>
                {recorder.state === "recording" && (
                  <div className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                    <span className="text-[10px] font-bold text-destructive">
                      Live
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Resolution Select */}
                <Card className="overflow-visible border-border/50 bg-accent/5 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Monitor className="h-3.5 w-3.5" />
                      Resolution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {supported.map((r) => (
                        <Button
                          key={r.label}
                          variant={
                            selectedRes.width === r.width
                              ? "default"
                              : "outline"
                          }
                          size="xs"
                          onClick={() => setSelectedRes(r)}
                          className={cn(
                            "h-9 rounded-xl font-bold transition-all",
                            selectedRes.width === r.width &&
                              "shadow-md shadow-primary/20"
                          )}
                        >
                          {r.label.split(" ")[0]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Audio Select */}
                <Card className="overflow-visible border-border/50 bg-accent/5 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mic className="h-3.5 w-3.5" />
                      Audio Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedAudioId || "none"}
                      onValueChange={(val) =>
                        setSelectedAudioId(val === "none" ? null : val)
                      }
                    >
                      <SelectTrigger className="h-10 w-full rounded-xl border-border/50 bg-background">
                        <SelectValue placeholder="Select Microphone..." />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="none">Default Mic</SelectItem>
                        {audioInputs.map((d) => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || "Unknown Mic"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recording Actions */}
            <div className="space-y-4">
              {recorder.state === "idle" ? (
                <div className="flex items-center justify-center gap-4 py-2">
                  {/* Start Capture Icon Button */}
                  <Button
                    onClick={recorder.startRecording}
                    size="icon"
                    className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                    title="Start Capture"
                  >
                    <Play className="ml-1 h-6 w-6 fill-current" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                      Duration
                    </span>
                    <span className="mt-1 text-2xl font-black text-primary tabular-nums">
                      {formatTime(recorder.elapsedMs)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Stop Capture Icon Button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={recorder.stopRecording}
                      className="text-destructive-foreground h-12 w-12 rounded-xl bg-destructive shadow-lg shadow-destructive/20 transition-all active:scale-95"
                      title="Stop Capture"
                    >
                      <Square className="h-5 w-5 fill-current" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Post-Recording Options */}
            <AnimatePresence>
              {recorder.recordedVideoUrl && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-tight">
                      Capture Ready
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={recorder.reset}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="aspect-video overflow-hidden rounded-xl border border-border/50 bg-black">
                    <video
                      src={recorder.recordedVideoUrl}
                      controls
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {recorder.uploadSuccess ? (
                    <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-green-500">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold">
                        Successfully Uploaded!
                      </span>
                    </div>
                  ) : recorder.isUploading ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{recorder.uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                        <motion.div
                          className="h-full bg-primary"
                          animate={{ width: `${recorder.uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={recorder.uploadToS3} className="gap-2">
                        <CloudUpload className="h-3.5 w-3.5" />
                        Upload
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 border-border/50"
                        asChild
                      >
                        <a
                          href={recorder.recordedVideoUrl}
                          download="capture.webm"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Save
                        </a>
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Feedback */}
            <AnimatePresence>
              {recorder.error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-[11px] font-bold text-destructive"
                >
                  <X className="h-4 w-4 shrink-0" />
                  {recorder.error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Footer */}
            <footer className="mt-auto flex items-center justify-between border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <img
                  src={user.image}
                  className="h-10 w-10 rounded-full border-2 border-primary/20 shadow-sm"
                />
                <div className="flex flex-col">
                  <span className="text-xs leading-none font-bold">
                    {user.name}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4.5 w-4.5" />
              </Button>
            </footer>
          </motion.div>
        )}
      </main>
    </div>
  )
}
