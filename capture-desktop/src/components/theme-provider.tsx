import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    let currentResolvedTheme: "light" | "dark" = "light";

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

  // Listen for theme changes from other windows via IPC
  useEffect(() => {
    const handleThemeChange = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => {
      const newTheme = args[0] as Theme;
      if (newTheme !== theme) {
        setTheme(newTheme);
        localStorage.setItem(storageKey, newTheme);
      }
    };

    // Check if we're in an Electron environment
    if (window.ipcRenderer) {
      window.ipcRenderer.on("theme-changed", handleThemeChange);

      return () => {
        window.ipcRenderer.removeListener("theme-changed", handleThemeChange);
      };
    }
  }, [theme, storageKey]);

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);

      // Broadcast theme change to other windows via IPC
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

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
