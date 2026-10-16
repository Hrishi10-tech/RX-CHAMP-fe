import {
  ROLE_LABEL,
  canAccess,
  isApprover,
  normalizeRole,
  resolveHomeRoute,
  roleLabel,
  type Role,
} from "./roles";

describe("normalizeRole", () => {
  it.each([
    ["SUPER_ADMIN", "SUPER_ADMIN"],
    ["super admin", "SUPER_ADMIN"],
    ["super-admin", "SUPER_ADMIN"],
    [" Manager ", "MANAGER"],
    ["user", "USER"],
  ])("reads %p as %p", (raw, expected) => {
    expect(normalizeRole(raw)).toBe(expected);
  });

  // ADMIN was folded into MANAGER server-side; a stale cookie must not be guessed into a role.
  it.each(["ADMIN", "admin", "OWNER", "", null, undefined])("refuses %p", (raw) => {
    expect(normalizeRole(raw)).toBeNull();
  });
});

describe("labels", () => {
  it("calls USER Staff everywhere", () => {
    expect(ROLE_LABEL).toEqual({ SUPER_ADMIN: "Super Admin", MANAGER: "Manager", USER: "Staff" });
    expect(roleLabel("USER")).toBe("Staff");
    expect(roleLabel("super_admin")).toBe("Super Admin");
  });

  it("shows an unknown role as it came, never blank", () => {
    expect(roleLabel("AUDITOR")).toBe("AUDITOR");
    expect(roleLabel(undefined)).toBe("Unknown");
  });
});

describe("resolveHomeRoute", () => {
  it.each([
    ["SUPER_ADMIN", "/dashboard/admin"],
    ["MANAGER", "/dashboard/manager"],
    ["USER", "/dashboard/me"],
    ["ADMIN", "/dashboard/me"],
    [undefined, "/dashboard/me"],
  ])("%p starts on %p", (role, home) => {
    expect(resolveHomeRoute(role)).toBe(home);
  });
});

describe("canAccess", () => {
  const matrix: [string, Record<Role, boolean>][] = [
    ["/dashboard/admin", { SUPER_ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/admin/team-management", { SUPER_ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/admin/team-management/user", { SUPER_ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/manager", { SUPER_ADMIN: false, MANAGER: true, USER: false }],
    ["/dashboard/manager/user", { SUPER_ADMIN: false, MANAGER: true, USER: false }],
    ["/dashboard/manager/activity/u-1", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/me", { SUPER_ADMIN: true, MANAGER: true, USER: true }],
    ["/dashboard/chat", { SUPER_ADMIN: true, MANAGER: true, USER: true }],
    ["/dashboard/shifts", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/shifts/new", { SUPER_ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/shifts/edit/abc", { SUPER_ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/shifts/assign", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/breaks/approvals", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/breaks/team", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
  ];

  it.each(matrix)("%s", (path, expected) => {
    for (const role of Object.keys(expected) as Role[]) {
      expect([role, canAccess(role, path)]).toEqual([role, expected[role]]);
    }
  });

  it("matches whole path segments, not prefixes of words", () => {
    // "/dashboard/shiftsXYZ" is not under "/dashboard/shifts".
    expect(canAccess("USER", "/dashboard/shiftsXYZ")).toBe(true);
    expect(canAccess("USER", "/dashboard/shifts")).toBe(false);
  });

  it("refuses everything without a role", () => {
    expect(canAccess(null, "/dashboard/me")).toBe(false);
    expect(canAccess(null, "/dashboard/anything")).toBe(false);
  });

  it("lets anyone signed in reach pages with no rule", () => {
    expect(canAccess("USER", "/dashboard/unknown-page")).toBe(true);
  });
});

describe("isApprover", () => {
  it("is Managers and Super Admins only", () => {
    expect(isApprover("SUPER_ADMIN")).toBe(true);
    expect(isApprover("MANAGER")).toBe(true);
    expect(isApprover("USER")).toBe(false);
    expect(isApprover(null)).toBe(false);
  });
});
