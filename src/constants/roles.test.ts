import {
  ALL_GRANTS,
  NO_GRANTS,
  ROLE_LABEL,
  STAFF_REFUSED_ROUTE,
  canAccess,
  effectiveGrants,
  hasAnyGrant,
  isApprover,
  isOrgAdmin,
  isOrgFreeRoute,
  isPortalRole,
  normalizeRole,
  resolveHomeRoute,
  roleLabel,
  viewerGrants,
  type Role,
} from "./roles";

describe("normalizeRole", () => {
  it.each([
    ["SUPER_ADMIN", "SUPER_ADMIN"],
    ["super admin", "SUPER_ADMIN"],
    ["super-admin", "SUPER_ADMIN"],
    ["ADMIN", "ADMIN"],
    ["admin", "ADMIN"],
    [" Manager ", "MANAGER"],
    ["user", "USER"],
    ["staff", "USER"],
  ])("reads %p as %p", (raw, expected) => {
    expect(normalizeRole(raw)).toBe(expected);
  });

  it.each(["OWNER", "AUDITOR", "", null, undefined])("refuses %p", (raw) => {
    expect(normalizeRole(raw)).toBeNull();
  });
});

describe("labels", () => {
  it("names the four roles, and calls USER Staff everywhere", () => {
    expect(ROLE_LABEL).toEqual({
      SUPER_ADMIN: "Super Admin",
      ADMIN: "Admin",
      MANAGER: "Manager",
      USER: "Staff",
    });
    expect(roleLabel("USER")).toBe("Staff");
    expect(roleLabel("admin")).toBe("Admin");
  });

  it("shows an unknown role as it came, never blank", () => {
    expect(roleLabel("AUDITOR")).toBe("AUDITOR");
    expect(roleLabel(undefined)).toBe("Unknown");
  });
});

describe("resolveHomeRoute", () => {
  it.each([
    ["SUPER_ADMIN", "/dashboard/overview"],
    ["ADMIN", "/dashboard/overview"],
    ["MANAGER", "/dashboard/overview"],
    ["USER", STAFF_REFUSED_ROUTE],
    [undefined, "/auth/login"],
  ])("%p starts on %p", (role, home) => {
    expect(resolveHomeRoute(role)).toBe(home);
  });

  it("refuses Staff with the app message", () => {
    expect(STAFF_REFUSED_ROUTE).toBe("/auth/login?reason=staff");
  });
});

describe("role groups", () => {
  it("lets every role but Staff into the portal", () => {
    expect(isPortalRole("SUPER_ADMIN")).toBe(true);
    expect(isPortalRole("ADMIN")).toBe(true);
    expect(isPortalRole("MANAGER")).toBe(true);
    expect(isPortalRole("USER")).toBe(false);
    expect(isPortalRole(null)).toBe(false);
  });

  it("treats Super Admin and Admin as the organisation's admins", () => {
    expect(isOrgAdmin("SUPER_ADMIN")).toBe(true);
    expect(isOrgAdmin("ADMIN")).toBe(true);
    expect(isOrgAdmin("MANAGER")).toBe(false);
    expect(isOrgAdmin("USER")).toBe(false);
  });

  it("makes Super Admin, Admin and Manager approvers", () => {
    expect(isApprover("SUPER_ADMIN")).toBe(true);
    expect(isApprover("ADMIN")).toBe(true);
    expect(isApprover("MANAGER")).toBe(true);
    expect(isApprover("USER")).toBe(false);
    expect(isApprover(null)).toBe(false);
  });
});

describe("grants", () => {
  it("knows whether a manager has any grant", () => {
    expect(hasAnyGrant(NO_GRANTS)).toBe(false);
    expect(hasAnyGrant({ ...NO_GRANTS, timeline: true })).toBe(true);
    expect(hasAnyGrant(null)).toBe(false);
  });

  it("gives admins every section and a manager exactly their grants", () => {
    expect(effectiveGrants("ADMIN", NO_GRANTS)).toEqual(ALL_GRANTS);
    expect(effectiveGrants("SUPER_ADMIN")).toEqual(ALL_GRANTS);
    expect(
      effectiveGrants("MANAGER", { screenshots: true, timeline: false, activity: false }),
    ).toEqual({
      screenshots: true,
      timeline: false,
      activity: false,
    });
    expect(effectiveGrants("MANAGER")).toEqual(NO_GRANTS);
    expect(effectiveGrants("USER", ALL_GRANTS)).toEqual(NO_GRANTS);
  });
});

