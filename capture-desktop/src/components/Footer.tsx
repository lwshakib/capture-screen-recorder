import { LogOutIcon } from "lucide-react";
import { useRecorderContext } from "../context";
import { Logo } from "./logo";

export default function Footer() {
  const { logout, user, isUserLoading } = useRecorderContext();
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex items-center justify-between p-4 draggable">
      <div className="flex items-center gap-x-2 non-draggable">
        <Logo />
    
      </div>
      <div className="flex items-center gap-2 non-draggable">
        {user && !isUserLoading && (
          <div title="Logout">
            <LogOutIcon
              className="h-4 w-4 cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              onClick={handleLogout}
            />
          </div>
        )}
      </div>
    </div>
  );
}
