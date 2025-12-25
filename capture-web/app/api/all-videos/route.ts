import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    // Map Prisma model to match the UI expectations if necessary
    const mappedVideos = videos.map((video) => ({
      id: video.id,
      name: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail,
      videoUrl: video.url,
      duration: video.duration
        ? `${Math.floor(video.duration / 60)}:${(video.duration % 60)
            .toString()
            .padStart(2, "0")}`
        : null,
      status: "completed", // Since they are in the DB, we can assume completed for now
      privacy: video.privacy.toLowerCase(),
      createdAt: video.createdAt.toISOString(),
      user: video.user,
    }));

    return NextResponse.json({ videos: mappedVideos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
