import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, verification-secret-key",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function POST(req: Request) {
  try {
    const verificationSecretKey =
      req.headers.get("verification-secret-key") || "";
    const origin = req.headers.get("origin");
    if (!verificationSecretKey) {
      return NextResponse.json(
        { error: "Verification secret key is required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, verification-secret-key",
            "Access-Control-Allow-Credentials": "true",
          },
        },
      );
    }
    if (verificationSecretKey !== process.env.VERIFICATION_SECRET_KEY) {
      return NextResponse.json(
        { error: "Invalid verification secret key" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, verification-secret-key",
            "Access-Control-Allow-Credentials": "true",
          },
        },
      );
    }
    const value = nanoid();
    const verification = await prisma.verificationCode.create({
      data: {
        id: nanoid(),
        code: value,
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      },
    });
    return NextResponse.json(
      {
        redirectUrl:
          process.env.NEXT_PUBLIC_BASE_URL +
          `/electron/verify?value=${verification.code}`,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, verification-secret-key",
          "Access-Control-Allow-Credentials": "true",
        },
      },
    );
  } catch (error) {
    const origin = req.headers.get("origin");
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, verification-secret-key",
          "Access-Control-Allow-Credentials": "true",
        },
      },
    );
  }
}
