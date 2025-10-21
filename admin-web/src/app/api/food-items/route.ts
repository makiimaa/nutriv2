// src/app/api/food-items/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

async function forward(req: NextRequest, path: string) {
  const token = req.cookies.get(
    process.env.COOKIE_NAME ?? "admin_token"
  )?.value;
  const url = `${process.env.BACKEND_URL}${path}`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  };

  const r = await fetch(url, init);
  const text = await r.text();

  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest) {
  return forward(req, "/food-items");
}
export async function POST(req: NextRequest) {
  return forward(req, "/food-items");
}
