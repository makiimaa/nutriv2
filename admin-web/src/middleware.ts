/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

const COOKIE = process.env.COOKIE_NAME ?? "admin_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;

  const isAdminArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/schools") ||
    pathname.startsWith("/classes") ||
    pathname.startsWith("/teachers") ||
    pathname.startsWith("/parents") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/food-items") ||
    pathname.startsWith("/menus") ||
    pathname.startsWith("/stats");

  if (!isAdminArea) return NextResponse.next();

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    const payload: any = decodeJwt(token);
    if (!payload?.role || payload.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/schools/:path*",
    "/classes/:path*",
    "/teachers/:path*",
    "/parents/:path*",
    "/students/:path*",
    "/food-items/:path*",
    "/menus/:path*",
    "/stats/:path*",
  ],
};
