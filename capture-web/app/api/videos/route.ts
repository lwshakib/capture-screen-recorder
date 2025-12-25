import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VIDEO_PRIVACY } from "@/generated/prisma/enums";
import { inngest } from "@/inngest/client";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, cloudinaryPublicId, url, m3u8Url, width, height, byteSize, duration, format } = body;

    if (!cloudinaryPublicId || !url) {
       return NextResponse.json({ error: "Invalid video data" }, { status: 400 });
    }

    // Map Cloudinary response to Prisma model
    const newVideo = await prisma.video.create({
      data: {
        title: title || "",
        description: description || "",
        userId: session.user.id,
        cloudinaryPublicId: cloudinaryPublicId,
        url: url || "",
        // Cloudinary HLS url usually ends with .m3u8 replacing the extension, 
        // but we might not have it readily available without eager transformation.
        // For now we can leave it null or try to construct it if we know the pattern.
        // Assuming null is safe as per schema.
        m3u8Url: m3u8Url || "",
        width: width || 0,
        height: height || 0,
        byteSize: byteSize || 0,
        duration: duration || 0,
        format: format || "",
        privacy: VIDEO_PRIVACY.PRIVATE,
      },
    });

    await inngest.send({
        name: "video.processed",
        data: {
            video: newVideo,
        },
    });

    return NextResponse.json({ newVideo });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
