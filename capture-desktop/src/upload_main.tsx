// Entry point for the "Upload" Window (Progress modal)
import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./components/theme-provider.tsx";
import "./index.css";
import UploadApp from "./upload_app";

// Initialize the React application for the Upload process
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Theme provider ensures the modal matches the user's color scheme preference */}
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <UploadApp />
    </ThemeProvider>
  </React.StrictMode>
);
