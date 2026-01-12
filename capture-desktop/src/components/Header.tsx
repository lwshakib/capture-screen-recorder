import { X } from "lucide-react";
import { useRecorderContext } from "../context";
import { ModeToggle } from "./mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Header Component
 * Displays user profile, theme toggle, and a close button that minimizes to the tray.
 */
export default function Header() {
  // Retrieve current user from context
  const { user } = useRecorderContext();

  /**
   * Tells the main process to hide the current window to the system tray
   */
  const handleCloseToTray = () => {
    // Communication with Electron's main process via IPC
    if (window.ipcRenderer) {
      window.ipcRenderer.send("hideToTray");
    }
  };


  return (
    // Header container with drag support
    <div className="flex justify-between items-center p-5 draggable">
      <span className="non-draggable">
        <div className="flex items-center gap-2">
          {/* User profile avatar */}
          <Avatar>
            <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
            <AvatarFallback>
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Theme switcher button */}
          <ModeToggle />
        </div>
      </span>
      <div className="flex items-center gap-2 non-draggable">
        {/* Close/Minimize button */}
        <X
          className="w-6 h-6 cursor-pointer hover:text-red-500 transition-colors"
          onClick={handleCloseToTray}
        />
      </div>
    </div>
  );
}
