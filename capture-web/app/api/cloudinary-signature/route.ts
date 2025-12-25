import { cloudinaryClient } from "@/config";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";



export async function GET(req: Request) { 
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" }
      );
    }
  
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "capture-screen-recordings";
    const signature = cloudinaryClient.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );
    return NextResponse.json(
      {
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY!,
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" }
    );
  }
}
