import { cloudinaryClient } from "@/config";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Handle OPTIONS requests for CORS preflight.
 * Essential for the Chrome Extension to communicate with the API from different origins.
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
 * GET /api/token/cloudinary-signature
 * Generates a signed upload signature for Cloudinary.
 * This allows the client (Chrome Extension) to upload directly to Cloudinary
 * without exposing sensitive API secrets.
 */
export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  try {
    // Validate session via Bearer Token (shared logic with Better Auth)
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }

    // Verify user exists in the database
    const userExists = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "User not found" },
        {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }

    // Cloudinary signature parameters
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "capture-screen-recordings";

    // Generate SHA-1 signature using Cloudinary SDK
    const signature = cloudinaryClient.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json(
      {
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY!,
      },
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
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}
