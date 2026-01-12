/**
 * Centralized logging utility for the extension.
 * Helps distinguish between background script and content script logs.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private prefix = "[Capture Extension]";

  private format(level: LogLevel, ...args: unknown[]) {
    return [`${this.prefix} [${level.toUpperCase()}]`, ...args];
  }

  // Debug logs: only useful during development
  debug(...args: unknown[]) {
    if (import.meta.env.DEV) {
      console.debug(...this.format("debug", ...args));
    }
  }

  // Info logs: for general status updates
  info(...args: unknown[]) {
    console.log(...this.format("info", ...args));
  }

  // Warning logs: for non-critical issues
  warn(...args: unknown[]) {
    console.warn(...this.format("warn", ...args));
  }

  // Error logs: for critical failures
  error(...args: unknown[]) {
    console.error(...this.format("error", ...args));
  }
}

export const logger = new Logger();
