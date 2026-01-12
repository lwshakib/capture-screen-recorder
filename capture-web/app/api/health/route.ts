import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Simple connectivity check. 
 * Used by the Chrome Extension to verify the server is online before starting auth.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
