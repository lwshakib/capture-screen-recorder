import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";
import { logger } from "../utils/logger";

/**
 * Entry point for the Content Script.
 * This runs in the context of every webpage (matching manifest permissions).
 * It injects our UI components using Shadow DOM to prevent style leakage
 * and collisions with the host page's CSS.
 */

// Import component-specific styles as raw strings (?inline suffix)
// This allows us to inject them directly into the Shadow Root
import appStyles from "./views/App.css?inline";
import cardStyles from "./views/RecordingCard.css?inline";
import resStyles from "./views/ResolutionWidget.css?inline";
import webcamStyles from "./views/WebcamBubble.css?inline";
import selectStyles from "./views/CustomSelect.css?inline";

logger.debug("Content script loaded and initializing Shadow DOM host.");

/**
 * Step 1: Create the Host element.
 * This element lives in the standard DOM but acts as the container for the Shadow Root.
 * It is positioned with high z-index but zero dimensions to avoid blocking the page.
 */
const host = document.createElement("div");
host.id = "__capture_screen_recorder_host";
host.style.position = "fixed";
host.style.zIndex = "999999";
host.style.top = "0";
host.style.left = "0";
host.style.width = "0";
host.style.height = "0";
host.style.pointerEvents = "none"; // Clicks pass through the host by default
document.body.appendChild(host);

/**
 * Step 2: Attach the Shadow Root.
 * Using 'open' mode allows the extension logic to continue interacting with the shadow tree.
 */
const shadow = host.attachShadow({ mode: "open" });

/**
 * Step 3: Inject Styles into the Shadow Root.
 * we use the :host selector to reset styles at the boundary.
 */
const style = document.createElement("style");
style.textContent = `
  :host {
    all: initial; /* Reset all inherited styles from the main page */
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  }
  #root {
    pointer-events: auto; /* Re-enable clicks for our actual UI elements */
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

/**
 * Step 4: Create the React mounting target.
 */
const container = document.createElement("div");
container.id = "root";
shadow.appendChild(container);

/**
 * Step 5: Render the React Application.
 */
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
