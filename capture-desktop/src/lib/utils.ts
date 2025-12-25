import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { httpClient } from "../../../capture-desktop/src/lib/httpClient";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CloudinarySignature {
  signature: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
}

export async function getCloudinarySignature(): Promise<CloudinarySignature> {
  try {
    // Get the auth token from localStorage
    const authToken = localStorage.getItem("auth-token-v2");

    if (!authToken) {
      throw new Error("Authentication token not found. Please sign in first.");
    }

    // Clean the token by removing quotes and extra characters
    const cleanToken = authToken.replace(/^["']+|["']+$/g, "");

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
    throw new Error(
      `Failed to get Cloudinary signature: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
