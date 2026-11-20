import { NextResponse, type NextRequest } from "next/server";

import { STAFF_REFUSED_ROUTE, canAccess, normalizeRole, resolveHomeRoute } from "@/constants/roles";
import { SESSION_COOKIE, decodeSession } from "@/lib/auth/session";
import { contentSecurityPolicy, newNonce } from "@/lib/security/csp";

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

/**
 * Review S-4: every page answers with a Content-Security-Policy carrying a fresh nonce, which the
 * framework reads from the request header and stamps on its own scripts. CSP_REPORT_ONLY=true
 * sends it as a report-only header instead (to try a change without blocking anything).
 */
function withCsp(req: NextRequest, respond: (headers: Headers) => NextResponse): NextResponse {
  const nonce = newNonce();
  const csp = contentSecurityPolicy(nonce, {
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
    dev: process.env.NODE_ENV !== "production",
  });
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const res = respond(headers);
  res.headers.set(
    process.env.CSP_REPORT_ONLY === "true"
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy",
    csp,
  );
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Pages outside the dashboard (sign-in, the error pages) need no session: the policy only.
  if (!pathname.startsWith("/dashboard")) {
    return withCsp(req, (headers) => NextResponse.next({ request: { headers } }));
  }

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

  return withCsp(req, (headers) => NextResponse.next({ request: { headers } }));
}

export const config = {
  // Every page; never the API proxy, the framework's own files or pictures.
  // Prefetches too: a prefetch of /dashboard must get the same redirect as a visit to it.
  matcher: ["/((?!api/|socket.io|_next/static|_next/image|brand/|fonts/|icon.svg|favicon.ico).*)"],
};
