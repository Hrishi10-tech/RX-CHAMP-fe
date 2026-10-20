/**
 * The four 4.0 roles (SPEC 1.1), the same as the backend:
 *   SUPER_ADMIN  the platform; acts inside one organisation by selecting it
 *   ADMIN        exactly one organisation
 *   MANAGER      one organisation, one or more departments (read-only on people)
 *   USER         Staff: the agent only, never the portal
 *
 * The cookie role is only used for the middleware's coarse redirect. The pages
 * read the role, the organisation and the manager's grants from GET /me.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  USER: "USER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ROLE_VALUES = Object.values(ROLES) as Role[];

/** What people see. USER is "Staff" everywhere in the UI. */
export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  USER: "Staff",
};

/** A manager's view grants (SPEC 2.2), set by the org Admin. */
export interface Grants {
  screenshots: boolean;
  timeline: boolean;
  activity: boolean;
}

export const NO_GRANTS: Grants = { screenshots: false, timeline: false, activity: false };
export const ALL_GRANTS: Grants = { screenshots: true, timeline: true, activity: true };

export function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  const upper = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (upper === "STAFF") return "USER";
  return ROLE_VALUES.includes(upper as Role) ? (upper as Role) : null;
}

/** Label for a role string from the API; unknown values are shown as they came. */
export function roleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized) return ROLE_LABEL[normalized];
  return role?.trim() || "Unknown";
}

/** Staff are refused by the portal; this page explains it (SPEC 1.1). */
export const STAFF_REFUSED_ROUTE = "/auth/login?reason=staff";

export const OVERVIEW_ROUTE = "/dashboard/overview";

export const roleHomeRoute: Record<Role, string> = {
  SUPER_ADMIN: OVERVIEW_ROUTE,
  ADMIN: OVERVIEW_ROUTE,
  MANAGER: OVERVIEW_ROUTE,
  USER: STAFF_REFUSED_ROUTE,
};

export const DEFAULT_HOME_ROUTE = "/auth/login";

export function resolveHomeRoute(role?: string | null): string {
  const normalized = normalizeRole(role);
  return normalized ? roleHomeRoute[normalized] : DEFAULT_HOME_ROUTE;
}

/** True for the roles that may use the portal at all. */
export function isPortalRole(role: Role | null | undefined): role is Exclude<Role, "USER"> {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

/** Super Admin or the organisation's Admin: everything inside the organisation. */
export function isOrgAdmin(role: Role | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

/** Who decides approvals and watches team breaks (SPEC 1.2). */
export function isApprover(role: Role | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER";
}

export function hasAnyGrant(grants: Grants | null | undefined): boolean {
  return Boolean(grants && (grants.screenshots || grants.timeline || grants.activity));
}

/**
 * What one viewer may see on a person's productivity dashboard. Admins and Super
 * Admins see everything; a manager exactly their grants.
 */
export function effectiveGrants(role: Role | null | undefined, grants?: Grants | null): Grants {
  if (isOrgAdmin(role)) return ALL_GRANTS;
  if (role === "MANAGER") return { ...NO_GRANTS, ...(grants ?? {}) };
  return NO_GRANTS;
}

/** The parts of `GET /me` → `permissions` that say which sections a viewer sees. */
export interface SectionPermissions {
  canSeeScreenshots: boolean;
  canSeeTimeline: boolean;
  canSeeActivity: boolean;
}

/**
 * The sections the signed-in person sees (SPEC 1.2). A Manager: what the server
 * says in `GET /me` → `permissions` (`canSeeTimeline`, `canSeeActivity`,
 * `canSeeScreenshots`), the same rule it redacts by, so a section it would answer
 * empty or zero is hidden instead; without `permissions` (an older API), their
 * grants. Admins and Super Admins see everything inside an organisation.
 */
export function viewerGrants(
  role: Role | null | undefined,
  me: { grants?: Grants | null; permissions?: SectionPermissions | null } | null | undefined,
): Grants {
  if (role === "MANAGER" && me?.permissions) {
    return {
      screenshots: me.permissions.canSeeScreenshots,
      timeline: me.permissions.canSeeTimeline,
      activity: me.permissions.canSeeActivity,
    };
  }
  return effectiveGrants(role, me?.grants);
}

const ADMINS: Role[] = ["SUPER_ADMIN", "ADMIN"];
const PORTAL: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

/**
 * Who may open which part of the dashboard (SPEC 7.1). The longest matching
 * prefix wins. Staff match nothing: they never use the portal. The backend
 * re-checks every request; this only keeps people off screens that would fail.
 */
export const routeRoles: Record<string, Role[]> = {
  "/dashboard/organisations": ["SUPER_ADMIN"],
  "/dashboard/overview": PORTAL,
  "/dashboard/team": PORTAL,
  "/dashboard/people": ADMINS,
  "/dashboard/departments": ADMINS,
  "/dashboard/approvals": PORTAL,
  "/dashboard/breaks": PORTAL,
  "/dashboard/reports": PORTAL,
  "/dashboard/shifts": ADMINS,
  "/dashboard/calendar": PORTAL,
  "/dashboard/tracking": ADMINS,
  "/dashboard/signout-keys": ADMINS,
  "/dashboard/settings": ADMINS,
  "/dashboard/chat": PORTAL,
  "/dashboard/instructions": PORTAL,
};

/**
 * Routes a manager reaches only with at least one view grant (the Team page and
 * the productivity dashboard behind it).
 */
export const GRANT_ROUTES = ["/dashboard/team"];

/** Pages that work without an organisation selected (Super Admin, SPEC 1.4). */
export const ORG_FREE_ROUTES = [
  "/dashboard/organisations",
  "/dashboard/overview",
  "/dashboard/chat",
  "/dashboard/instructions",
];

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isOrgFreeRoute(path: string): boolean {
  return ORG_FREE_ROUTES.some((p) => matches(path, p));
}

export interface AccessContext {
  /** The manager's grants; undefined when not known (the middleware's cookie may lack them). */
  grants?: Grants | null;
}

export function canAccess(role: Role | null, path: string, ctx: AccessContext = {}): boolean {
  if (!role || role === "USER") return false;
  const match = Object.keys(routeRoles)
    .filter((p) => matches(path, p))
    .sort((a, b) => b.length - a.length)[0];
  // A page with no rule is open to every portal role (it 404s if it does not exist).
  if (!match) return true;
  if (!routeRoles[match].includes(role)) return false;
  if (role === "MANAGER" && GRANT_ROUTES.some((p) => matches(path, p))) {
    // Unknown grants (an old cookie) let the page decide from GET /me.
    return ctx.grants === undefined ? true : hasAnyGrant(ctx.grants);
  }
  return true;
}
