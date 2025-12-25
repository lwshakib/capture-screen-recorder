import { useLocalStorage } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { env } from "@/lib/env";
import { Loader2 } from "lucide-react";

export default function AuthButton() {
  const [, setToken] = useLocalStorage<string | null>("auth-token-v2", null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleAuthToken = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const newToken = args[0] as string;
      setToken(newToken);
    };
    window.ipcRenderer.on("auth-token", handleAuthToken);
    return () => {
      window.ipcRenderer.off("auth-token", handleAuthToken);
    };
  }, [setToken]);
  const login = async () => {
    try {
      setIsLoading(true);
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
      window.ipcRenderer.send("login", redirectUrl);
    } catch (error) {
      console.error("Login redirect failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 draggable">
      <div className="w-full max-w-sm flex justify-center">
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
