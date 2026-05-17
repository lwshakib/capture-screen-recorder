import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

/**
 * POST /api/token/videos
 * Endpoint for the Desktop app to upload video metadata after Cloudinary upload.
 * Uses Better Auth to validate the session from the Authorization header.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request using Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    // 2. If not authenticated, return 401 Unauthorized
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to the desktop app." },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()

    // 3. Validate and extract metadata from request body
    const {
      title,
      description,
      path,
      width,
      height,
      byteSize,
      duration,
      format,
    } = body

    if (!title || !path) {
      return NextResponse.json(
        { error: "Missing required video metadata (title or path)." },
        { status: 400, headers: corsHeaders }
      )
    }

    // 4. Save the video to the database via Prisma
    const video = await prisma.video.create({
      data: {
        title,
        description,
        path,
        width: width ? Math.round(width) : null,
        height: height ? Math.round(height) : null,
        byteSize: byteSize ? Math.round(byteSize) : null,
        duration: duration ? Math.round(duration) : null,
        format,
        userId: session.user.id,
      },
    })

    console.log(`Video created: ${video.id} for user: ${session.user.email}`)

    // 5. Return success with the video ID and a redirect URL for the desktop app
    return NextResponse.json(
      {
        success: true,
        message: "Video registered successfully",
        id: video.id,
        redirectUrl: `${process.env.BETTER_AUTH_URL || ""}/video/${video.id}`,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error("Error in POST /api/token/videos:", error)
    return NextResponse.json(
      { error: "Failed to process video metadata." },
      { status: 500, headers: corsHeaders }
    )
  }
}
