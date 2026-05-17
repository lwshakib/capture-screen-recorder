import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { env } from "@/lib/env"
import { Loader2 } from "lucide-react"

/**
 * AuthButton Component
 * Handles the user authentication flow by creating an electronic link for login.
 */
export default function AuthButton() {
  // Local state to manage loading status during the login process
  const [isLoading, setIsLoading] = useState(false)

  // Effect to listen for auth-token events from the main process (Deep Linking)
  useEffect(() => {
    const handleAuthToken = async (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const newToken = args[0] as string
      // Update local storage with the new token received from the deep link
      await window.ipcRenderer.invoke("save-token", newToken)
      // Force a reload or update state to reflect the new token
      window.location.reload()
    }
    // Attach listener to 'auth-token' channel
    window.ipcRenderer.on("auth-token", handleAuthToken)

    // Cleanup: remove listener on unmount
    return () => {
      window.ipcRenderer.off("auth-token", handleAuthToken)
    }
  }, [])

  /**
   * login function
   * Calls the backend to create a secure login link and opens it via Electron's shell.
   */
  const login = () => {
    try {
      setIsLoading(true)
      // The URL to the web application's dedicated electron auth page
      const authUrl = `${env.VITE_WEB_URL}/desktop`

      // Instruct main process to open the URL in the system browser
      window.ipcRenderer.send("login", authUrl)
    } catch (error) {
      console.error("Login redirect failed", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // 'draggable' class allows the window to be moved by clicking this area
    <div className="draggable flex h-full flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm justify-center">
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
  )
}
