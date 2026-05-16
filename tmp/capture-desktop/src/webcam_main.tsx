// Entry point for the "Webcam" Window (Circular overlay)
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import WebcamApp from "./webcam_app";

// Initialize the React application for the Webcam overlay process
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Note: This window is transparent and ignores theme settings since it's a raw video overlay */}
    <WebcamApp />
  </React.StrictMode>
);
