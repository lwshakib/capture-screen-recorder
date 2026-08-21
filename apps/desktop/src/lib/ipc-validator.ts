/**
 * IPC message validation utilities for security.
 * These functions ensure that data received from the Renderer (or passed back to Main)
 * matches expected types and formats before processing.
 */

/**
 * Maximum allowed size (in bytes) for a recording data payload received over IPC.
 * Recording data is sent as chunked buffers, not full session dumps, so 100 MB is
 * a practical and security-conscious upper bound. Payloads exceeding this are
 * considered anomalous and likely malicious or the result of a faulty process.
 */
const MAX_RECORDING_BYTES = 100 * 1024 * 1024 // 100 MB

/**
 * Checks if a value is a valid HTTP/HTTPS URL.
 * Used to filter malicious links before opening them with the system shell.
 */
export function isValidUrl(url: unknown): url is string {
  if (typeof url !== "string") {
    return false
  }

  try {
    const parsed = new URL(url)
    // Strict protocol check (ignore file://, ftp://, etc. for safety)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Validates the structure of recording data blobs being saved to disk.
 * Ensures data is a byte array, filename is a non-empty string, and the
 * payload does not exceed MAX_RECORDING_BYTES to guard against memory
 * exhaustion / denial-of-service via oversized IPC messages.
 */
export function isValidRecordingData(data: unknown): data is {
  data: number[]
  filename: string
} {
  if (!data || typeof data !== "object") {
    return false
  }

  const record = data as Record<string, unknown>

  if (!Array.isArray(record.data)) {
    return false
  }

  // Guard against oversized payloads that could exhaust process memory.
  // Each element represents one byte, so the element count equals the byte size.
  if (record.data.length > MAX_RECORDING_BYTES) {
    console.warn(
      `[SECURITY] Blocked oversized IPC recording payload: ` +
        `${record.data.length} bytes exceeds the maximum allowed size of ` +
        `${MAX_RECORDING_BYTES} bytes. Possible denial-of-service attempt.`
    )
    return false
  }

  return (
    record.data.every((item) => typeof item === "number") &&
    typeof record.filename === "string" &&
    record.filename.length > 0
  )
}

/**
 * Validates the payload for toggling the webcam overlay.
 */
export function isValidWebcamTogglePayload(
  payload: unknown
): payload is { enabled: boolean } {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const p = payload as Record<string, unknown>
  return typeof p.enabled === "boolean"
}
