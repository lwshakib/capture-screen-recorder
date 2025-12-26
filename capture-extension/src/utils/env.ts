/**
 * Type-safe environment variable access
 */

export function getWebUrl(): string {
  const webUrl = import.meta.env.VITE_WEB_URL;
  
  if (!webUrl) {
    throw new Error(
      "VITE_WEB_URL is not defined. Please set it in your .env file."
    );
  }
  
  return webUrl;
}

export function getWebUrlOrNull(): string | null {
  return import.meta.env.VITE_WEB_URL || null;
}

