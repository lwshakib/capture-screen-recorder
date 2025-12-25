/**
 * IPC message validation utilities for security
 */

/**
 * Validates that a URL is safe to open externally
 */
export function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates recording data structure
 */
export function isValidRecordingData(data: unknown): data is {
  data: number[];
  filename: string;
} {
  if (!data || typeof data !== "object") {
    return false;
  }

  const record = data as Record<string, unknown>;

  return (
    Array.isArray(record.data) &&
    record.data.every((item) => typeof item === "number") &&
    typeof record.filename === "string" &&
    record.filename.length > 0
  );
}

/**
 * Validates webcam toggle payload
 */
export function isValidWebcamTogglePayload(
  payload: unknown
): payload is { enabled: boolean } {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const p = payload as Record<string, unknown>;
  return typeof p.enabled === "boolean";
}

