import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    if (password !== process.env.JARVIS_PASSWORD) {
      // Deliberate delay to prevent brute force
      await new Promise((r) => setTimeout(r, 1000));
      return NextResponse.json({ error: "Access denied." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    // Set auth cookie — httpOnly, secure, 7 day expiry
    response.cookies.set("jarvis_auth", process.env.SESSION_SECRET!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("jarvis_auth");
  return response;
}
