export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

async function forward(req: NextRequest, path: string) {
  const token = req.cookies.get(
    process.env.COOKIE_NAME ?? "admin_token"
  )?.value;
  const url = `${process.env.BACKEND_URL}${path}${req.nextUrl.search || ""}`;
  const r = await fetch(url, {
    method: req.method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  });
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return forward(req, `/parents/${id}`);
}
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return forward(req, `/parents/${id}`);
}
