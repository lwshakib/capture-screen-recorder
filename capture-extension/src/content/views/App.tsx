import { useEffect, useState } from "react";
import RecordingCard from "./RecordingCard";
import ResolutionWidget from "./ResolutionWidget";
import WebcamBubble from "./WebcamBubble";
import type { ExtensionMessage } from "../../types/messages";

function App() {
  const [show, setShow] = useState(false);
  const [showWebcam, setShowWebcam] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("capture_show_webcam");
      return raw ? JSON.parse(raw) === true : false;
    } catch {
      return false;
    }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const raw = localStorage.getItem("capture_widget_theme");
      return raw === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message?.action === "TOGGLE") {
        setShow((prev) => !prev);
      } else if (message?.action === "AUTH_STATE") {
        const payload = message.payload;
        const authed = !!payload?.isSignedIn;
        const ce = new CustomEvent("capture:auth-change", { detail: { authed } });
        window.dispatchEvent(ce);
      } else if (message?.action === "TOGGLE_WEBCAM") {
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

  useEffect(() => {
    const onRecording = (e: Event) => {
      const ce = e as CustomEvent<{ recording: boolean }>;
      setIsRecording(!!ce.detail?.recording);
    };
    window.addEventListener(
      "capture:recording-state",
      onRecording as EventListener
    );
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
    const onTheme = (e: Event) => {
      const ce = e as CustomEvent<{ theme: "dark" | "light" }>;
      const next = ce.detail?.theme === "light" ? "light" : "dark";
      setTheme(next);
      try {
        localStorage.setItem("capture_widget_theme", next);
      } catch {}
    };
    window.addEventListener("capture:theme-change", onTheme as EventListener);
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

  return show ? (
    <div
      className={`${show ? "show-container" : "hide-container"} theme-${theme}`}
      data-theme={theme}
    >
      {!isRecording && <ResolutionWidget />}
      {showWebcam && <WebcamBubble />}
      <RecordingCard />
    </div>
  ) : null;
}

export default App;
