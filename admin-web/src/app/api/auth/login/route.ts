/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const be = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await be.text();
    if (!be.ok) {
      return new NextResponse(text || "Login failed", { status: be.status });
    }

    const data = JSON.parse(text);
    const token = data?.access_token ?? data?.token;
    if (!token) {
      return NextResponse.json(
        { message: "No token in backend response" },
        { status: 502 }
      );
    }

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set(process.env.COOKIE_NAME ?? "admin_token", token, {
      httpOnly: true,
      secure: isProd || process.env.COOKIE_SECURE === "true",
      sameSite: (process.env.COOKIE_SAMESITE as any) ?? "lax",
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (e: any) {
    console.error("LOGIN_PROXY_ERROR:", e?.stack || e?.message || e);
    return NextResponse.json(
      { message: "Proxy error", detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}
