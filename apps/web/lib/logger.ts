/**
 * Centralized structured logging utility for the Next.js web application.
 *
 * Provides consistent, levelled log output with ISO timestamps and safe error
 * serialization. Stack traces are included only in non-production environments
 * to prevent information leakage through server logs that may surface in
 * external monitoring dashboards.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("GET /api/token/users", { userId: "abc" })
 *   logger.error("Unhandled error in GET /api/token/users", error, { endpoint: "/api/token/users" })
 */

type LogLevel = "info" | "warn" | "error" | "debug"

interface LogContext {
  [key: string]: unknown
}

/**
 * Serializes an unknown thrown value into a safe, loggable object.
 * Stack traces are omitted in production to avoid leaking implementation details.
 */
function serializeError(error: unknown): LogContext {
  const isProd = process.env.NODE_ENV === "production"

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Only expose stack in non-production to avoid information leakage
      ...(isProd ? {} : { stack: error.stack }),
    }
  }

  // For non-Error thrown values (strings, objects, etc.)
  return { rawError: String(error) }
}

/**
 * Formats a structured log entry as a JSON string for easy parsing by
 * log aggregation tools (e.g., Datadog, CloudWatch, Loki).
 */
function formatEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  })
}

class Logger {
  info(message: string, context?: LogContext): void {
    console.log(formatEntry("info", message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(formatEntry("warn", message, context))
  }

  /**
   * Logs a structured error entry. The raw `error` value is serialized safely —
   * no raw `Error` objects or stack traces are passed directly to `console.error`,
   * preventing accidental exposure of internal paths in log aggregators.
   *
   * @param message  - Human-readable description of where the error occurred.
   * @param error    - The caught value from a catch block.
   * @param context  - Optional additional key/value pairs for debugging context.
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const serialized = error !== undefined ? serializeError(error) : {}
    console.error(
      formatEntry("error", message, {
        ...serialized,
        ...context,
      })
    )
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatEntry("debug", message, context))
    }
  }
}

// Singleton instance
export const logger = new Logger()
