import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;

    const video = await prisma.video.findUnique({
      where: {
        id: videoId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Map Prisma models to the expected frontend structure
    const mappedVideo = {
      id: video.id,
      name: video.title,
      description: video.description,
      transcript: video.transcript,
      thumbnail: video.thumbnail,
      videoData: {
        url: video.url,
        m3u8Url: video.m3u8Url,
      },
      status: "completed",
      privacy: video.privacy.toLowerCase(),
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
      user: video.user,
      chapters: video.chapters,
      clerkId: video.userId, // Mapping userId to clerkId for frontend compatibility
    };

    return NextResponse.json({ success: true, video: mappedVideo });
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = (await params).id;

    // Check if video exists and belongs to the user
    const video = await prisma.video.findUnique({
      where: {
        id: videoId,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the video
    await prisma.video.delete({
      where: {
        id: videoId,
      },
    });

    return NextResponse.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
