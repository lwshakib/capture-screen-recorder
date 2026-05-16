import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CHAT_ROLE } from "@/generated/prisma/enums";
import { streamText } from "@/llm/streamText";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.chatHistory.findMany({
      where: {
        videoId,
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, transcript, videoId } = await req.json();

    const lastMessage = messages[messages.length - 1];

    await prisma.chatHistory.create({
      data: {
        role:
          lastMessage.role === "user" ? CHAT_ROLE.user : CHAT_ROLE.assistant,
        parts: lastMessage.parts,
        videoId,
        userId: session.user.id,
      },
    });

    const result = await streamText(messages, transcript, async (data) => {
      await prisma.chatHistory.create({
        data: {
          role: CHAT_ROLE.assistant,
          parts: (data.content as any) || [],
          videoId,
          userId: session.user.id,
        },
      });
    });

    const response = result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
    });

    return response;
  } catch (error) {
    console.error("Error creating chat message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
