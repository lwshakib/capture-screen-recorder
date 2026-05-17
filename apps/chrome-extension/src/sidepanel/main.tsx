import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@workspace/ui/globals.css";
import "./index.css";

const rootElement = document.getElementById("root");
console.log("[Capture] Sidepanel root element:", rootElement);
if (rootElement) {
  console.log("[Capture] Rendering Sidepanel App...");
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} else {
  console.error("[Capture] Sidepanel root element not found!");
}
