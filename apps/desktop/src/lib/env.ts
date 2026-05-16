import { WEB_URL, VERIFICATION_SECRET_KEY } from "./constants";

/**
 * Environment variable validation and type-safe access
 * Now redirects to src/lib/constants.ts
 */

export const env = {
  VITE_WEB_URL: WEB_URL,
  VITE_VERIFICATION_SECRET_KEY: VERIFICATION_SECRET_KEY,
};