describe("viewerGrants (GET /me permissions)", () => {
  const perms = (screenshots: boolean, timeline: boolean, activity: boolean) => ({
    canSeeScreenshots: screenshots,
    canSeeTimeline: timeline,
    canSeeActivity: activity,
  });

  it("follows the server's permissions for a Manager over the grants it sent", () => {
    expect(
      viewerGrants("MANAGER", { grants: ALL_GRANTS, permissions: perms(false, true, false) }),
    ).toEqual({
      screenshots: false,
      timeline: true,
      activity: false,
    });
    expect(
      viewerGrants("MANAGER", { grants: NO_GRANTS, permissions: perms(false, false, true) }),
    ).toEqual({
      screenshots: false,
      timeline: false,
      activity: true,
    });
  });

  it("falls back to the grants without permissions (an older API)", () => {
    const grants = { screenshots: true, timeline: false, activity: false };
    expect(viewerGrants("MANAGER", { grants, permissions: null })).toEqual(grants);
    expect(viewerGrants("MANAGER", null)).toEqual(NO_GRANTS);
  });

  it("gives Admins everything and Staff nothing, whatever /me says", () => {
    expect(
      viewerGrants("ADMIN", { grants: NO_GRANTS, permissions: perms(false, false, false) }),
    ).toEqual(ALL_GRANTS);
    expect(viewerGrants("SUPER_ADMIN", null)).toEqual(ALL_GRANTS);
    expect(
      viewerGrants("USER", { grants: ALL_GRANTS, permissions: perms(true, true, true) }),
    ).toEqual(NO_GRANTS);
  });
});

/** SPEC 1.2 and 7.1: who may open which page. M+ is a manager with a grant, M- one without. */
describe("canAccess (route guard)", () => {
  type Row = Record<Role | "MANAGER_NO_GRANTS", boolean>;
  const yes = (sa = true, admin = true, mgr = true, mgrNo = mgr, staff = false): Row => ({
    SUPER_ADMIN: sa,
    ADMIN: admin,
    MANAGER: mgr,
    MANAGER_NO_GRANTS: mgrNo,
    USER: staff,
  });
  const ADMINS = yes(true, true, false, false);
  const SA_ONLY = yes(true, false, false, false);

  const matrix: [string, Row][] = [
    ["/dashboard/organisations", SA_ONLY],
    ["/dashboard/overview", yes()],
    ["/dashboard/team", yes(true, true, true, false)],
    ["/dashboard/team/u-1", yes(true, true, true, false)],
    ["/dashboard/people", ADMINS],
    ["/dashboard/departments", ADMINS],
    ["/dashboard/approvals", yes()],
    ["/dashboard/breaks/team", yes()],
    ["/dashboard/reports", yes()],
    ["/dashboard/reports/person/u-1", yes()],
    ["/dashboard/shifts", ADMINS],
    ["/dashboard/shifts/new", ADMINS],
    ["/dashboard/shifts/assign", ADMINS],
    ["/dashboard/calendar", yes()],
    ["/dashboard/tracking", ADMINS],
    ["/dashboard/signout-keys", ADMINS],
    ["/dashboard/settings", ADMINS],
    ["/dashboard/chat", yes()],
    ["/dashboard/instructions", yes()],
  ];

  it.each(matrix)("%s", (path, expected) => {
    const withGrant = { grants: { ...NO_GRANTS, screenshots: true } };
    const without = { grants: NO_GRANTS };
    expect({
      SUPER_ADMIN: canAccess("SUPER_ADMIN", path),
      ADMIN: canAccess("ADMIN", path),
      MANAGER: canAccess("MANAGER", path, withGrant),
      MANAGER_NO_GRANTS: canAccess("MANAGER", path, without),
      USER: canAccess("USER", path),
    }).toEqual(expected);
  });

  it("matches whole path segments, not prefixes of words", () => {
    expect(canAccess("MANAGER", "/dashboard/peopleXYZ")).toBe(true);
    expect(canAccess("MANAGER", "/dashboard/people")).toBe(false);
  });

  it("lets the page decide when a manager's grants are not known yet", () => {
    expect(canAccess("MANAGER", "/dashboard/team")).toBe(true);
    expect(canAccess("MANAGER", "/dashboard/team", { grants: null })).toBe(false);
  });

  it("refuses everything without a role, and Staff everywhere", () => {
    expect(canAccess(null, "/dashboard/overview")).toBe(false);
    expect(canAccess("USER", "/dashboard/chat")).toBe(false);
    expect(canAccess("USER", "/dashboard/anything")).toBe(false);
  });

  it("lets portal roles reach pages with no rule", () => {
    expect(canAccess("MANAGER", "/dashboard/unknown-page")).toBe(true);
  });
});

describe("isOrgFreeRoute", () => {
  it("names the pages a Super Admin can use without an organisation", () => {
    expect(isOrgFreeRoute("/dashboard/organisations")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/overview")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/instructions")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/team")).toBe(false);
    expect(isOrgFreeRoute("/dashboard/people")).toBe(false);
    expect(isOrgFreeRoute("/dashboard/calendar")).toBe(false);
  });
});
