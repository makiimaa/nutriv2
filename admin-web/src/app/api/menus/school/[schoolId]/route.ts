export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await ctx.params;
  const token = req.cookies.get(
    process.env.COOKIE_NAME ?? "admin_token"
  )?.value;
  const r = await fetch(
    `${process.env.BACKEND_URL}/menus/school/${schoolId}${
      req.nextUrl.search || ""
    }`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  return new NextResponse(await r.text(), {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
