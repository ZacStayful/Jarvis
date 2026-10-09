import { NextRequest, NextResponse } from "next/server";

// Routes hit from leads' browsers (presentation and pre-qualifier pages). A
// secret in page JavaScript would be public, so these stay open; each route
// validates its own input instead (lib/public-lead-input.ts).
const PUBLIC_LEAD_ROUTES = ["/api/qualifier", "/api/presentation", "/api/tracking"];

// Server-to-server routes that can't carry a login cookie: Twilio
// (/api/whatsapp), Calendly, Retell/Lucy functions and webhooks, n8n,
// Resend (email tracking) and AssemblyAI (transcription callbacks).
// Locked with JARVIS_API_SECRET once it is set — callers send it as the
// x-jarvis-secret header, "Authorization: Bearer <secret>", or ?key=<secret>
// on the URL (for webhook URLs configured in a provider's dashboard).
// Until it is set these stay open, so callers can be updated first; see
// SETUP-STATUS.md. A logged-in JARVIS session also passes (/test/whatsapp).
const SERVICE_ROUTES = [
  "/api/whatsapp",
  "/api/calendly",
  "/api/retell",
  "/api/monday",
  "/api/email",
  "/api/lucy/voice",
];

// Routes that authenticate every request themselves, so they skip the
// login check: the weekly-intelligence cron (Vercel sends
// "Authorization: Bearer <CRON_SECRET>") and the approve/reject links in its
// review email (HMAC-signed with REVIEW_SECRET, opened from Zac's inbox).
const SELF_AUTHENTICATED_ROUTES = ["/api/cron", "/api/intelligence"];

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function hasSession(request: NextRequest): boolean {
  const authToken = request.cookies.get("jarvis_auth");
  return !!authToken && !!process.env.SESSION_SECRET && authToken.value === process.env.SESSION_SECRET;
}

// Constant-time comparison (the edge runtime has no crypto.timingSafeEqual).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function presentsSecret(request: NextRequest, secret: string): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const candidates = [
    request.headers.get("x-jarvis-secret"),
    authorization.startsWith("Bearer ") ? authorization.slice(7) : null,
    request.nextUrl.searchParams.get("key"),
  ];
  return candidates.some((c) => c !== null && safeEqual(c, secret));
}

let warnedSecretUnset = false;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API
  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  if (startsWithAny(pathname, PUBLIC_LEAD_ROUTES) || startsWithAny(pathname, SELF_AUTHENTICATED_ROUTES)) {
    return NextResponse.next();
  }

  if (startsWithAny(pathname, SERVICE_ROUTES)) {
    const secret = process.env.JARVIS_API_SECRET;
    if (!secret) {
      if (!warnedSecretUnset) {
        warnedSecretUnset = true;
        console.warn("[middleware] JARVIS_API_SECRET is not set — service routes are unauthenticated");
      }
      return NextResponse.next();
    }
    if (hasSession(request) || presentsSecret(request, secret)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check auth cookie
  if (!hasSession(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
