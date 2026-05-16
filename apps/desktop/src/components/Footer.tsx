import { LogOutIcon } from "lucide-react";
import { useRecorderContext } from "../context";
import { Logo } from "./logo";

/**
 * Footer Component
 * Displays the application logo and a logout button if the user is authenticated.
 */
export default function Footer() {
  // Destructure state and actions from the global recorder context
  const { logout, user, isUserLoading } = useRecorderContext();
  
  /**
   * Triggers the logout process
   */
  const handleLogout = () => {
    logout();
  };

  return (
    // 'draggable' area for movement, but inner content is 'non-draggable' for interaction
    <div className="flex items-center justify-between p-4 draggable">
      <div className="flex items-center gap-x-2 non-draggable">
        {/* Branding Logo */}
        <Logo />
    
      </div>
      <div className="flex items-center gap-2 non-draggable">
        {/* Show Logout icon only if user is logged in and not loading */}
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
