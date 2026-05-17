import { getUploadPresignedUrl } from "@/lib/s3"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      )
    }

    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get("fileName")
    const contentType = searchParams.get("contentType") || "video/webm"

    if (!fileName) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400, headers: corsHeaders }
      )
    }

    const { url, key } = await getUploadPresignedUrl(
      fileName,
      contentType,
      session.user.id
    )

    return NextResponse.json({ url, key }, { headers: corsHeaders })
  } catch (error) {
    console.error("S3 presigned URL error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    )
  }
}
