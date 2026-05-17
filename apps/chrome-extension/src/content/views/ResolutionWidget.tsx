import { 
  LogOut, 
  Moon, 
  Sun, 
  Monitor, 
  Mic, 
  GripHorizontal,
  Loader2
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logger } from "../../utils/logger";
import { useExtensionContext } from "../../context/ExtensionContext";
import CustomSelect from "./CustomSelect";

/**
 * ResolutionWidget Component
 * Logic for pre-recording setup, including camera/mic selection,
 * hardware capability probing, and user setup.
 */

type Resolution = { label: string; width: number; height: number };

const CANDIDATE_RESOLUTIONS: Resolution[] = [
  { label: "360p", width: 640, height: 360 },
  { label: "480p", width: 640, height: 480 },
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
  { label: "4K", width: 3840, height: 2160 },
];

function ResolutionWidget() {
  const { user, status, login, logout, checkAuth } = useExtensionContext();
  
  // State for hardware/software settings
  const [supported, setSupported] = useState<Resolution[]>([]);
  const [selected, setSelected] = useState<Resolution | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  
  // Appearance
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const raw = localStorage.getItem("capture_widget_theme");
      return raw === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  // Drag-and-drop mechanics
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    checkAuth();
    
    // Probe hardware
    const probe = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const track = stream.getVideoTracks()[0];
        const caps = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};
        stream.getTracks().forEach((t) => t.stop());

        if (caps.width && caps.height) {
          const filtered = CANDIDATE_RESOLUTIONS.filter(
            (r) => r.width <= (caps.width.max || 1920) && r.height <= (caps.height.max || 1080)
          );
          setSupported(filtered);
          const savedSel = localStorage.getItem("capture_resolution_selected");
          if (savedSel) {
            const parsed = JSON.parse(savedSel);
            setSelected(filtered.find(r => r.width === parsed.width) || filtered[filtered.length - 1]);
          } else {
            setSelected(filtered[filtered.length - 1]);
          }
        }
      } catch (err) {
        logger.error("Hardware probing failed", err);
      }
    };
    probe();

    // Enumerate audio
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        setAudioInputs(audios);
        const saved = localStorage.getItem("capture_audioinput_selected");
        setSelectedAudioId(audios.find(d => d.deviceId === saved)?.deviceId || audios[0]?.deviceId || null);
      } catch (e) {
        logger.error("Audio enumeration failed", e);
      }
    };
    enumerate();

    // Restore position
    const savedPos = localStorage.getItem("capture_resolution_widget_position");
    if (savedPos) setPosition(JSON.parse(savedPos));
  }, []);

  useEffect(() => {
    if (selected) localStorage.setItem("capture_resolution_selected", JSON.stringify(selected));
  }, [selected]);

  useEffect(() => {
    if (selectedAudioId) localStorage.setItem("capture_audioinput_selected", selectedAudioId);
  }, [selectedAudioId]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const x = Math.min(Math.max(0, e.clientX - dragOffsetRef.current.dx), window.innerWidth - 260);
      const y = Math.min(Math.max(0, e.clientY - dragOffsetRef.current.dy), window.innerHeight - 300);
      setPosition({ x, y });
    };
    const onMouseUp = () => { 
      isDraggingRef.current = false; 
      localStorage.setItem("capture_resolution_widget_position", JSON.stringify(position));
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [position]);

  const onDragStart = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = { dx: e.clientX - position.x, dy: e.clientY - position.y };
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.dispatchEvent(new CustomEvent("capture:theme-change", { detail: { theme: next } }));
  };

  return (
    <div
      className={`pointer-events-auto fixed flex flex-col w-[260px] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden ${theme === 'dark' ? 'theme-dark' : ''}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header bar handles dragging */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-accent/10 border-b border-border cursor-grab active:cursor-grabbing group"
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recorder Setup</span>
        </div>
        <button 
          onClick={toggleTheme}
          className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Loading Hardware</span>
          </div>
        ) : !user ? (
          <div className="flex flex-col gap-3">
            <div className="text-center space-y-1 mb-2">
              <h4 className="text-xs font-bold uppercase tracking-tight">Authentication Required</h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Sign in to enable recording and cloud uploads.</p>
            </div>
            <button 
              onClick={login}
              className="w-full h-9 bg-primary text-primary-foreground rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Sign in to Capture
            </button>
          </div>
        ) : (
          <>
            {/* Resolution Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Monitor className="h-3 w-3" />
                <span>Resolution</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {supported.map(r => (
                  <button 
                    key={r.label} 
                    onClick={() => setSelected(r)}
                    className={`h-8 px-2 rounded-lg text-[10px] font-bold transition-all border ${
                      selected?.width === r.width 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-accent/30 border-transparent text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Mic className="h-3 w-3" />
                <span>Audio Input</span>
              </div>
              <CustomSelect 
                options={audioInputs.map(d => ({ label: d.label || 'Default Microphone', value: d.deviceId }))}
                value={selectedAudioId}
                onChange={setSelectedAudioId}
              />
            </div>

            {/* Account Management Footer */}
            <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-accent/10 border border-border/10">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full overflow-hidden border border-primary/20">
                  <img src={user.image} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold truncate max-w-[100px]">{user.name}</span>
              </div>
              <button 
                onClick={logout}
                className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResolutionWidget;
