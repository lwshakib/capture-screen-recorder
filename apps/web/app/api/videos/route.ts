import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getDownloadSignedUrl } from "@/lib/s3"

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      description,
      path,
      duration,
      byteSize,
      format,
      width,
      height,
    } = body

    if (!path) {
      return NextResponse.json({ error: "Missing video path" }, { status: 400 })
    }

    const newVideo = await prisma.video.create({
      data: {
        title: name,
        description: description || "",
        path,
        duration: Math.floor(duration || 0),
        byteSize,
        format,
        width,
        height,
        userId: session.user.id,
      },
    })

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "VIDEO_CREATED",
        message: `Your video "${name || "Untitled Video"}" has been successfully recorded and saved.`,
      },
    })

    return NextResponse.json({ newVideo })
  } catch (error) {
    console.error("Video registration error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const videos = await prisma.video.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Generate signed URLs for all videos
    const videosWithUrls = await Promise.all(
      videos.map(async (video) => {
        const url = await getDownloadSignedUrl(video.path)
        return {
          ...video,
          url,
        }
      })
    )

    return NextResponse.json(videosWithUrls)
  } catch (error) {
    console.error("Videos fetch error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
