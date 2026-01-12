/**
 * Environment variable validation and type-safe access
 */

// Interface defining the expected environment variables
interface Env {
  VITE_WEB_URL: string; // Base URL for the web application and API
  VITE_VERIFICATION_SECRET_KEY: string; // Secret key for electron link verification
}

/**
 * Validates required environment variables on startup.
 * Throws an error if any required variables are missing to prevent runtime crashes.
 */
export function validateEnv(): Env {
  const envVars = {
    VITE_WEB_URL: import.meta.env.VITE_WEB_URL,
    VITE_VERIFICATION_SECRET_KEY: import.meta.env.VITE_VERIFICATION_SECRET_KEY,
  };

  const missing: string[] = [];

  // Check for each required variable
  if (!envVars.VITE_WEB_URL) {
    missing.push("VITE_WEB_URL");
  }

  if (!envVars.VITE_VERIFICATION_SECRET_KEY) {
    missing.push("VITE_VERIFICATION_SECRET_KEY");
  }

  // Raise error with clear instructions if variables are missing
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env file or environment configuration."
    );
  }

  // Return the validated environment object
  return envVars as Env;
}

/**
 * Exported validated environment object.
 * Use this 'env' constant instead of directly accessing 'import.meta.env'
 * to ensure you are working with validated data.
 */
export const env = validateEnv();
