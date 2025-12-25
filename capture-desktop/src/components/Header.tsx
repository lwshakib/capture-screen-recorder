import { X } from "lucide-react";
import { useRecorderContext } from "../context";
import { ModeToggle } from "./mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user } = useRecorderContext();

  const handleCloseToTray = () => {
    // Send IPC message to hide window to tray
    if (window.ipcRenderer) {
      window.ipcRenderer.send("hideToTray");
    }
  };


  return (
    <div className="flex justify-between items-center p-5 draggable">
      <span className="non-draggable">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
            <AvatarFallback>
              {user?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ModeToggle />
        </div>
      </span>
      <div className="flex items-center gap-2 non-draggable">
        <X
          className="w-6 h-6 cursor-pointer hover:text-red-500 transition-colors"
          onClick={handleCloseToTray}
        />
      </div>
    </div>
  );
}
