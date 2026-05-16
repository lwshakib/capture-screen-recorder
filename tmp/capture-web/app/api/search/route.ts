import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ videos: [], folders: [] });
    }

    const videos = await prisma.video.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
    });

    // Format for SearchInput
    const formattedVideos = videos.map(video => ({
      id: video.id,
      name: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail,
      folder: null 
    }));

    return NextResponse.json({
      videos: formattedVideos,
      folders: []
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
