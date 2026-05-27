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

  // Allow voice-pipeline routes hit by Retell, Resend, AssemblyAI, and the
  // pre-qualifier/presentation pages. None of them carry a session cookie.
  if (
    pathname.startsWith("/api/retell") ||
    pathname.startsWith("/api/monday") ||
    pathname.startsWith("/api/email") ||
    pathname.startsWith("/api/qualifier") ||
    pathname.startsWith("/api/presentation") ||
    pathname.startsWith("/api/tracking") ||
    pathname.startsWith("/api/lucy/voice") ||
    pathname.startsWith("/api/profile-context")
  ) {
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
