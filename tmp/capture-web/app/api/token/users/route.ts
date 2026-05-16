import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Handle OPTIONS requests for CORS preflight.
 */
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

/**
 * GET /api/token/users
 * Returns the currently authenticated user's profile data.
 * Used by the Chrome Extension to sync user state (avatar, name).
 */
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  try {
    // Shared session resolution logic
    const session = await auth.api.getSession({ headers: req.headers });
    
    return NextResponse.json(
      { user: session?.user || null },
      {
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  }
}
