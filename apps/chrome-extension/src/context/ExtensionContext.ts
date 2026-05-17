import { create } from "zustand"
import { WEB_URL } from "../lib/constants"
import { logger } from "../utils/logger"
import axios from "axios"

/**
 * User Type definition
 */
type User = {
  id: string
  name: string
  email: string
  image: string
}

/**
 * ExtensionState Type definition
 */
type ExtensionState = {
  // User Management
  user: User | null
  token: string | null
  status: "idle" | "loading" | "authenticated" | "error"
  error: string | null

  // Actions
  login: () => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  fetchUser: (token: string) => Promise<void>
  setError: (error: string | null) => void
  setStatus: (status: ExtensionState["status"]) => void
}

/**
 * useExtensionContext Store
 * Implementation of the global state store for the Chrome Extension.
 */
export const useExtensionContext = create<ExtensionState>()((set, get) => ({
  user: null,
  token: null,
  status: "idle",
  error: null,

  /**
   * Triggers the OAuth flow via the background script
   */
  login: async () => {
    try {
      set({ status: "loading", error: null })

      // We send a message to the background script to start the auth flow
      // because chrome.identity.launchWebAuthFlow must be called from background or a user-triggered popup action.
      chrome.runtime.sendMessage({
        action: "AUTH_START",
        webUrl: WEB_URL,
      })

      // The background script will broadcast AUTH_SUCCESS when done.
      // We'll listen for it in a separate effect or just wait for the next checkAuth.
    } catch (err: any) {
      set({ status: "error", error: err.message })
      logger.error("Login trigger failed", err)
    }
  },

  /**
   * Clears auth state and storage
   */
  logout: async () => {
    try {
      await chrome.storage.local.remove("authToken")
      set({ user: null, token: null, status: "idle" })
      logger.info("User logged out")
    } catch (err) {
      logger.error("Logout failed", err)
    }
  },

  /**
   * Checks for existing token in storage and validates it
   */
  checkAuth: async () => {
    try {
      set({ status: "loading" })
      const data = await chrome.storage.local.get("authToken")
      const authToken = data.authToken as string | undefined

      if (authToken) {
        set({ token: authToken })
        await get().fetchUser(authToken)
      } else {
        set({ status: "idle", user: null, token: null })
      }
    } catch (err) {
      set({ status: "error", user: null, token: null })
      logger.error("Check auth failed", err)
    }
  },

  /**
   * Fetches user profile from the backend
   */
  fetchUser: async (token: string) => {
    try {
      const cleanToken = token.replace(/^["']+|["']+$/g, "")
      const { data } = await axios.get<{ user: User }>(
        `${WEB_URL}/api/token/users`,
        {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      set({ user: data.user, status: "authenticated", error: null })
      logger.info("User fetched successfully", { userId: data.user.id })
    } catch (err: any) {
      logger.error("Error fetching user profile", err)
      set({ status: "error", error: "Failed to fetch user profile" })
      // If unauthorized, clear token
      if (err.response?.status === 401) {
        get().logout()
      }
    }
  },

  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  setStatus: (status) => set({ status }),
}))
