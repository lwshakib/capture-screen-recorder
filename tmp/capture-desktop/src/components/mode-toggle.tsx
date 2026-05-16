import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

/**
 * ModeToggle Component
 * A button that switches the application theme between Light and Dark modes.
 */
export function ModeToggle() {
  // Use the theme context to get current theme and setter
  const { resolvedTheme, setTheme } = useTheme();

  /**
   * Toggles the theme based on the current resolved theme
   */
  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full"
    >
      {/* Switch icon based on current theme state */}
      {resolvedTheme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      {/* Visual accessibility label */}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
