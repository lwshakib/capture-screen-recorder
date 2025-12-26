import { LogOut, Moon, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./ResolutionWidget.css";
import { getWebUrlOrNull } from "../../utils/env";
import { logger } from "../../utils/logger";

type Resolution = { label: string; width: number; height: number };

// Candidate list; will be filtered by device capabilities at runtime
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

// Skeleton UI Component
const WidgetSkeleton = ({ theme: _theme }: { theme: ThemeMode }) => (
  <div className="resolution-widget__body">
    {/* Auth button skeleton */}
    <div className="resolution-widget__auth-buttons">
      <div className="skeleton-button skeleton-button--primary"></div>
    </div>

    {/* Resolution section skeleton */}
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

    {/* Audio input section skeleton */}
    <div className="skeleton-section">
      <div className="skeleton-label"></div>
      <div className="skeleton-radios">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton-radio">
            <div className="skeleton-radio-dot"></div>
            <div className="skeleton-radio-text"></div>
          </div>
        ))}
      </div>
    </div>

    {/* User profile skeleton */}
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
  const [supported, setSupported] = useState<Resolution[]>([]);
  const [selected, setSelected] = useState<Resolution | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const raw = localStorage.getItem("capture_widget_theme");
      return raw === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: 0,
    y: 0,
  }));
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Initialize from storage and default to top-right
  useEffect(() => {
    // Load supported resolutions by probing camera capabilities
    const probe = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        const caps =
          typeof track.getCapabilities === "function"
            ? (track.getCapabilities() as any)
            : {};
        const widthCaps = caps.width;
        const heightCaps = caps.height;
        // Stop immediately after probing
        stream.getTracks().forEach((t) => t.stop());

        if (widthCaps && heightCaps) {
          const minW = widthCaps.min ?? 0;
          const maxW = widthCaps.max ?? Number.MAX_SAFE_INTEGER;
          const minH = heightCaps.min ?? 0;
          const maxH = heightCaps.max ?? Number.MAX_SAFE_INTEGER;
          const filtered = CANDIDATE_RESOLUTIONS.filter(
            (r) =>
              r.width >= minW &&
              r.width <= maxW &&
              r.height >= minH &&
              r.height <= maxH
          ).sort((a, b) => a.width - b.width);
          setSupported(filtered);
          // Initialize selection from storage or highest supported
          try {
            const savedSel = localStorage.getItem(
              "capture_resolution_selected"
            );
            if (savedSel) {
              const parsed = JSON.parse(savedSel) as Resolution;
              const found = filtered.find(
                (r) => r.width === parsed.width && r.height === parsed.height
              );
              setSelected(found ?? filtered[filtered.length - 1] ?? null);
              return;
            }
          } catch {}
          setSelected(filtered[filtered.length - 1] ?? null);
        } else {
          // If capabilities not available, fall back to a conservative filter using settings
          const settings = track.getSettings ? track.getSettings() : {};
          const currentW = (settings as any).width as number | undefined;
          const currentH = (settings as any).height as number | undefined;
          const filtered =
            typeof currentW === "number" && typeof currentH === "number"
              ? CANDIDATE_RESOLUTIONS.filter(
                  (r) => r.width <= currentW && r.height <= currentH
                )
              : CANDIDATE_RESOLUTIONS;
          setSupported(filtered);
          setSelected(filtered[filtered.length - 1] ?? null);
        }
      } catch {
        // If probing fails, leave list empty
        setSupported([]);
        setSelected(null);
      }
    };

    probe();

    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        setAudioInputs(audios);
        const saved = localStorage.getItem("capture_audioinput_selected");
        if (saved) {
          const found = audios.find((d) => d.deviceId === saved);
          setSelectedAudioId(
            found ? found.deviceId : audios[0]?.deviceId ?? null
          );
        } else {
          setSelectedAudioId(audios[0]?.deviceId ?? null);
        }
      } catch {
        setAudioInputs([]);
        setSelectedAudioId(null);
      }
    };
    enumerate();

    try {
      const savedPos = localStorage.getItem(
        "capture_resolution_widget_position"
      );
      if (savedPos) {
        const parsed = JSON.parse(savedPos) as { x: number; y: number };
        setPosition(parsed);
        return;
      }
    } catch {}

    // Default to top-right with margin
    const margin = 20;
    const width = 260; // approximate widget width
    setPosition({
      x: Math.max(margin, window.innerWidth - width - margin),
      y: margin,
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    try {
      localStorage.setItem(
        "capture_resolution_selected",
        JSON.stringify(selected)
      );
    } catch {}
  }, [selected]);

  useEffect(() => {
    if (!selectedAudioId) return;
    try {
      localStorage.setItem("capture_audioinput_selected", selectedAudioId);
    } catch {}
  }, [selectedAudioId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "capture_resolution_widget_position",
        JSON.stringify(position)
      );
    } catch {}
  }, [position]);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const widgetWidth = containerRef.current?.offsetWidth ?? 300;
      const widgetHeight = containerRef.current?.offsetHeight ?? 140;
      const x = Math.min(
        Math.max(0, clientX - dragOffsetRef.current.dx),
        window.innerWidth - widgetWidth
      );
      const y = Math.min(
        Math.max(0, clientY - dragOffsetRef.current.dy),
        window.innerHeight - widgetHeight
      );
      setPosition({ x, y });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      dx: clientX - position.x,
      dy: clientY - position.y,
    };
  };

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientX, e.clientY);
  };

  const onHeaderTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    onDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("capture_widget_theme", next);
    } catch {}
    try {
      const evt = new CustomEvent("capture:theme-change", {
        detail: { theme: next },
      });
      window.dispatchEvent(evt);
    } catch {}
  };

  const startAuth = () => {
    try {
      const webUrl = getWebUrlOrNull();

      if (!webUrl) {
        logger.warn("VITE_WEB_URL is not defined");
        return;
      }
      chrome.runtime.sendMessage({
        action: "AUTH_START",
        webUrl,
      });
    } catch (error) {
      logger.error("Failed to start auth:", error);
    }
  };

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const token = await chrome.storage.local.get("authToken");
      if (!token.authToken) {
        setUser(null);
        return;
      }

      const webUrl = getWebUrlOrNull();
      if (!webUrl) {
        logger.warn("VITE_WEB_URL is not defined, cannot fetch user");
        setUser(null);
        return;
      }

      const response = await fetch(`${webUrl}/api/token/users`, {
        headers: {
          Authorization: `Bearer ${token.authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        logger.warn(
          "Failed to fetch user:",
          response.status,
          response.statusText
        );
        setUser(null);
      }
    } catch (error) {
      logger.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Check for existing authentication when component mounts
  useEffect(() => {
    fetchUser();
  }, []);

  // Listen for authentication messages from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message?.action === "AUTH_SUCCESS") {
        fetchUser();
      } else if (message?.action === "AUTH_ERROR") {
        logger.error("Authentication failed:", message.payload?.reason);
      }
    };

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return (
    <div
      className={`resolution-widget resolution-widget--${theme}`}
      ref={containerRef}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="resolution-widget__header"
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>Capture Widget</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="resolution-widget__theme-btn"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        // Show skeleton UI while loading
        <WidgetSkeleton theme={theme} />
      ) : !user ? (
        // Show only sign-in button when no user
        <div className="resolution-widget__body">
          <div className="resolution-widget__auth-buttons">
            <button
              className="resolution-widget__btn resolution-widget__btn-primary"
              onClick={startAuth}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Sign in"}
            </button>
          </div>
        </div>
      ) : (
        // Show full widget contents when user is authenticated
        <>
          <div className="resolution-widget__body">
            <div className="resolution-widget__label">Recording resolution</div>
            <div
              className="resolution-widget__radios"
              role="radiogroup"
              aria-label="Recording resolution"
            >
              {supported.length === 0 ? (
                <div className="resolution-widget__hint">
                  No supported resolutions detected
                </div>
              ) : (
                supported.map((r) => {
                  const val = `${r.width}x${r.height}`;
                  const checked =
                    !!selected &&
                    selected.width === r.width &&
                    selected.height === r.height;
                  return (
                    <label
                      key={val}
                      className={`resolution-radio${
                        checked ? " resolution-radio--checked" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="capture_resolution"
                        value={val}
                        checked={checked}
                        onChange={() => setSelected(r)}
                      />
                      <span className="resolution-radio__label">{r.label}</span>
                    </label>
                  );
                })
              )}
            </div>
            {selected && (
              <div className="resolution-widget__hint">
                Selected: {selected.width}×{selected.height}
              </div>
            )}

            <div className="resolution-widget__label" style={{ marginTop: 12 }}>
              Audio input
            </div>
            <div
              className="resolution-widget__radios"
              role="radiogroup"
              aria-label="Audio input"
            >
              {audioInputs.length === 0 ? (
                <div className="resolution-widget__hint">
                  No microphones detected
                </div>
              ) : (
                audioInputs.map((d) => {
                  const checked = selectedAudioId === d.deviceId;
                  return (
                    <label
                      key={d.deviceId}
                      className={`resolution-radio${
                        checked ? " resolution-radio--checked" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="capture_audioinput"
                        value={d.deviceId}
                        checked={checked}
                        onChange={() => setSelectedAudioId(d.deviceId)}
                      />
                      <span className="resolution-radio__label">
                        {d.label || "Microphone"}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* User profile section at the bottom */}
          <div className="resolution-widget__user-profile">
            <div className="resolution-widget__user-info">
              <div className="resolution-widget__user-avatar">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || user.email || "User"}
                    className="resolution-widget__avatar-img"
                  />
                ) : (
                  <User size={16} />
                )}
              </div>
              <span className="resolution-widget__username">
                {user.name || user.email || "User"}
              </span>
            </div>
            <button
              className="resolution-widget__logout-btn"
              onClick={() => {
                localStorage.removeItem("authToken");
                setUser(null);
              }}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ResolutionWidget;
