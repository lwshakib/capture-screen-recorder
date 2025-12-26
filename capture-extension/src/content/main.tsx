import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";
import { logger } from "../utils/logger";

logger.debug("Content script loaded");

const container = document.createElement("div");
container.id = "__capture_screen_recorder";
document.body.appendChild(container);
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
