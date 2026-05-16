import { useEffect, useState } from "react";
import "./App.css";
import { getWebUrlOrNull } from "../utils/env";
import { logger } from "../utils/logger";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await chrome.storage.local.get("authToken");
        if (token.authToken) {
          setIsAuthenticated(true);

          // Fetch user info
          const webUrl = getWebUrlOrNull();
          if (webUrl) {
            try {
              const response = await fetch(`${webUrl}/api/token/users`, {
                headers: {
                  Authorization: `Bearer ${token.authToken}`,
                  "Content-Type": "application/json",
                },
              });
              if (response.ok) {
                const userData = await response.json();
                setUser(userData.user);
              }
            } catch (error) {
              logger.error("Failed to fetch user:", error);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        logger.error("Failed to check auth:", error);
      }
    };

    checkAuth();

    // Listen for auth changes
    const handleMessage = (message: any) => {
      if (message?.action === "AUTH_SUCCESS") {
        setIsAuthenticated(true);
        checkAuth();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleSignOut = async () => {
    await chrome.storage.local.remove("authToken");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ marginTop: 0 }}>Capture Settings</h2>

      {isAuthenticated ? (
        <div>
          {user && (
            <div
              style={{
                marginBottom: "16px",
                padding: "12px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <p style={{ margin: 0, fontWeight: "bold" }}>Signed in as:</p>
              <p style={{ margin: "4px 0 0 0" }}>
                {user.email || user.name || "User"}
              </p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <p>You are not signed in.</p>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Sign in through the recording interface to upload videos.
          </p>
        </div>
      )}
    </div>
  );
}
