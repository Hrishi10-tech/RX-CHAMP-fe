export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  USER: "USER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ROLE_VALUES = Object.values(ROLES) as Role[];

export function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  const upper = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return ROLE_VALUES.includes(upper as Role) ? (upper as Role) : null;
}

export const roleHomeRoute: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard/admin",
  ADMIN: "/dashboard/admin",
  MANAGER: "/dashboard/manager",
  USER: "/dashboard/me",
};

export const DEFAULT_HOME_ROUTE = "/dashboard/me";

export function resolveHomeRoute(role?: string | null): string {
  const normalized = normalizeRole(role);
  return normalized ? roleHomeRoute[normalized] : DEFAULT_HOME_ROUTE;
}

export const routeRoles: Record<string, Role[]> = {
  "/dashboard/admin": ["SUPER_ADMIN", "ADMIN"],
  "/dashboard/manager": ["MANAGER"],
  "/dashboard/manager/activity": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "/dashboard/me": ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER"],
  "/dashboard/chat": ["SUPER_ADMIN", "ADMIN", "MANAGER", "USER"],
};

export function canAccess(role: Role | null, path: string): boolean {
  if (!role) return false;
  const match = Object.keys(routeRoles)
    .filter((p) => path === p || path.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true;
  return routeRoles[match].includes(role);
}
