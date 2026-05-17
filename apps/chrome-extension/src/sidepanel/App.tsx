import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Square, 
  Camera, 
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
  Sun
} from "lucide-react";

import { useExtensionContext } from "../context/ExtensionContext";
import { useRecorder } from "../content/hooks/useRecorder";
import { Button } from "@workspace/ui/components/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@workspace/ui/components/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

const CANDIDATE_RESOLUTIONS = [
  { label: "720p (HD)", width: 1280, height: 720 },
  { label: "1080p (FHD)", width: 1920, height: 1080 },
  { label: "4K (Ultra)", width: 3840, height: 2160 },
];

export default function App() {
  const { user, status, login, logout, checkAuth } = useExtensionContext();
  const recorder = useRecorder();

  // Settings state
  const [supported] = useState(CANDIDATE_RESOLUTIONS);
  const [selectedRes, setSelectedRes] = useState(CANDIDATE_RESOLUTIONS[0]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    checkAuth();
    
    const setup = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter(d => d.kind === "audioinput" && d.deviceId);
        setAudioInputs(audios);
        setSelectedAudioId(audios[0]?.deviceId || null);
      } catch {}
    };
    setup();

    // Initial theme
    const savedTheme = localStorage.getItem("capture_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("capture_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("capture_resolution_selected", JSON.stringify(selectedRes));
  }, [selectedRes]);

  useEffect(() => {
    if (selectedAudioId) localStorage.setItem("capture_audioinput_selected", selectedAudioId);
  }, [selectedAudioId]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Side Panel Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-card/50 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Video className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-bold tracking-tight">Capture Studio</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Sun className={cn("h-3.5 w-3.5 transition-colors", theme === 'light' ? 'text-primary' : 'text-muted-foreground')} />
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              size="sm"
            />
            <Moon className={cn("h-3.5 w-3.5 transition-colors", theme === 'dark' ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          {user && (
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          )}
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-md mx-auto">
        {status === "loading" ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Syncing workspace...</span>
          </div>
        ) : !user ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 text-center pt-8"
          >
            <div className="w-20 h-20 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-primary/10">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight">Secure Access</h1>
              <p className="text-sm text-muted-foreground leading-relaxed px-6">
                Sign in to your Capture account to unlock cloud storage and pro recording tools.
              </p>
            </div>
            <Button 
              onClick={login}
              size="lg"
              className="w-full h-14 rounded-2xl shadow-2xl shadow-primary/20"
            >
              Connect Capture Account
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Control Center */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Control Center</h2>
                {recorder.state === "recording" && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-full">
                    <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                    <span className="text-[10px] font-bold text-destructive">Live</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Resolution Select */}
                <Card className="border-border/50 bg-accent/5 shadow-none overflow-visible">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs flex items-center gap-2 text-muted-foreground">
                      <Monitor className="h-3.5 w-3.5" />
                      Resolution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {supported.map(r => (
                        <Button 
                          key={r.label} 
                          variant={selectedRes.width === r.width ? "default" : "outline"}
                          size="xs"
                          onClick={() => setSelectedRes(r)}
                          className={cn(
                            "h-9 rounded-xl font-bold transition-all",
                            selectedRes.width === r.width && "shadow-md shadow-primary/20"
                          )}
                        >
                          {r.label.split(' ')[0]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Audio Select */}
                <Card className="border-border/50 bg-accent/5 shadow-none overflow-visible">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs flex items-center gap-2 text-muted-foreground">
                      <Mic className="h-3.5 w-3.5" />
                      Audio Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={selectedAudioId || "none"} 
                      onValueChange={(val) => setSelectedAudioId(val === "none" ? null : val)}
                    >
                      <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border/50">
                        <SelectValue placeholder="Select Microphone..." />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="none">Default Mic</SelectItem>
                        {audioInputs.map(d => (
                          <SelectItem key={d.deviceId} value={d.deviceId}>
                            {d.label || 'Unknown Mic'}
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
                <Button 
                  onClick={recorder.startRecording}
                  size="lg"
                  className="w-full h-16 rounded-2xl text-base shadow-2xl shadow-primary/20 gap-3"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                  Start Capture
                </Button>
              ) : (
                <Card className="border-primary/20 bg-primary/5 shadow-inner rounded-2xl p-5 flex items-center justify-between">
                   <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</span>
                    <span className="text-2xl font-black tabular-nums text-primary mt-1">{formatTime(recorder.elapsedMs)}</span>
                  </div>
                  <Button 
                    variant="destructive"
                    size="icon"
                    onClick={recorder.stopRecording}
                    className="h-14 w-14 rounded-2xl shadow-xl shadow-destructive/20"
                  >
                    <Square className="h-6 w-6 fill-current" />
                  </Button>
                </Card>
              )}

              <Button 
                variant="outline"
                size="lg"
                onClick={() => setShowWebcam(!showWebcam)}
                className={cn(
                  "w-full h-14 rounded-2xl border-border/50 gap-3",
                  showWebcam && "bg-primary/10 border-primary text-primary"
                )}
              >
                <Camera className="h-5 w-5" />
                {showWebcam ? 'Hide' : 'Show'} Camera Preview
              </Button>
            </div>

            {/* Post-Recording Options */}
            <AnimatePresence>
              {recorder.recordedVideoUrl && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-tight">Capture Ready</h3>
                    <Button variant="ghost" size="icon-xs" onClick={recorder.reset}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border/50">
                    <video src={recorder.recordedVideoUrl} controls className="w-full h-full object-contain" />
                  </div>

                  {recorder.uploadSuccess ? (
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold">Successfully Uploaded!</span>
                    </div>
                  ) : recorder.isUploading ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Uploading...</span>
                        <span>{recorder.uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                        <motion.div className="h-full bg-primary" animate={{ width: `${recorder.uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={recorder.uploadToS3} className="gap-2">
                        <CloudUpload className="h-3.5 w-3.5" />
                        Upload
                      </Button>
                      <Button variant="outline" className="gap-2 border-border/50" asChild>
                        <a href={recorder.recordedVideoUrl} download="capture.webm">
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
                  className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 text-destructive text-[11px] font-bold"
                >
                  <X className="h-4 w-4 shrink-0" />
                  {recorder.error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* User Footer */}
            <footer className="pt-6 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={user.image} className="w-10 h-10 rounded-full border-2 border-primary/20 shadow-sm" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-none">{user.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-1.5">Pro Member</span>
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
  );
}
