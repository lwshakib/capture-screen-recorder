import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Square, 
  Camera, 
  Mic, 
  Monitor, 
  GripHorizontal, 
  LogOut, 
  Loader2,
  X,
  CheckCircle2,
  Video,
  Settings2
} from "lucide-react";
import { useExtensionContext } from "../../context/ExtensionContext";
import { useRecorder } from "../hooks/useRecorder";
import CustomSelect from "./CustomSelect";
import WebcamBubble from "./WebcamBubble";

const CANDIDATE_RESOLUTIONS = [
  { label: "720p (HD)", width: 1280, height: 720 },
  { label: "1080p (FHD)", width: 1920, height: 1080 },
  { label: "4K (Ultra)", width: 3840, height: 2160 },
];

export default function App() {
  const [show, setShow] = useState(false);
  const { user, status, login, logout, checkAuth } = useExtensionContext();
  const recorder = useRecorder();

  // Settings state
  const [supported] = useState(CANDIDATE_RESOLUTIONS);
  const [selectedRes, setSelectedRes] = useState(CANDIDATE_RESOLUTIONS[0]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    checkAuth();
    
    const setup = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter(d => d.kind === "audioinput");
        setAudioInputs(audios);
        setSelectedAudioId(audios[0]?.deviceId || null);
      } catch {}
    };
    setup();

    const handleMessage = (msg: any) => {
      if (msg.action === "TOGGLE") setShow(prev => !prev);
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [checkAuth]);

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
                className="pointer-events-auto fixed z-[9999] w-[300px] bg-card/95 backdrop-blur-2xl border border-border shadow-2xl rounded-2xl overflow-hidden text-foreground theme-dark font-sans"
                style={{ left: "30px", bottom: "30px" }}
              >
                <div className="flex items-center justify-between px-5 py-3.5 bg-primary/5 border-b border-border/50 cursor-grab active:cursor-grabbing group">
                  <div className="flex items-center gap-2">
                    <GripHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[11px] font-bold tracking-tight text-primary">Capture Studio</span>
                  </div>
                  <button onClick={() => setShow(false)} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="p-5 space-y-6">
                  {status === "loading" ? (
                    <div className="py-10 flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-[10px] font-medium text-muted-foreground">Initializing...</span>
                    </div>
                  ) : !user ? (
                    <div className="space-y-4 text-center py-2">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                        <Video className="h-7 w-7 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm tracking-tight">Sign in to Capture</h3>
                        <p className="text-[10px] text-muted-foreground leading-relaxed px-4">Connect your account to enable professional recording.</p>
                      </div>
                      <button onClick={login} className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
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
                            {supported.map(r => (
                              <button 
                                key={r.label} 
                                onClick={() => setSelectedRes(r)}
                                className={`h-8 rounded-lg text-[10px] font-bold transition-all border ${
                                  selectedRes.width === r.width 
                                    ? 'bg-primary/10 border-primary text-primary shadow-sm shadow-primary/5' 
                                    : 'bg-accent/30 border-transparent text-muted-foreground hover:bg-accent/60'
                                }`}
                              >
                                {r.label.split(' ')[0]}
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
                              ...audioInputs.map(d => ({ label: d.label || 'Default Mic', value: d.deviceId }))
                            ]}
                            value={selectedAudioId || ""}
                            onChange={(val) => setSelectedAudioId(val || null)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button 
                          onClick={recorder.startRecording}
                          className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Capture
                        </button>
                        <button 
                          onClick={() => setShowWebcam(!showWebcam)}
                          className={`h-12 w-12 flex items-center justify-center rounded-xl border transition-all ${showWebcam ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5' : 'bg-accent/30 border-border/50 text-muted-foreground hover:bg-accent'}`}
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2.5 pt-3">
                          <div className="h-8 w-8 rounded-full border border-primary/20 p-0.5">
                            <img src={user.image} className="w-full h-full object-cover rounded-full" />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className="text-[11px] font-bold">{user.name}</span>
                            <span className="text-[9px] text-muted-foreground">Verified Account</span>
                          </div>
                        </div>
                        <button onClick={logout} className="mt-3 h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-all text-muted-foreground">
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
                className="pointer-events-auto fixed z-[10000] h-14 bg-card/95 backdrop-blur-2xl border border-border shadow-2xl rounded-2xl flex items-center gap-4 px-4 theme-dark text-foreground"
                style={{ left: "50%", bottom: "40px", x: "-50%" }}
              >
                <div className="flex items-center gap-3 pr-4 border-r border-border/50">
                  <div className="h-3 w-3 rounded-full bg-destructive animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
                  <span className="text-sm font-black tabular-nums tracking-tight text-primary">
                    {formatTime(recorder.elapsedMs)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={recorder.stopRecording}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:opacity-90 active:scale-[0.95] transition-all"
                    title="Stop Recording"
                  >
                    <Square className="h-4.5 w-4.5 fill-current" />
                  </button>
                  <button 
                    onClick={() => setShowWebcam(!showWebcam)}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all ${showWebcam ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5' : 'bg-accent/30 border-border/50 text-muted-foreground hover:bg-accent'}`}
                    title="Toggle Camera"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <button 
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent/30 border border-border/50 text-muted-foreground hover:bg-accent transition-all"
                    title="Settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="pl-2 cursor-grab active:cursor-grabbing group">
                  <GripHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Persistent Webcam Bubble */}
      {showWebcam && <WebcamBubble />}

      {/* Post-Recording Preview Modal */}
      <AnimatePresence>
        {recorder.recordedVideoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-background/90 backdrop-blur-xl pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border shadow-3xl rounded-3xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-7 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">Review Recording</h3>
                  <button onClick={recorder.reset} className="h-10 w-10 rounded-full hover:bg-accent flex items-center justify-center transition-all">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                  <video src={recorder.recordedVideoUrl} controls className="w-full h-full object-contain" />
                </div>

                {recorder.uploadSuccess ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center animate-in fade-in slide-in-from-bottom-4">
                    <div className="h-14 w-14 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-1">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <h4 className="font-bold text-lg text-green-500">Video Uploaded!</h4>
                    <p className="text-xs text-muted-foreground px-12">Successfully synced to your cloud library.</p>
                    <button onClick={recorder.reset} className="mt-4 px-8 h-10 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg shadow-primary/20">
                      Done
                    </button>
                  </div>
                ) : recorder.isUploading ? (
                  <div className="space-y-4 py-4 px-2">
                    <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                      <span>Uploading</span>
                      <span>{recorder.uploadProgress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-accent rounded-full overflow-hidden shadow-inner">
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
                      className="h-12 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="h-4.5 w-4.5 fill-current" />
                      Upload to Cloud
                    </button>
                    <a 
                      href={recorder.recordedVideoUrl} 
                      download={`capture-${Date.now()}.webm`}
                      className="h-12 bg-secondary text-foreground rounded-2xl font-bold text-sm border border-border/50 hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
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
  );
}
