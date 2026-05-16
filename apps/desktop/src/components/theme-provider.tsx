import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme; // Theme to use if nothing is stored in localStorage
  storageKey?: string; // key name for localStorage
};

type ThemeProviderState = {
  theme: Theme; // The raw theme setting (dark, light, or system)
  resolvedTheme: "light" | "dark"; // The actual active theme based on system settings
  setTheme: (theme: Theme) => void; // Function to update the theme
};

// Default initial state for the context
const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
};

// Create the context for theme management
const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * ThemeProvider Component
 * Manages the color scheme (Dark/Light) for the entire application.
 * Synchronizes with local storage and Electron IPC to keep all windows in sync.
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // state for the theme setting
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // state for the actual resolved theme (resolves 'system' to 'light' or 'dark')
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Effect to update the DOM <html> class when the theme setting changes
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    let currentResolvedTheme: "light" | "dark" = "light";

    // Handle system preference resolution
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      currentResolvedTheme = systemTheme;
    } else {
      root.classList.add(theme);
      currentResolvedTheme = theme;
    }

    setResolvedTheme(currentResolvedTheme);
  }, [theme]);

  // Effect: Sync theme from other app windows via Electron IPC
  useEffect(() => {
    const handleThemeChange = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      const newTheme = args[0] as Theme;
      if (newTheme !== theme) {
        setTheme(newTheme);
        localStorage.setItem(storageKey, newTheme);
      }
    };

    // Attach IPC listener if running within Electron
    if (window.ipcRenderer) {
      window.ipcRenderer.on("theme-changed", handleThemeChange);

      return () => {
        window.ipcRenderer.removeListener("theme-changed", handleThemeChange);
      };
    }
  }, [theme, storageKey]);

  // Context value to be distributed to components
  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      // Save to disk
      localStorage.setItem(storageKey, theme);
      // Update local state
      setTheme(theme);

      // Broadcast theme change to all other Electron windows (Studio, etc.)
      console.log("theme-changed", theme);
      if (window.ipcRenderer) {
        window.ipcRenderer.send("theme-changed", theme);
      }
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/**
 * Custom hook to access the theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
