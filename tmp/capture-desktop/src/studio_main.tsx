// Entry point for the "Studio" Window (Floating recording controls)
import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./components/theme-provider.tsx";
import "./index.css";
import StudioApp from "./studio_app";

// Initialize the React application for the Studio process
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Theme provider ensures visual consistency across multiple windows */}
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StudioApp />
    </ThemeProvider>
  </React.StrictMode>
);
