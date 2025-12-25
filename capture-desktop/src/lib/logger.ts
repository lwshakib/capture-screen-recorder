/**
 * Centralized logging utility for the desktop application
 * Provides structured logging with different log levels
 */

type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (args.length > 0) {
      return `${prefix} ${message} ${JSON.stringify(args, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage("info", message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage("warn", message, ...args));
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...args }
      : { error, ...args };
    
    console.error(this.formatMessage("error", message, errorDetails));
    
    // In production, you might want to send errors to an error tracking service
    if (!this.isDevelopment && error instanceof Error) {
      // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", message, ...args));
    }
  }
}

export const logger = new Logger();

