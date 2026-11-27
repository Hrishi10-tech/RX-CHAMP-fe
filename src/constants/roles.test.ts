import {
  ALL_GRANTS,
  NO_GRANTS,
  ROLE_LABEL,
  STAFF_REFUSED_ROUTE,
  TODAY_ROUTE,
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
  seesEveryOrg,
  viewerGrants,
  type Role,
} from "./roles";

describe("normalizeRole", () => {
  it.each([
    ["SUPER_ADMIN", "SUPER_ADMIN"],
    ["super admin", "SUPER_ADMIN"],
    ["super-admin", "SUPER_ADMIN"],
    ["SUPER_MANAGER", "SUPER_MANAGER"],
    ["super manager", "SUPER_MANAGER"],
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
  it("names the five roles (3.3 adds the Super Manager), and calls USER Staff everywhere", () => {
    expect(ROLE_LABEL).toEqual({
      SUPER_ADMIN: "Super Admin",
      SUPER_MANAGER: "Super Manager",
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
    ["SUPER_MANAGER", "/dashboard/overview"],
    ["ADMIN", "/dashboard/overview"],
    ["MANAGER", "/dashboard/overview"],
    // 4.1: Staff start on their own Today.
    ["USER", "/dashboard/today"],
    [undefined, "/auth/login"],
  ])("%p starts on %p", (role, home) => {
    expect(resolveHomeRoute(role)).toBe(home);
  });

  it("keeps the app message for an account the server turns away", () => {
    expect(STAFF_REFUSED_ROUTE).toBe("/auth/login?reason=staff");
    expect(TODAY_ROUTE).toBe("/dashboard/today");
  });
});

describe("role groups", () => {
  it("lets every role but Staff into the portal", () => {
    expect(isPortalRole("SUPER_ADMIN")).toBe(true);
    expect(isPortalRole("SUPER_MANAGER")).toBe(true);
    expect(isPortalRole("ADMIN")).toBe(true);
    expect(isPortalRole("MANAGER")).toBe(true);
    expect(isPortalRole("USER")).toBe(false);
    expect(isPortalRole(null)).toBe(false);
  });

  it("treats Super Admin and Admin as the organisation's admins", () => {
    expect(isOrgAdmin("SUPER_ADMIN")).toBe(true);
    expect(isOrgAdmin("ADMIN")).toBe(true);
    // 3.3: the Super Manager administers nothing.
    expect(isOrgAdmin("SUPER_MANAGER")).toBe(false);
    expect(isOrgAdmin("MANAGER")).toBe(false);
    expect(isOrgAdmin("USER")).toBe(false);
  });

  it("makes Super Admin, Super Manager, Admin and Manager approvers", () => {
    expect(isApprover("SUPER_ADMIN")).toBe(true);
    expect(isApprover("SUPER_MANAGER")).toBe(true);
    expect(isApprover("ADMIN")).toBe(true);
    expect(isApprover("MANAGER")).toBe(true);
    expect(isApprover("USER")).toBe(false);
    expect(isApprover(null)).toBe(false);
  });

  it("lets the Super Admin and the Super Manager see every organisation", () => {
    expect(seesEveryOrg("SUPER_ADMIN")).toBe(true);
    expect(seesEveryOrg("SUPER_MANAGER")).toBe(true);
    expect(seesEveryOrg("ADMIN")).toBe(false);
    expect(seesEveryOrg("MANAGER")).toBe(false);
    expect(seesEveryOrg(null)).toBe(false);
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
    expect(effectiveGrants("SUPER_MANAGER", NO_GRANTS)).toEqual(ALL_GRANTS);
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
  // The Super Manager (3.3) goes where a Manager with grants goes, unless stated.
  const yes = (sa = true, admin = true, mgr = true, mgrNo = mgr, staff = false, sm = mgr): Row => ({
    SUPER_ADMIN: sa,
    SUPER_MANAGER: sm,
    ADMIN: admin,
    MANAGER: mgr,
    MANAGER_NO_GRANTS: mgrNo,
    USER: staff,
  });
  const ADMINS = yes(true, true, false, false);
  const SA_ONLY = yes(true, false, false, false);
  /** Admins and the Super Manager, never a Manager. */
  const OVERSEERS = yes(true, true, false, false, false, true);

  const matrix: [string, Row][] = [
    ["/dashboard/organisations", SA_ONLY],
    ["/dashboard/overview", yes()],
    ["/dashboard/team", yes(true, true, true, false)],
    ["/dashboard/team/u-1", yes(true, true, true, false)],
    ["/dashboard/people", OVERSEERS],
    ["/dashboard/departments", ADMINS],
    ["/dashboard/approvals", yes()],
    ["/dashboard/breaks/team", yes()],
    ["/dashboard/reports", yes()],
    ["/dashboard/reports/person/u-1", yes()],
    ["/dashboard/shifts", OVERSEERS],
    ["/dashboard/shifts/new", ADMINS],
    ["/dashboard/shifts/edit/s-1", ADMINS],
    ["/dashboard/shifts/assign", OVERSEERS],
    ["/dashboard/calendar", yes()],
    ["/dashboard/tracking", ADMINS],
    ["/dashboard/signout-keys", ADMINS],
    ["/dashboard/settings", ADMINS],
    // 3.6: a wider child of the admins' Settings: your own profile and avatar, every portal role.
    // 4.1: Staff too.
    ["/dashboard/settings/profile", yes(true, true, true, true, true, true)],
    ["/dashboard/settings/profile/avatar", yes(true, true, true, true, true, true)],
    ["/dashboard/chat", yes(true, true, true, true, true)],
    // 4.1: Staff see only their own leave and work from home there (the page decides).
    ["/dashboard/leave", yes(true, true, true, true, true)],
    ["/dashboard/wfh", yes(true, true, true, true, true)],
    // 4.1: Staff's own pages, theirs alone.
    ["/dashboard/today", yes(false, false, false, false, true, false)],
    ["/dashboard/history", yes(false, false, false, false, true, false)],
    ["/dashboard/my-calendar", yes(false, false, false, false, true, false)],
    ["/dashboard/attendance", OVERSEERS],
    ["/dashboard/instructions", yes()],
    ["/dashboard/screenshots/archives", ADMINS],
  ];

  it.each(matrix)("%s", (path, expected) => {
    const withGrant = { grants: { ...NO_GRANTS, screenshots: true } };
    const without = { grants: NO_GRANTS };
    expect({
      SUPER_ADMIN: canAccess("SUPER_ADMIN", path),
      SUPER_MANAGER: canAccess("SUPER_MANAGER", path),
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

  it("refuses everything without a role", () => {
    expect(canAccess(null, "/dashboard/overview")).toBe(false);
    expect(canAccess(null, "/dashboard/today")).toBe(false);
  });

  it("keeps Staff to their own pages: never a page with no rule, never anyone else's", () => {
    for (const path of [
      "/dashboard/anything",
      "/dashboard/unknown-page",
      "/dashboard/overview",
      "/dashboard/people",
      "/dashboard/reports",
      "/dashboard/approvals",
      "/dashboard/breaks/team",
      "/dashboard/team/u-1",
      "/dashboard/screenshots/archives",
      "/dashboard/agent-health",
      "/dashboard/focus-adjustments",
      "/dashboard/instructions",
      "/dashboard/calendar",
      "/dashboard/settings",
    ]) {
      expect([path, canAccess("USER", path)]).toEqual([path, false]);
    }
  });

  it("lets portal roles reach pages with no rule", () => {
    expect(canAccess("MANAGER", "/dashboard/unknown-page")).toBe(true);
  });
});

describe("isOrgFreeRoute", () => {
  it("names the pages a Super Admin or Super Manager can use without an organisation", () => {
    expect(isOrgFreeRoute("/dashboard/organisations")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/overview")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/instructions")).toBe(true);
    // 3.3: People lists everyone in every organisation on the combined view.
    expect(isOrgFreeRoute("/dashboard/people")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/team")).toBe(false);
    expect(isOrgFreeRoute("/dashboard/calendar")).toBe(false);
    // 3.6: your own profile belongs to no organisation; the admins' Settings does.
    expect(isOrgFreeRoute("/dashboard/settings/profile/avatar")).toBe(true);
    expect(isOrgFreeRoute("/dashboard/settings")).toBe(false);
  });
});
