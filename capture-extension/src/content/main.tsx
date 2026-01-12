import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";
import { logger } from "../utils/logger";

// Import styles as strings for Shadow DOM injection
import appStyles from "./views/App.css?inline";
import cardStyles from "./views/RecordingCard.css?inline";
import resStyles from "./views/ResolutionWidget.css?inline";
import webcamStyles from "./views/WebcamBubble.css?inline";
import selectStyles from "./views/CustomSelect.css?inline";

logger.debug("Content script loaded");

// Create host element
const host = document.createElement("div");
host.id = "__capture_screen_recorder_host";
// Ensure the host itself doesn't affect layout
host.style.position = "fixed";
host.style.zIndex = "999999";
host.style.top = "0";
host.style.left = "0";
host.style.width = "0";
host.style.height = "0";
host.style.pointerEvents = "none";
document.body.appendChild(host);

// Create shadow root
const shadow = host.attachShadow({ mode: "open" });

// Create style element
const style = document.createElement("style");
style.textContent = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  #root {
    pointer-events: auto;
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
  }
  ${appStyles}
  ${cardStyles}
  ${resStyles}
  ${webcamStyles}
  ${selectStyles}
`;
shadow.appendChild(style);

// Create container for React
const container = document.createElement("div");
container.id = "root";
shadow.appendChild(container);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
