import { NO_GRANTS, canAccess } from "@/constants/roles";
import { NAV_SECTIONS, activeHrefFor, navFor } from "./nav";

function labels(...args: Parameters<typeof navFor>): string[] {
  return navFor(...args).flatMap((s) => s.items.map((i) => i.label));
}

/** SPEC 7.1: the sidebar and the phone menu per role. */
describe("navFor", () => {
  // 3.6 (D-87): Menu, People, Reports, Setup; the daily jobs first, Approvals third.
  it("gives the Super Admin inside an organisation everything", () => {
    expect(labels("SUPER_ADMIN", { hasOrg: true })).toEqual([
      "Overview",
      "Team",
      "Approvals",
      "Team breaks",
      "Leave",
      "Work from home",
      "Messages",
      "Team management",
      "Departments",
      "Reports",
      "Shifts",
      "Assign shifts",
      "Calendar",
      "Attendance",
      "Input tracking",
      "Organisations",
      "Sign-out keys",
      "Screenshot archive",
      "Settings",
      "Instructions",
      "Profile",
    ]);
    expect(navFor("SUPER_ADMIN", { hasOrg: true }).map((s) => s.heading)).toEqual([
      "Menu",
      "People",
      "Reports",
      "Setup",
    ]);
  });

  it("gives the Super Admin on All organisations only what works without one", () => {
    expect(labels("SUPER_ADMIN", { hasOrg: false })).toEqual([
      "Overview",
      // 3.3: combined approvals and team breaks, and Team management listing everyone
      // in every organisation (and the Super Managers).
      "Approvals",
      "Team breaks",
      "Leave",
      "Work from home",
      "Messages",
      "Team management",
      "Organisations",
      "Instructions",
      "Profile",
    ]);
  });

  it("gives an Admin everything but Organisations", () => {
    const items = labels("ADMIN");
    expect(items).not.toContain("Organisations");
    expect(items).toEqual(
      expect.arrayContaining([
        "Team management",
        "Departments",
        "Sign-out keys",
        "Settings",
        "Input tracking",
        "Team",
        "Screenshot archive",
      ]),
    );
  });

  it("shows a manager with a grant the Team page, never people management", () => {
    expect(labels("MANAGER", { grants: { ...NO_GRANTS, screenshots: true } })).toEqual([
      "Overview",
      "Team",
      "Approvals",
      "Team breaks",
      "Leave",
      "Work from home",
      "Messages",
      "Reports",
      "Calendar",
      "Instructions",
      "Profile",
    ]);
  });

  it("hides Team from a manager with no grant", () => {
    const items = labels("MANAGER", { grants: NO_GRANTS });
    expect(items).not.toContain("Team");
    expect(items).toEqual([
      "Overview",
      "Approvals",
      "Team breaks",
      "Leave",
      "Work from home",
      "Messages",
      "Reports",
      "Calendar",
      "Instructions",
      "Profile",
    ]);
  });

  it("gives Staff their own menu (4.1), and no removed pages for anyone", () => {
    expect(labels("USER")).toEqual([
      "Today",
      "Leave",
      "Work from home",
      "Calendar",
      "History",
      "Messages",
      "Profile",
    ]);
    for (const href of navFor("USER").flatMap((s) => s.items.map((i) => i.href))) {
      expect([href, canAccess("USER", href)]).toEqual([href, true]);
    }
    const hrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).not.toContain("/dashboard/me");
    expect(hrefs).not.toContain("/dashboard/team-today");
    expect(
      hrefs.some((h) => h.startsWith("/dashboard/admin") || h.startsWith("/dashboard/manager")),
    ).toBe(false);
  });

  it("drops a section that has nothing left", () => {
    expect(navFor("MANAGER", { grants: NO_GRANTS }).map((s) => s.heading)).not.toContain("People");
  });
});

describe("activeHrefFor", () => {
  it("picks the longest matching item", () => {
    const sections = navFor("ADMIN");
    expect(activeHrefFor(sections, "/dashboard/shifts/assign")).toBe("/dashboard/shifts/assign");
    expect(activeHrefFor(sections, "/dashboard/shifts/edit/s1")).toBe("/dashboard/shifts");
    expect(activeHrefFor(sections, "/dashboard/team/u-1")).toBe("/dashboard/team");
  });
});

describe("Agent health in the menu (3.3)", () => {
  it("shows only when GET /me grants canSeeAgentHealth", () => {
    expect(labels("ADMIN")).not.toContain("Agent health");
    expect(labels("ADMIN", { permissions: { canSeeAgentHealth: false } })).not.toContain(
      "Agent health",
    );
    expect(labels("ADMIN", { permissions: { canSeeAgentHealth: true } })).toContain("Agent health");
    expect(
      labels("MANAGER", {
        grants: { ...NO_GRANTS, activity: true },
        permissions: { canSeeAgentHealth: true },
      }),
    ).toContain("Agent health");
    expect(labels("USER", { permissions: { canSeeAgentHealth: true } })).not.toContain(
      "Agent health",
    );
  });
});

describe("Focus adjustments in the menu (3.3)", () => {
  it("shows only when GET /me grants canAdjustFocus (the Super Manager)", () => {
    expect(labels("SUPER_ADMIN", { hasOrg: true })).not.toContain("Focus adjustments");
    expect(labels("ADMIN", { permissions: { canAdjustFocus: false } })).not.toContain(
      "Focus adjustments",
    );
    expect(
      labels("SUPER_MANAGER", { hasOrg: true, permissions: { canAdjustFocus: true } }),
    ).toContain("Focus adjustments");
    expect(labels("USER", { permissions: { canAdjustFocus: true } })).not.toContain(
      "Focus adjustments",
    );
  });
});
