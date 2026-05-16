import type { ExtensionMessage } from "./types/messages";
import { logger } from "./utils/logger";

/**
 * Listener for the extension action button (the icon in the toolbar).
 * This toggles the recording UI on the current active tab.
 */
chrome.action.onClicked.addListener(async (tab) => {
  // Ignore tabs without IDs or URLs (e.g., system pages)
  if (tab.id === undefined || !tab.url) {
    return;
  }

  // Security check: Content scripts are restricted on certain system Pages
  try {
    const url = new URL(tab.url);
    const isSpecialPage =
      url.protocol === "chrome:" ||
      url.protocol === "chrome-extension:" ||
      url.protocol === "about:" ||
      url.protocol === "moz-extension:";

    if (isSpecialPage) {
      logger.warn("Content scripts cannot run on special pages:", tab.url);
      return;
    }
  } catch (urlError) {
    // Skip if URL is malformed
    logger.warn("Invalid tab URL:", tab.url);
    return;
  }

  /**
   * Helper function to detect if our content script is already running in the tab.
   * Checks for specific DOM element IDs added by the script.
   */
  const checkContentScriptLoaded = async (): Promise<{
    loaded: boolean;
    outdated: boolean;
  }> => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: () => {
          // Check for the existence of the recorder container
          const hasNew =
            document.getElementById("__capture_screen_recorder") !== null;
          // Check for legacy version to warn user
          const hasOld =
            document.getElementById("__blink_screen_recorder") !== null;
          return { hasNew, hasOld };
        },
      });
      const result = results[0]?.result as
        | { hasNew: boolean; hasOld: boolean }
        | undefined;
      return {
        loaded: result?.hasNew === true,
        outdated: result?.hasOld === true,
      };
    } catch (error) {
      // Return false if scripting API is unavailable for this page
      return { loaded: false, outdated: false };
    }
  };

  /**
   * Attempts to send a TOGGLE message to the content script.
   * Includes retry logic if the script hasn't fully initialized yet.
   */
  const sendToggleMessage = async (
    retries = 3,
    delay = 200
  ): Promise<boolean> => {
    try {
      await chrome.tabs.sendMessage(tab.id!, {
        action: "TOGGLE",
      });
      return true;
    } catch (error) {
      if (retries > 0) {
        // If message fails, check if it's because the script isn't loaded
        const { loaded } = await checkContentScriptLoaded();
        if (!loaded) {
          // Increase delay and try again
          await new Promise((resolve) => setTimeout(resolve, delay));
          return sendToggleMessage(retries - 1, delay * 1.5);
        }
        // If loaded but failed, retry quickly (handles context invalidation)
        await new Promise((resolve) => setTimeout(resolve, 100));
        return sendToggleMessage(retries - 1, delay);
      }

      // Exhausted retries: provide specific debugging info
      const { loaded, outdated } = await checkContentScriptLoaded();
      if (outdated) {
        logger.error(
          "An outdated version of the recorder is detected on this page (Blink). " +
            "Please REFRESH the page to use the new Capture Screen Recorder."
        );
      } else if (!loaded) {
        logger.error(
          "Content script is not loaded on this page. The extension UI will not appear. " +
            "Please refresh the page if this is a newly opened tab."
        );
      } else {
        logger.warn(
          "Content script is loaded but message failed (Extension context may have been invalidated). " +
            "A page refresh is required to reconnect.",
          error
        );
      }
      return false;
    }
  };

  await sendToggleMessage();
});

/**
 * Universal runtime message listener.
 * Handles inter-script communication (Content Script -> Background Script).
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  // Relay TOGGLE command to a specific tab
  if (message?.action === "TOGGLE" && sender.tab?.id !== undefined) {
    chrome.tabs
      .sendMessage(sender.tab.id, { action: "TOGGLE" })
      .catch((error) => {
        logger.warn("Could not send message to tab:", error);
      });
  } 
  
  // Handle the start of the OAuth authentication flow
  else if (message?.action === "AUTH_START") {
    const webUrl = message?.webUrl as string;
    if (!webUrl) {
      logger.error("AUTH_START message missing webUrl");
      return;
    }

    // Generate redirect URI for Chrome identity API
    const redirectUri = chrome.identity.getRedirectURL("provider_cb");
    const authUrl = `${webUrl}/auth/extension?redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    
    logger.debug("Starting auth flow...", { webUrl, redirectUri });

    // Verify web app connectivity before launching auth window
    fetch(`${webUrl}/api/health`).catch(() => {
      logger.error("Web app is not accessible at", webUrl);
      if (sender.tab?.id !== undefined) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "AUTH_ERROR",
          payload: { reason: "Web app is unavailable. Ensure the server is running." },
        }).catch(() => {});
      }
      return;
    });

    // Launch the Chrome Identity Auth Flow
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectedTo) => {
        if (chrome.runtime.lastError) {
          logger.error("Auth Flow runtime error:", chrome.runtime.lastError);
          if (sender.tab?.id !== undefined) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "AUTH_ERROR",
              payload: { reason: `Platform error: ${chrome.runtime.lastError.message}` },
            }).catch(() => {});
          }
          return;
        }

        // Handle user cancellation or empty redirects
        if (!redirectedTo) {
          logger.error("Auth flow cancelled or failed to redirect.");
          if (sender.tab?.id !== undefined) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "AUTH_ERROR",
              payload: { reason: "Authentication was cancelled." },
            }).catch(() => {});
          }
          return;
        }

        try {
          const u = new URL(redirectedTo);
          
          // Extract the authentication token from either query params or URL hash
          let params = new URLSearchParams(u.search);
          let token = params.get("token");

          if (!token && u.hash) {
            params = new URLSearchParams(u.hash.substring(1));
            token = params.get("token");
          }

          if (!token) {
            logger.error("No token found in redirect URL.");
            if (sender.tab?.id !== undefined) {
              chrome.tabs.sendMessage(sender.tab.id, {
                action: "AUTH_ERROR",
                payload: { reason: "No auth token received. Try again." },
              }).catch(() => {});
            }
            return;
          }

          // Save the retrieved token to persistent local storage
          if (!chrome.storage?.local) {
            throw new Error("Local storage is unavailable");
          }

          chrome.storage.local.set({ authToken: token }, () => {
            logger.debug("Auth success: Token saved.");

            // Broadcast success to ALL open tabs so current page can update UI
            chrome.tabs.query({}, (tabs) => {
              for (const t of tabs) {
                if (t.id !== undefined) {
                  chrome.tabs.sendMessage(t.id, {
                    action: "AUTH_SUCCESS",
                    payload: { token },
                  }).catch(() => {});
                }
              }
            });
          });
        } catch (err) {
          logger.error("Failed to parse redirect URL", err);
          if (sender.tab?.id !== undefined) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: "AUTH_ERROR",
              payload: { reason: "Invalid response from auth provider." },
            }).catch(() => {});
          }
        }
      }
    );
  }
});
