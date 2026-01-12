import { LogOut, Moon, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getWebUrlOrNull } from "../../utils/env";
import { logger } from "../../utils/logger";

/**
 * ResolutionWidget Component
 * Logic for pre-recording setup, including camera/mic selection,
 * hardware capability probing, and user authentication management.
 */

type Resolution = { label: string; width: number; height: number };

// Pre-defined resolutions to test against hardware capabilities
const CANDIDATE_RESOLUTIONS: Resolution[] = [
  { label: "144p (256×144)", width: 256, height: 144 },
  { label: "240p (426×240)", width: 426, height: 240 },
  { label: "360p (640×360)", width: 640, height: 360 },
  { label: "480p (640×480)", width: 640, height: 480 },
  { label: "720p (1280×720)", width: 1280, height: 720 },
  { label: "1080p (1920×1080)", width: 1920, height: 1080 },
  { label: "1440p (2560×1440)", width: 2560, height: 1440 },
  { label: "2160p (3840×2160)", width: 3840, height: 2160 },
];

type ThemeMode = "dark" | "light";

/**
 * Skeleton UI displayed during hardware probing or user data fetching
 */
const WidgetSkeleton = ({ theme: _theme }: { theme: ThemeMode }) => (
  <div className="resolution-widget__body">
    <div className="resolution-widget__auth-buttons">
      <div className="skeleton-button skeleton-button--primary"></div>
    </div>
    <div className="skeleton-section">
      <div className="skeleton-label"></div>
      <div className="skeleton-radios">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-radio">
            <div className="skeleton-radio-dot"></div>
            <div className="skeleton-radio-text"></div>
          </div>
        ))}
      </div>
    </div>
    <div className="resolution-widget__user-profile">
      <div className="resolution-widget__user-info">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-username"></div>
      </div>
      <div className="skeleton-logout-btn"></div>
    </div>
  </div>
);

function ResolutionWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // State for hardware/software settings
  const [supported, setSupported] = useState<Resolution[]>([]);
  const [selected, setSelected] = useState<Resolution | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  
  // Appearance
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const raw = localStorage.getItem("capture_widget_theme");
      return raw === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  // Drag-and-drop mechanics for position persistence
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: 0,
    y: 0,
  }));
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  /**
   * Hardware Probing:
   * 1. Temporarily opens the camera to query max supported resolution.
   * 2. Enumerates microphones.
   * 3. Loads last used position from localStorage.
   */
  useEffect(() => {
    const probe = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        const caps = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};
        
        // Clean up immediately after reading capabilities
        stream.getTracks().forEach((t) => t.stop());

        if (caps.width && caps.height) {
          const filtered = CANDIDATE_RESOLUTIONS.filter(
            (r) => r.width <= (caps.width.max || 0) && r.height <= (caps.height.max || 0)
          ).sort((a, b) => a.width - b.width);
          setSupported(filtered);
          
          // Restore user's previous selection if valid for current hardware
          const savedSel = localStorage.getItem("capture_resolution_selected");
          if (savedSel) {
            const parsed = JSON.parse(savedSel) as Resolution;
            const found = filtered.find(r => r.width === parsed.width);
            setSelected(found || filtered[filtered.length - 1]);
          } else {
            setSelected(filtered[filtered.length - 1]);
          }
        }
      } catch (err) {
        logger.error("Hardware probing failed", err);
      }
    };

    probe();

    // Fetch available audio input devices
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

    // Restore widget coordinates
    try {
      const savedPos = localStorage.getItem("capture_resolution_widget_position");
      if (savedPos) setPosition(JSON.parse(savedPos));
      else {
        // Default: Top right margin
        setPosition({ x: window.innerWidth - 280, y: 20 });
      }
    } catch {}
  }, []);

  /**
   * Global mouse/touch listeners for dragging the floating widget.
   */
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const x = Math.min(Math.max(0, clientX - dragOffsetRef.current.dx), window.innerWidth - 260);
      const y = Math.min(Math.max(0, clientY - dragOffsetRef.current.dy), window.innerHeight - 300);
      setPosition({ x, y });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => { isDraggingRef.current = false; };
    
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = { dx: clientX - position.x, dy: clientY - position.y };
  };

  /**
   * Triggers the auth flow in the background script.
   */
  const startAuth = () => {
    const webUrl = getWebUrlOrNull();
    if (!webUrl) { logger.warn("VITE_WEB_URL missing"); return; }
    chrome.runtime.sendMessage({ action: "AUTH_START", webUrl });
  };

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Syncs user profile data from the web app using the stored Bearer token.
   */
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const { authToken } = await chrome.storage.local.get("authToken");
      if (!authToken) { setUser(null); return; }

      const webUrl = getWebUrlOrNull();
      const response = await fetch(`${webUrl}/api/token/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (e) {
      logger.error("User sync failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  return (
    <div
      className={`resolution-widget resolution-widget--${theme}`}
      ref={containerRef}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header bar handles dragging and theme toggle */}
      <div className="resolution-widget__header" onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <span>Setup</span>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      <div className="resolution-widget__body">
        {isLoading ? <WidgetSkeleton theme={theme} /> : !user ? (
          <button className="primary-btn" onClick={startAuth}>Sign in to Record</button>
        ) : (
          <>
            <div className="label">Resolution</div>
            <div className="radio-group">
               {supported.map(r => (
                 <label key={r.label} className={selected?.width === r.width ? 'active' : ''}>
                   <input type="radio" checked={selected?.width === r.width} onChange={() => setSelected(r)} />
                   {r.label}
                 </label>
               ))}
            </div>
            
            <div className="label">Microphone</div>
            <select value={selectedAudioId || ''} onChange={(e) => setSelectedAudioId(e.target.value)}>
              {audioInputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default'}</option>)}
            </select>

            {/* Account Management */}
            <div className="user-footer">
               <img src={user.image} className="avatar" />
               <span className="name">{user.name}</span>
               <button onClick={() => { chrome.storage.local.remove("authToken"); setUser(null); }}>
                 <LogOut size={14} />
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResolutionWidget;
