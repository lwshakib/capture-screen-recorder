/**
 * Centralized logging utility for the desktop application.
 * Provides structured logging with different log levels (info, warn, error, debug).
 * Automatically suppresses verbose logs in production environments to maintain performance.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  // Flag determined by Vite environment
  private isDevelopment = import.meta.env.DEV;

  /**
   * Formats the log message with a timestamp, level prefix, and serializes arguments.
   */
  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    // Serialize objects/arrays for readable console output
    if (args.length > 0) {
      return `${prefix} ${message} ${JSON.stringify(args, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  // General informational logs (safe for dev)
  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage("info", message, ...args));
    }
  }

  // Warning logs - always visible in console
  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message, ...args));
  }

  // Error logs with stack trace extraction
  error(message: string, error?: unknown, ...args: unknown[]): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...args }
      : { error, ...args };
    
    console.error(this.formatMessage("error", message, errorDetails));
    
    // In production, you might want to send errors to an external tracking service
    if (!this.isDevelopment && error instanceof Error) {
      // Placeholder for Sentry/Bugsnag integration
    }
  }

  // Verbose debug logs - only visible in dev
  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", message, ...args));
    }
  }
}

// Singleton instance of the logger
export const logger = new Logger();
