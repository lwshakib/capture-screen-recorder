import { WEB_URL } from "../lib/constants";

/**
 * Environment configuration for the Chrome Extension.
 * Provides type-safe access to build-time variables.
 * Now uses constants from src/lib/constants.ts instead of .env
 */
interface Env {
  VITE_WEB_URL: string;
}

export const env: Env = {
  VITE_WEB_URL: WEB_URL,
};

/**
 * Returns the configured web URL.
 */
export function getWebUrlOrNull(): string {
  return env.VITE_WEB_URL;
}
