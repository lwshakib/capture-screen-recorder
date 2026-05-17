import { X } from "lucide-react"
import { useRecorderContext } from "../context"
import { ModeToggle } from "./mode-toggle"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"

/**
 * Header Component
 * Displays user profile, theme toggle, and a close button that minimizes to the tray.
 */
export default function Header() {
  // Retrieve current user from context
  const { user } = useRecorderContext()

  /**
   * Tells the main process to hide the current window to the system tray
   */
  const handleCloseToTray = () => {
    // Communication with Electron's main process via IPC
    if (window.ipcRenderer) {
      window.ipcRenderer.send("hideToTray")
    }
  }

  return (
    // Header container with drag support
    <div className="draggable flex items-center justify-between p-5">
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
      <div className="non-draggable flex items-center gap-2">
        {/* Close/Minimize button */}
        <X
          className="h-6 w-6 cursor-pointer transition-colors hover:text-red-500"
          onClick={handleCloseToTray}
        />
      </div>
    </div>
  )
}
