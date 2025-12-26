/**
 * Centralized logging utility
 * In production, these can be filtered or disabled
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log("[Capture]", ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn("[Capture]", ...args);
  },
  error: (...args: any[]) => {
    console.error("[Capture]", ...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug("[Capture]", ...args);
    }
  },
};

export default logger;
