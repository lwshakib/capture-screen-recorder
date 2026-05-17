import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getDownloadSignedUrl, deleteS3Object } from "@/lib/s3"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Generate signed URL for the video path using the centralized helper
    const signedUrl = await getDownloadSignedUrl(video.path)

    return NextResponse.json({
      success: true,
      video: {
        ...video,
        videoData: {
          url: signedUrl,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching video:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const video = await prisma.video.findUnique({
      where: { id, userId: session.user.id },
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // 1. Delete from S3 using the centralized helper
    await deleteS3Object(video.path)

    // 2. Delete from Database
    await prisma.video.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { privacy } = body

    if (!privacy || !["PUBLIC", "PRIVATE"].includes(privacy)) {
      return NextResponse.json(
        { error: "Invalid privacy value" },
        { status: 400 }
      )
    }

    const updatedVideo = await prisma.video.update({
      where: { id, userId: session.user.id },
      data: { privacy },
    })

    return NextResponse.json({ success: true, video: updatedVideo })
  } catch (error) {
    console.error("Error updating video:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
