import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { httpClient } from "./httpClient";

/**
 * cn (Class Name) utility
 * Merges Tailwind CSS classes using clsx and tailwind-merge.
 * This ensures that conflicting utility classes are handled correctly (last one wins).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Interface for Cloudinary upload signature response
export interface CloudinarySignature {
  signature: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
}

/**
 * getCloudinarySignature
 * Fetches a secure upload signature from the backend.
 * Required for direct-from-client uploads to Cloudinary.
 */
export async function getCloudinarySignature(): Promise<CloudinarySignature> {
  try {
    // Retrieve the active auth token to authorize the signature request
    const authToken = localStorage.getItem("auth-token-v2");

    if (!authToken) {
      throw new Error("Authentication token not found. Please sign in first.");
    }

    // Clean the token (remove wrapping quotes)
    const cleanToken = authToken.replace(/^["']+|["']+$/g, "");

    // Request the signature from the private backend API
    const { data } = await httpClient.get<CloudinarySignature>(
      "/api/token/cloudinary-signature",
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
        },
      }
    );
    return data;
  } catch (error) {
    // Wrap and re-throw with context
    throw new Error(
      `Failed to get Cloudinary signature: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
