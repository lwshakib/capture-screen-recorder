import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  Mic,
  GripHorizontal,
  Loader2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { logger } from "../../utils/logger"
import { useExtensionContext } from "../../context/ExtensionContext"
import CustomSelect from "./CustomSelect"

/**
 * ResolutionWidget Component
 * Logic for pre-recording setup, including camera/mic selection,
 * hardware capability probing, and user setup.
 */

type Resolution = { label: string; width: number; height: number }

const CANDIDATE_RESOLUTIONS: Resolution[] = [
  { label: "360p", width: 640, height: 360 },
  { label: "480p", width: 640, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
]

function ResolutionWidget() {
  const { user, status, login, logout, checkAuth } = useExtensionContext()

  // State for hardware/software settings
  const [supported, setSupported] = useState<Resolution[]>([])
  const [selected, setSelected] = useState<Resolution | null>(null)
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)

  // Appearance
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const raw = localStorage.getItem("capture_widget_theme")
      return raw === "light" ? "light" : "dark"
    } catch {
      return "dark"
    }
  })

  // Drag-and-drop mechanics
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 20,
    y: 20,
  })
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  useEffect(() => {
    checkAuth()

    // Probe hardware
    const probe = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
        const track = stream.getVideoTracks()[0]
        const caps =
          typeof track.getCapabilities === "function"
            ? (track.getCapabilities() as any)
            : {}
        stream.getTracks().forEach((t) => t.stop())

        if (caps.width && caps.height) {
          const filtered = CANDIDATE_RESOLUTIONS.filter(
            (r) =>
              r.width <= (caps.width.max || 1920) &&
              r.height <= (caps.height.max || 1080)
          )
          setSupported(filtered)
          const savedSel = localStorage.getItem("capture_resolution_selected")
          if (savedSel) {
            const parsed = JSON.parse(savedSel)
            setSelected(
              filtered.find((r) => r.width === parsed.width) ||
                filtered[filtered.length - 1]
            )
          } else {
            setSelected(filtered[filtered.length - 1])
          }
        }
      } catch (err) {
        logger.error("Hardware probing failed", err)
      }
    }
    probe()

    // Enumerate audio
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audios = devices.filter((d) => d.kind === "audioinput")
        setAudioInputs(audios)
        const saved = localStorage.getItem("capture_audioinput_selected")
        setSelectedAudioId(
          audios.find((d) => d.deviceId === saved)?.deviceId ||
            audios[0]?.deviceId ||
            null
        )
      } catch (e) {
        logger.error("Audio enumeration failed", e)
      }
    }
    enumerate()

    // Restore position
    const savedPos = localStorage.getItem("capture_resolution_widget_position")
    if (savedPos) setPosition(JSON.parse(savedPos))
  }, [])

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === "AUTH_SUCCESS") checkAuth()
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [checkAuth])

  useEffect(() => {
    if (selected)
      localStorage.setItem(
        "capture_resolution_selected",
        JSON.stringify(selected)
      )
  }, [selected])

  useEffect(() => {
    if (selectedAudioId)
      localStorage.setItem("capture_audioinput_selected", selectedAudioId)
  }, [selectedAudioId])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const x = Math.min(
        Math.max(0, e.clientX - dragOffsetRef.current.dx),
        window.innerWidth - 260
      )
      const y = Math.min(
        Math.max(0, e.clientY - dragOffsetRef.current.dy),
        window.innerHeight - 300
      )
      setPosition({ x, y })
    }
    const onMouseUp = () => {
      isDraggingRef.current = false
      localStorage.setItem(
        "capture_resolution_widget_position",
        JSON.stringify(position)
      )
    }
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [position])

  const onDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragOffsetRef.current = {
      dx: e.clientX - position.x,
      dy: e.clientY - position.y,
    }
  }

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    window.dispatchEvent(
      new CustomEvent("capture:theme-change", { detail: { theme: next } })
    )
  }

  return (
    <div
      className={`pointer-events-auto fixed flex w-[260px] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl ${theme === "dark" ? "theme-dark" : ""}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header bar handles dragging */}
      <div
        className="group flex cursor-grab items-center justify-between border-b border-border bg-accent/10 px-3 py-2 active:cursor-grabbing"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
          <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">
            Recorder Setup
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-accent"
        >
          {theme === "dark" ? (
            <Sun className="h-3 w-3" />
          ) : (
            <Moon className="h-3 w-3" />
          )}
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Loading Hardware
            </span>
          </div>
        ) : !user ? (
          <div className="flex flex-col gap-3">
            <div className="mb-2 space-y-1 text-center">
              <h4 className="text-xs font-bold tracking-tight uppercase">
                Authentication Required
              </h4>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Sign in to enable recording and cloud uploads.
              </p>
            </div>
            <button
              onClick={login}
              className="h-9 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in to Capture
            </button>
          </div>
        ) : (
          <>
            {/* Resolution Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                <Monitor className="h-3 w-3" />
                <span>Resolution</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {supported.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setSelected(r)}
                    className={`h-8 rounded-lg border px-2 text-[10px] font-bold transition-all ${
                      selected?.width === r.width
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-accent/30 text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                <Mic className="h-3 w-3" />
                <span>Audio Input</span>
              </div>
              <CustomSelect
                options={audioInputs.map((d) => ({
                  label: d.label || "Default Microphone",
                  value: d.deviceId,
                }))}
                value={selectedAudioId}
                onChange={setSelectedAudioId}
              />
            </div>

            {/* Account Management Footer */}
            <div className="mt-2 flex items-center justify-between rounded-xl border border-border/10 bg-accent/10 p-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 overflow-hidden rounded-full border border-primary/20">
                  <img
                    src={user.image}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="max-w-[100px] truncate text-[10px] font-bold">
                  {user.name}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ResolutionWidget
