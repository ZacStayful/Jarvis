import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  // Allow WhatsApp webhook routes — Twilio must hit these unauthenticated.
  if (pathname.startsWith("/api/whatsapp")) {
    return NextResponse.next();
  }

  // Allow Calendly webhook routes — Calendly must hit these unauthenticated.
  if (pathname.startsWith("/api/calendly")) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authToken = request.cookies.get("jarvis_auth");

  if (!authToken || authToken.value !== process.env.SESSION_SECRET) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
