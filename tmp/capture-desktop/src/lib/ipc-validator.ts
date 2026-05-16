/**
 * IPC message validation utilities for security.
 * These functions ensure that data received from the Renderer (or passed back to Main)
 * matches expected types and formats before processing.
 */

/**
 * Checks if a value is a valid HTTP/HTTPS URL.
 * Used to filter malicious links before opening them with the system shell.
 */
export function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(url);
    // Strict protocol check (ignore file://, ftp://, etc. for safety)
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates the structure of recording data blobs being saved to disk.
 * Ensures data is a byte array and filename is a non-empty string.
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
 * Validates the payload for toggling the webcam overlay.
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
