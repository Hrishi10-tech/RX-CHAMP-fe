import { NextResponse, type NextRequest } from "next/server";

import { STAFF_REFUSED_ROUTE, canAccess, normalizeRole, resolveHomeRoute } from "@/constants/roles";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";

/**
 * Old addresses that live on elsewhere, so bookmarks and older notifications
 * still open something useful (SPEC 7.1).
 */
export const MOVED: Record<string, string> = {
  "/dashboard/breaks/approvals": "/dashboard/approvals",
  "/dashboard/team-today": "/dashboard/team",
  "/dashboard/me": "/dashboard/overview",
  "/dashboard/admin": "/dashboard/overview",
  "/dashboard/manager": "/dashboard/overview",
  "/dashboard/admin/team-management": "/dashboard/people",
  "/dashboard/admin/team-management/user": "/dashboard/people",
  "/dashboard/admin/team-management/organization": "/dashboard/organisations",
  "/dashboard/admin/team-management/company": "/dashboard/organisations",
};

/** Prefix moves that keep the rest of the path (a person's id). */
const MOVED_PREFIX: [string, string][] = [
  ["/dashboard/manager/activity/", "/dashboard/team/"],
  ["/dashboard/admin/team-management/organization/", "/dashboard/organisations"],
];

/** Where an old address lives now, or null when it has not moved. */
export function movedTo(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "");
  if (MOVED[path]) return MOVED[path];
  for (const [from, to] of MOVED_PREFIX) {
    if (path.startsWith(from)) {
      return to.endsWith("/") ? `${to}${path.slice(from.length).split("/")[0]}` : to;
    }
  }
  return null;
}

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
    // A role this app does not know. Every route would refuse it, and sending it
    // "home" would bounce forever, so drop the cookie and ask for a fresh sign-in.
    const res = toLogin(req);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (role === "USER") {
    // Staff use the agent (SPEC 1.1): the sign-in page says so.
    const res = NextResponse.redirect(new URL(STAFF_REFUSED_ROUTE, req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const moved = movedTo(pathname);
  if (moved) {
    const url = req.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url);
  }

  const home = resolveHomeRoute(role);

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!canAccess(role, pathname, { grants: session.user?.grants })) {
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
