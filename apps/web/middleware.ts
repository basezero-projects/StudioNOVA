import { NextRequest, NextResponse } from "next/server";

import { getUserIdFromRequest } from "@/lib/auth";
import { AUTH_DISABLED } from "@/lib/config";

const PUBLIC_APP_PATHS = ["/app/login", "/app/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  if (AUTH_DISABLED) {
    // Local dev mode: allow all /app routes without session checks.
    return NextResponse.next();
  }

  if (PUBLIC_APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const sessionUserId = await getUserIdFromRequest(request);

  if (!sessionUserId) {
    const loginUrl = new URL("/app/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};

