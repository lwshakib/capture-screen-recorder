import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { VIDEO_PRIVACY } from "@/generated/prisma/enums";
import { inngest } from "@/inngest/client";

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

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  try {
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
    const existUser = await prisma.user.findUnique({
      where: {
        id: session.user.id!,
      },
    });
    if (!existUser) {
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
    const {
      title,
      cloudinaryPublicId,
      url,
      m3u8Url,
      width,
      height,
      byteSize,
      duration,
      format,
      description,
    } = await req.json();
    const newVideo = await prisma.video.create({
      data: {
        title,
        description,
        userId: existUser.id,
        cloudinaryPublicId,
        url,
        m3u8Url,
        width,
        height,
        byteSize,
        duration,
        format,
        privacy: VIDEO_PRIVACY.PRIVATE,
      },
    });
    await inngest.send({
      name: "video.processed",
      data: {
        video: newVideo,
      },
    });
    return NextResponse.json(
      {
        video: newVideo,
        redirectUrl: process.env.NEXT_PUBLIC_WEB_URL + `/video/${newVideo.id}`,
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
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    );
  }
}
