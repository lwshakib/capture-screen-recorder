/**
 * Environment configuration for the Chrome Extension.
 * Provides type-safe access to build-time variables.
 */
interface Env {
  // The base URL for the web application (e.g., http://localhost:3000)
  VITE_WEB_URL: string;
}

/**
 * Returns the validated environment variables.
 * Defaults to localhost if the VITE_WEB_URL is not provided during build.
 */
export const env: Env = {
  VITE_WEB_URL: import.meta.env.VITE_WEB_URL || "http://localhost:3000",
};

/**
 * Returns the configured web URL.
 */
export function getWebUrlOrNull(): string {
  return env.VITE_WEB_URL;
}
