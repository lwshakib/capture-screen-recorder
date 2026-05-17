import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * GET /api/token/users
 * Validates the session token from the Authorization header and returns user details.
 * Used by the Desktop app to verify authentication status.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  try {
    // 1. Authenticate the request using Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // 2. If not authenticated, return 401 Unauthorized
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Session not found or expired." },
        { status: 401, headers: corsHeaders }
      );
    }

    // 3. Return the user information
    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error in /api/token/users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
