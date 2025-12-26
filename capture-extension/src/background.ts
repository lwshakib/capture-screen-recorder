import type { ExtensionMessage } from "./types/messages";
import { logger } from "./utils/logger";

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined || !tab.url) {
    return;
  }

  // Check if the page supports content scripts
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
    // Invalid URL, skip
    logger.warn("Invalid tab URL:", tab.url);
    return;
  }

  // Check if content script is loaded by checking for the container
  const checkContentScriptLoaded = async (): Promise<{
    loaded: boolean;
    outdated: boolean;
  }> => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: () => {
          const hasNew =
            document.getElementById("__capture_screen_recorder") !== null;
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
      // Scripting API might not work on some pages
      return { loaded: false, outdated: false };
    }
  };

  // Try to send message, with retry logic and increasing delays
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
        // Check if content script is loaded
        const { loaded } = await checkContentScriptLoaded();
        if (!loaded) {
          // Content script not loaded yet, wait longer
          await new Promise((resolve) => setTimeout(resolve, delay));
          return sendToggleMessage(retries - 1, delay * 1.5);
        }
        // Content script is loaded but message failed, retry quickly
        await new Promise((resolve) => setTimeout(resolve, 100));
        return sendToggleMessage(retries - 1, delay);
      }

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
        logger.error(
          "This may happen if the page is still loading or if content scripts are blocked by Chrome settings."
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

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  if (message?.action === "TOGGLE" && sender.tab?.id !== undefined) {
    chrome.tabs
      .sendMessage(sender.tab.id, { action: "TOGGLE" })
      .catch((error) => {
        // Content script may not be loaded or page may not support content scripts
        logger.warn("Could not send message to tab:", error);
      });
  } else if (message?.action === "AUTH_START") {
    const webUrl = message?.webUrl as string;
    if (!webUrl) {
      logger.error("AUTH_START message missing webUrl");
      return;
    }

    const redirectUri = chrome.identity.getRedirectURL("provider_cb");
    const authUrl = `${webUrl}/auth/extension?redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    logger.debug("Starting auth flow...");
    logger.debug("Web URL:", webUrl);
    logger.debug("Redirect URI:", redirectUri);
    logger.debug("Auth URL:", authUrl);

    // Check if the web app is accessible
    fetch(`${webUrl}/api/health`).catch(() => {
      logger.error(
        "Web app is not accessible. Make sure it's running on",
        webUrl
      );
      if (sender.tab?.id !== undefined) {
        chrome.tabs
          .sendMessage(sender.tab.id, {
            action: "AUTH_ERROR",
            payload: {
              reason:
                "Web app is not accessible. Please ensure the web app is running.",
            },
          })
          .catch(() => {
            // Content script may not be loaded
          });
      }
      return;
    });

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectedTo) => {
        logger.debug("Auth flow completed. Redirected to:", redirectedTo);
        if (chrome.runtime.lastError) {
          logger.error("Chrome runtime error:", chrome.runtime.lastError);
          if (sender.tab?.id !== undefined) {
            chrome.tabs
              .sendMessage(sender.tab.id, {
                action: "AUTH_ERROR",
                payload: {
                  reason: `Chrome error: ${chrome.runtime.lastError.message}`,
                },
              })
              .catch(() => {
                // Content script may not be loaded
              });
          }
          return;
        }

        if (!redirectedTo) {
          logger.error(
            "No redirect URL received. User may have cancelled the auth flow."
          );
          if (sender.tab?.id !== undefined) {
            chrome.tabs
              .sendMessage(sender.tab.id, {
                action: "AUTH_ERROR",
                payload: {
                  reason: "Authentication was cancelled or failed to complete.",
                },
              })
              .catch(() => {
                // Content script may not be loaded
              });
          }
          return;
        }
        try {
          const u = new URL(redirectedTo);
          logger.debug("Parsing redirect URL:", u.toString());

          // Try to get token from query parameters first (Chrome extension flow)
          let params = new URLSearchParams(u.search);
          let token = params.get("token");

          // If no token in query params, try hash (fallback for OAuth flows)
          if (!token && u.hash) {
            params = new URLSearchParams(u.hash.substring(1));
            token = params.get("token");
          }

          logger.debug("Extracted token:", token ? "Present" : "Missing");

          if (!token) {
            logger.error(
              "No token found in redirect URL. Full URL:",
              redirectedTo
            );
            if (sender.tab?.id !== undefined) {
              chrome.tabs
                .sendMessage(sender.tab.id, {
                  action: "AUTH_ERROR",
                  payload: {
                    reason:
                      "No authentication token received. Please try signing in again.",
                  },
                })
                .catch(() => {
                  // Content script may not be loaded
                });
            }
            return;
          }
          // Check if chrome.storage is available
          if (!chrome.storage || !chrome.storage.local) {
            logger.error("chrome.storage.local is not available");
            if (sender.tab?.id !== undefined) {
              chrome.tabs
                .sendMessage(sender.tab.id, {
                  action: "AUTH_ERROR",
                  payload: { reason: "Storage permission not available" },
                })
                .catch(() => {
                  // Content script may not be loaded
                });
            }
            return;
          }

          chrome.storage.local.set({ authToken: token }, () => {
            logger.debug("Auth token saved to storage");

            // Send success message to all tabs
            chrome.tabs.query({}, (tabs) => {
              for (const t of tabs) {
                if (t.id !== undefined) {
                  chrome.tabs
                    .sendMessage(t.id, {
                      action: "AUTH_SUCCESS",
                      payload: { token },
                    })
                    .catch(() => {
                      // Ignore errors for tabs that don't have content scripts
                    });
                }
              }
            });
          });
        } catch (err) {
          if (sender.tab?.id !== undefined) {
            chrome.tabs
              .sendMessage(sender.tab.id, {
                action: "AUTH_ERROR",
                payload: { reason: `Redirect parse failed: ${String(err)}` },
              })
              .catch(() => {
                // Content script may not be loaded
              });
          }
        }
      }
    );
  }
});
