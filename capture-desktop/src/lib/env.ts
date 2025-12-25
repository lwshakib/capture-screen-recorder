/**
 * Environment variable validation and type-safe access
 */

interface Env {
  VITE_WEB_URL: string;
  VITE_VERIFICATION_SECRET_KEY: string;
}

/**
 * Validates required environment variables
 * Throws an error if any required variables are missing
 */
export function validateEnv(): Env {
  const env = {
    VITE_WEB_URL: import.meta.env.VITE_WEB_URL,
    VITE_VERIFICATION_SECRET_KEY: import.meta.env.VITE_VERIFICATION_SECRET_KEY,
  };

  const missing: string[] = [];

  if (!env.VITE_WEB_URL) {
    missing.push("VITE_WEB_URL");
  }

  if (!env.VITE_VERIFICATION_SECRET_KEY) {
    missing.push("VITE_VERIFICATION_SECRET_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env file or environment configuration."
    );
  }

  return env as Env;
}

/**
 * Get validated environment variables
 * Use this instead of directly accessing import.meta.env
 */
export const env = validateEnv();

