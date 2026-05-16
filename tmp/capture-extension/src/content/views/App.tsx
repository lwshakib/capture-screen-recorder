import { useEffect, useState } from "react";
import RecordingCard from "./RecordingCard";
import ResolutionWidget from "./ResolutionWidget";
import WebcamBubble from "./WebcamBubble";
import type { ExtensionMessage } from "../../types/messages";

/**
 * App View Component
 * This is the root component of the injected content script UI.
 * It manages the visibility of all widgets and listens for global extension events.
 */
function App() {
  // UI visibility state
  const [show, setShow] = useState(false);
  
  // Persisted state for the webcam overlay
  const [showWebcam, setShowWebcam] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("capture_show_webcam");
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });

  // Global recording status (affects which widgets are visible)
  const [isRecording, setIsRecording] = useState(false);

  // Appearance theme management
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const raw = localStorage.getItem("capture_widget_theme");
      return raw === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  /**
   * Effect Hook: Chrome Runtime Message Listener
   * Handles commands sent from the Background script (e.g., Toggle UI command).
   */
  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message?.action === "TOGGLE") {
        setShow((prev) => !prev);
      } 
      // Broadcast auth changes to any internal listeners
      else if (message?.action === "AUTH_STATE") {
        const payload = message.payload;
        const authed = !!payload?.isSignedIn;
        const ce = new CustomEvent("capture:auth-change", { detail: { authed } });
        window.dispatchEvent(ce);
      } 
      // Handle webcam visibility toggle from hotkeys or background
      else if (message?.action === "TOGGLE_WEBCAM") {
        setShowWebcam((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("capture_show_webcam", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  /**
   * Effect Hook: Custom Browser Event Listener
   * Allows sub-components (like RecordingCard) to communicate state up to the root App
   * using standard DOM events (CustomEvent).
   */
  useEffect(() => {
    // Listen for recording start/stop to hide/show setup widgets
    const onRecording = (e: Event) => {
      const ce = e as CustomEvent<{ recording: boolean }>;
      setIsRecording(!!ce.detail?.recording);
    };
    window.addEventListener(
      "capture:recording-state",
      onRecording as EventListener
    );

    // Domestic trigger for webcam toggle
    const onToggleWebcam = () =>
      setShowWebcam((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("capture_show_webcam", JSON.stringify(next));
        } catch {}
        return next;
      });
    window.addEventListener(
      "capture:webcam-toggle",
      onToggleWebcam as EventListener
    );

    // Listen for theme preference updates
    const onTheme = (e: Event) => {
      const ce = e as CustomEvent<{ theme: "dark" | "light" }>;
      const next = ce.detail?.theme === "light" ? "light" : "dark";
      setTheme(next);
      try {
        localStorage.setItem("capture_widget_theme", next);
      } catch {}
    };
    window.addEventListener("capture:theme-change", onTheme as EventListener);

    // Cleanup all listeners on unmount
    return () => {
      window.removeEventListener(
        "capture:recording-state",
        onRecording as EventListener
      );
      window.removeEventListener(
        "capture:webcam-toggle",
        onToggleWebcam as EventListener
      );
      window.removeEventListener(
        "capture:theme-change",
        onTheme as EventListener
      );
    };
  }, []);

  // Return null if hidden to save battery and performance
  return show ? (
    <div
      className={`${show ? "show-container" : "hide-container"} theme-${theme}`}
      data-theme={theme}
    >
      {/* Configuration widget - only visible before recording starts */}
      {!isRecording && <ResolutionWidget />}
      
      {/* Persistent webcam bubble if enabled */}
      {showWebcam && <WebcamBubble />}
      
      {/* Secondary control card */}
      <RecordingCard />
    </div>
  ) : null;
}

export default App;
