import { NO_GRANTS } from "@/constants/roles";
import { NAV_SECTIONS, activeHrefFor, navFor } from "./nav";

function labels(...args: Parameters<typeof navFor>): string[] {
  return navFor(...args).flatMap((s) => s.items.map((i) => i.label));
}

/** SPEC 7.1: the sidebar and the phone menu per role. */
describe("navFor", () => {
  it("gives the Super Admin inside an organisation everything", () => {
    expect(labels("SUPER_ADMIN", { hasOrg: true })).toEqual([
      "Organisations",
      "Overview",
      "Team",
      "Approvals",
      "Messages",
      "Team management",
      "Departments",
      "Team breaks",
      "Shifts",
      "Assign shifts",
      "Calendar",
      "Input tracking",
      "Reports",
      "Sign-out keys",
      "Settings",
      "Instructions",
    ]);
  });

  it("gives the Super Admin on All organisations only what works without one", () => {
    expect(labels("SUPER_ADMIN", { hasOrg: false })).toEqual([
      "Organisations",
      "Overview",
      "Messages",
      "Instructions",
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
      ]),
    );
  });

  it("shows a manager with a grant the Team page, never people management", () => {
    expect(labels("MANAGER", { grants: { ...NO_GRANTS, screenshots: true } })).toEqual([
      "Overview",
      "Team",
      "Approvals",
      "Messages",
      "Team breaks",
      "Calendar",
      "Reports",
      "Instructions",
    ]);
  });

  it("hides Team from a manager with no grant", () => {
    const items = labels("MANAGER", { grants: NO_GRANTS });
    expect(items).not.toContain("Team");
    expect(items).toEqual([
      "Overview",
      "Approvals",
      "Messages",
      "Team breaks",
      "Calendar",
      "Reports",
      "Instructions",
    ]);
  });

  it("has nothing for Staff, and no removed pages for anyone", () => {
    expect(navFor("USER")).toEqual([]);
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
