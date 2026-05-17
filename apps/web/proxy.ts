import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Define the origin that is allowed to access the API (Desktop app)
  const allowedOrigin = "http://localhost:5173";
  const origin = request.headers.get("origin");

  // Only apply CORS for /api/token routes
  if (request.nextUrl.pathname.startsWith("/api/token")) {
    // Handle Preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      
      response.headers.set("Access-Control-Allow-Origin", origin || allowedOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set("Access-Control-Max-Age", "86400");
      
      return response;
    }

    // Handle regular requests
    const response = NextResponse.next();
    if (origin === allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    
    return response;
  }

  return NextResponse.next();
}

// Ensure middleware only runs for relevant paths
export const config = {
  matcher: "/api/token/:path*",
};
