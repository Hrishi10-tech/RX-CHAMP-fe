import { canAccess, normalizeRole, resolveHomeRoute } from "@/constants/roles";
import { safeInternalPath } from "@/lib/nav/returnTo";

export const LOGIN_ROUTE = "/auth/login";
export const REDIRECT_PARAM = "redirect";

/** The pathname of an internal path, without its query or hash. */
function pathnameOf(path: string): string {
  return new URL(path, "https://rx-vision.invalid").pathname;
}

/**
 * A dashboard page to come back to after signing in: an internal path (same
 * rules as the back links, so never another site) under /dashboard. Anything
 * else, the sign-in page itself included, is null.
 */
function dashboardPath(value: string | null | undefined): string | null {
  const path = safeInternalPath(value);
  if (!path) return null;
  const pathname = pathnameOf(path);
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") ? path : null;
}

/**
 * The sign-in page, remembering the page the person was on, so signing in
 * again brings them back to it: `/auth/login?redirect=%2Fdashboard%2Fapprovals`.
 */
export function loginHref(from?: string | null): string {
  const path = dashboardPath(from);
  return path ? `${LOGIN_ROUTE}?${REDIRECT_PARAM}=${encodeURIComponent(path)}` : LOGIN_ROUTE;
}

/**
 * Where to go once signed in: the `?redirect=` page when it is a dashboard
 * page this role may open, else the role's home.
 */
export function afterLoginPath(redirect: string | null | undefined, role?: string | null): string {
  const home = resolveHomeRoute(role);
  const path = dashboardPath(redirect);
  if (!path) return home;
  return canAccess(normalizeRole(role), pathnameOf(path)) ? path : home;
}
