import type { ExtensionMessage } from "./types/messages"
import { logger } from "./utils/logger"

/**
 * Listener for the extension action button (the icon in the toolbar).
 * This toggles the recording UI on the current active tab.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

chrome.action.onClicked.addListener(async () => {
  // If we want to do something else on click, we can do it here.
  // But openPanelOnActionClick handles the opening automatically.
})

let isAuthFlowInProgress = false

/**
 * Universal runtime message listener.
 * Handles inter-script communication (Content Script -> Background Script).
 */
chrome.runtime.onMessage.addListener(
  async (message: ExtensionMessage, sender) => {
    // Handle the start of the OAuth authentication flow
    if (message?.action === "AUTH_START") {
      if (isAuthFlowInProgress) {
        logger.warn("Auth flow is already in progress. Ignoring request.")
        return
      }

      isAuthFlowInProgress = true

      const webUrl = message?.webUrl as string
      if (!webUrl) {
        logger.error("AUTH_START message missing webUrl")
        isAuthFlowInProgress = false
        return
      }

      // Generate redirect URI for Chrome identity API
      const redirectUri = chrome.identity.getRedirectURL("provider_cb")
      const authUrl = `${webUrl}/auth/extension?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`

      logger.debug("Starting auth flow...", { webUrl, redirectUri })

      // Verify web app connectivity before launching auth window
      try {
        const healthCheck = await fetch(`${webUrl}/api/health`)
        if (!healthCheck.ok)
          throw new Error(
            `Health check failed with status ${healthCheck.status}`
          )
        logger.debug("Web app health check passed.")
      } catch (err) {
        logger.error("Web app is not accessible at", webUrl, err)
        if (sender.tab?.id !== undefined) {
          chrome.tabs
            .sendMessage(sender.tab.id, {
              action: "AUTH_ERROR",
              payload: {
                reason:
                  "Web app is unavailable. Ensure 'npm run dev' is running in apps/web.",
              },
            })
            .catch(() => {})
        }
        isAuthFlowInProgress = false
        return
      }

      // Launch the Chrome Identity Auth Flow
      logger.info("Launching auth flow window...", { authUrl })

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (redirectedTo) => {
          if (chrome.runtime.lastError) {
            logger.error("Auth Flow runtime error:", chrome.runtime.lastError)
            if (sender.tab?.id !== undefined) {
              chrome.tabs
                .sendMessage(sender.tab.id, {
                  action: "AUTH_ERROR",
                  payload: {
                    reason: `Platform error: ${chrome.runtime.lastError.message}`,
                  },
                })
                .catch(() => {})
            }
            isAuthFlowInProgress = false
            return
          }

          // Handle user cancellation or empty redirects
          if (!redirectedTo) {
            logger.error("Auth flow cancelled or failed to redirect.")
            if (sender.tab?.id !== undefined) {
              chrome.tabs
                .sendMessage(sender.tab.id, {
                  action: "AUTH_ERROR",
                  payload: { reason: "Authentication was cancelled." },
                })
                .catch(() => {})
            }
            isAuthFlowInProgress = false
            return
          }

          try {
            const u = new URL(redirectedTo)

            // Extract the authentication token from either query params or URL hash
            let params = new URLSearchParams(u.search)
            let token = params.get("token")

            if (!token && u.hash) {
              params = new URLSearchParams(u.hash.substring(1))
              token = params.get("token")
            }

            if (!token) {
              logger.error("No token found in redirect URL.")
              if (sender.tab?.id !== undefined) {
                chrome.tabs
                  .sendMessage(sender.tab.id, {
                    action: "AUTH_ERROR",
                    payload: { reason: "No auth token received. Try again." },
                  })
                  .catch(() => {})
              }
              isAuthFlowInProgress = false
              return
            }

            // Save the retrieved token to persistent local storage
            if (!chrome.storage?.local) {
              throw new Error("Local storage is unavailable")
            }

            chrome.storage.local.set({ authToken: token }, () => {
              logger.debug("Auth success: Token saved.")

              // Notify the popup if it's open
              chrome.runtime
                .sendMessage({
                  action: "AUTH_SUCCESS",
                  payload: { token },
                })
                .catch(() => {})

              // Broadcast success to ALL open tabs so current page can update UI
              chrome.tabs.query({}, (tabs) => {
                for (const t of tabs) {
                  if (t.id !== undefined) {
                    chrome.tabs
                      .sendMessage(t.id, {
                        action: "AUTH_SUCCESS",
                        payload: { token },
                      })
                      .catch(() => {})
                  }
                }
              })
              isAuthFlowInProgress = false
            })
          } catch (err) {
            logger.error("Failed to parse redirect URL", err)
            if (sender.tab?.id !== undefined) {
              chrome.tabs
                .sendMessage(sender.tab.id, {
                  action: "AUTH_ERROR",
                  payload: { reason: "Invalid response from auth provider." },
                })
                .catch(() => {})
            }
            isAuthFlowInProgress = false
          }
        }
      )
    }
  }
)
