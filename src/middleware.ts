import { NextResponse, type NextRequest } from "next/server";

import { canAccess, normalizeRole, resolveHomeRoute } from "@/constants/roles";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  const role = normalizeRole(session?.user?.role);

  if (!session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const home = resolveHomeRoute(session.user?.role);

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
