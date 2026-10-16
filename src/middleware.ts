import { NextResponse, type NextRequest } from "next/server";

import { canAccess, normalizeRole, resolveHomeRoute } from "@/constants/roles";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";

/** Old addresses that live on elsewhere; bookmarks and 3.0 notifications still open. */
const MOVED: Record<string, string> = {
  "/dashboard/breaks/approvals": "/dashboard/approvals",
};

function toLogin(req: NextRequest): NextResponse {
  const { pathname, search } = req.nextUrl;
  const loginUrl = new URL("/auth/login", req.url);
  loginUrl.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return toLogin(req);

  const role = normalizeRole(session.user?.role);
  if (!role) {
    // A role this app no longer knows (a cookie from before ADMIN was folded into
    // MANAGER, say). Every route would refuse it, and sending it "home" would
    // bounce forever, so drop the stale cookie and ask for a fresh sign-in.
    const res = toLogin(req);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const home = resolveHomeRoute(role);

  // 3.1 moved break approvals into /dashboard/approvals (breaks and meetings).
  const moved = MOVED[pathname.replace(/\/$/, "")];
  if (moved) {
    const url = req.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url);
  }

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
