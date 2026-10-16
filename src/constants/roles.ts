/**
 * Three tiers, the same as the backend: Super Admin -> Manager -> Staff.
 *
 * The former ADMIN role was folded into MANAGER server-side, so it does not exist
 * here either. A stale session cookie that still says ADMIN normalizes to null and
 * is sent back to sign in, rather than being guessed into a role.
 */
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
  USER: "USER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ROLE_VALUES = Object.values(ROLES) as Role[];

/** What people see. USER is "Staff" everywhere in the UI. */
export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  USER: "Staff",
};

export function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  const upper = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return ROLE_VALUES.includes(upper as Role) ? (upper as Role) : null;
}

/** Label for a role string from the API; unknown values are shown as they came. */
export function roleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized) return ROLE_LABEL[normalized];
  return role?.trim() || "Unknown";
}

export const roleHomeRoute: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard/admin",
  MANAGER: "/dashboard/manager",
  USER: "/dashboard/me",
};

export const DEFAULT_HOME_ROUTE = "/dashboard/me";

export function resolveHomeRoute(role?: string | null): string {
  const normalized = normalizeRole(role);
  return normalized ? roleHomeRoute[normalized] : DEFAULT_HOME_ROUTE;
}

const EVERYONE: Role[] = ["SUPER_ADMIN", "MANAGER", "USER"];
const APPROVERS: Role[] = ["SUPER_ADMIN", "MANAGER"];

/**
 * Who may open which part of the dashboard. The longest matching prefix wins, so
 * a sub-route can be narrower than its parent (Managers read shifts, only a Super
 * Admin edits them). The backend re-checks every request; this only keeps people
 * off screens that would just fail for them.
 */
export const routeRoles: Record<string, Role[]> = {
  "/dashboard/admin": ["SUPER_ADMIN"],
  "/dashboard/manager": ["MANAGER"],
  "/dashboard/manager/activity": APPROVERS,
  "/dashboard/me": EVERYONE,
  "/dashboard/chat": EVERYONE,
  "/dashboard/shifts": APPROVERS,
  "/dashboard/shifts/new": ["SUPER_ADMIN"],
  "/dashboard/shifts/edit": ["SUPER_ADMIN"],
  "/dashboard/shifts/assign": APPROVERS,
  "/dashboard/breaks": APPROVERS,
  // 3.1
  "/dashboard/approvals": APPROVERS,
  "/dashboard/team-today": APPROVERS,
  "/dashboard/reports": APPROVERS,
  "/dashboard/settings": ["SUPER_ADMIN"],
};

export function canAccess(role: Role | null, path: string): boolean {
  if (!role) return false;
  const match = Object.keys(routeRoles)
    .filter((p) => path === p || path.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true;
  return routeRoles[match].includes(role);
}

/** Managers and Super Admins decide off-schedule breaks and watch team breaks. */
export function isApprover(role: Role | null): boolean {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}
