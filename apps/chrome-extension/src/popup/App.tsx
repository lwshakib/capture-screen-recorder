import { useEffect } from "react"
import { useExtensionContext } from "../context/ExtensionContext"
import { Button } from "@workspace/ui/components/button"
import {
  Loader2,
  Settings,
  LogOut,
  Video,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"

/**
 * Minimal Popup App
 * Designed for speed and focus.
 */
export default function App() {
  const { user, status, login, logout, checkAuth } = useExtensionContext()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Listen for auth success from background
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.action === "AUTH_SUCCESS") checkAuth()
    }
    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [checkAuth])

  const toggleRecorder = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      chrome.runtime.sendMessage({ action: "TOGGLE" })
      window.close() // Close popup after toggling
    }
  }

  return (
    <div className="w-[320px] bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Video className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Capture</h1>
        </div>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 px-5 pb-6">
        {status === "loading" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Syncing...
            </span>
          </div>
        ) : user ? (
          <>
            {/* Minimal User Bar */}
            <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-accent/30 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-background">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-none">
                  <span className="max-w-[120px] truncate text-xs font-bold">
                    {user.name}
                  </span>
                  <div className="mt-1 flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5 text-green-500" />
                    <span className="text-[9px] font-black tracking-tighter text-muted-foreground/70 uppercase">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Primary Action */}
            <Button
              onClick={toggleRecorder}
              className="group relative h-12 w-full overflow-hidden rounded-2xl font-bold shadow-xl shadow-primary/15"
            >
              <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 transition-transform duration-700 group-hover:translate-x-[100%]" />
              Open Recorder UI
            </Button>
          </>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5 px-2 text-center">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Unlock professional recording features by signing in to your
                account.
              </p>
            </div>
            <Button
              onClick={login}
              className="h-11 w-full rounded-2xl bg-primary font-bold transition-opacity hover:opacity-90"
            >
              Sign In to Start
            </Button>
          </div>
        )}

        <Separator className="opacity-40" />

        <div className="flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            Go to Dashboard <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <span className="text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase">
            v1.0.0
          </span>
        </div>
      </div>
    </div>
  )
}
