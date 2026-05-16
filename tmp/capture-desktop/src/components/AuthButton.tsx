import { useLocalStorage } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { env } from "@/lib/env";
import { Loader2 } from "lucide-react";

/**
 * AuthButton Component
 * Handles the user authentication flow by creating an electronic link for login.
 */
export default function AuthButton() {
  // Persistence for the auth token using local storage hook
  const [, setToken] = useLocalStorage<string | null>("auth-token-v2", null);
  // Local state to manage loading status during the login process
  const [isLoading, setIsLoading] = useState(false);

  // Effect to listen for auth-token events from the main process (Deep Linking)
  useEffect(() => {
    const handleAuthToken = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const newToken = args[0] as string;
      // Update local storage with the new token received from the deep link
      setToken(newToken);
    };
    // Attach listener to 'auth-token' channel
    window.ipcRenderer.on("auth-token", handleAuthToken);
    
    // Cleanup: remove listener on unmount
    return () => {
      window.ipcRenderer.off("auth-token", handleAuthToken);
    };
  }, [setToken]);

  /**
   * login function
   * Calls the backend to create a secure login link and opens it via Electron's shell.
   */
  const login = async () => {
    try {
      setIsLoading(true);
      // Request login URL from the web application
      const {
        data: { redirectUrl },
      } = await axios.post(
        `${env.VITE_WEB_URL}/api/verification/create-electron-link`,
        {},
        {
          headers: {
            "verification-secret-key": env.VITE_VERIFICATION_SECRET_KEY || "",
          },
          withCredentials: true,
        }
      );
      console.log("redirectUrl", redirectUrl);
      // Instruct main process to open the URL in the system browser
      window.ipcRenderer.send("login", redirectUrl);
    } catch (error) {
      console.error("Login redirect failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 'draggable' class allows the window to be moved by clicking this area
    <div className="h-full flex flex-col items-center justify-center p-6 draggable">
      <div className="w-full max-w-sm flex justify-center">
        {/* 'non-draggable' is required for interactive elements like buttons */}
        <Button
          variant="default"
          size="lg"
          className="non-draggable w-full"
          onClick={() => login()}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Login with Capture"
          )}
        </Button>
      </div>
    </div>
  );
}
