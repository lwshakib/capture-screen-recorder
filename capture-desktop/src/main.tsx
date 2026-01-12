// React Application Entry Point for the Main Window (Dashboard)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logger } from "./lib/logger";

// Mount the React application to the DOM
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Error Boundary catches crashes in the component tree */}
    <ErrorBoundary>
      {/* Theme Provider handles light/dark mode persistence */}
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Listen for test messages from the Electron main process
window.ipcRenderer.on("main-process-message", (_event, message) => {
  logger.info("Main process message received", { message });
});
