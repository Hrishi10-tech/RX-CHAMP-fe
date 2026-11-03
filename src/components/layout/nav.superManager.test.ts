import { navFor } from "./nav";

function labels(...args: Parameters<typeof navFor>): string[] {
  return navFor(...args).flatMap((s) => s.items.map((i) => i.label));
}

/** 3.3: the Super Manager reads and decides everywhere, administers nothing. */
describe("navFor: the Super Manager", () => {
  const ADMIN_ONLY = [
    "Organisations",
    "Departments",
    "Input tracking",
    "Sign-out keys",
    "Settings",
  ];

  it("inside an organisation: a Manager's views of everyone, People, Shifts (read) and Assign shifts", () => {
    const items = labels("SUPER_MANAGER", { hasOrg: true });
    expect(items).toEqual(
      expect.arrayContaining([
        "Overview",
        "Team",
        "Approvals",
        "Messages",
        "Team management",
        "Team breaks",
        "Shifts",
        "Assign shifts",
        "Reports",
      ]),
    );
    for (const hidden of ADMIN_ONLY) expect(items).not.toContain(hidden);
  });

  it("needs no grants for Team (she holds every section)", () => {
    expect(labels("SUPER_MANAGER", { hasOrg: true, grants: null })).toContain("Team");
  });

  it("on All organisations: only the pages that work without one, People included", () => {
    const items = labels("SUPER_MANAGER", { hasOrg: false });
    expect(items).toEqual(expect.arrayContaining(["Overview", "Messages", "Team management"]));
    for (const hidden of ["Team", "Shifts", "Assign shifts", "Reports", ...ADMIN_ONLY])
      expect(items).not.toContain(hidden);
  });

  it("gets Agent health from GET /me like everyone else", () => {
    expect(
      labels("SUPER_MANAGER", { hasOrg: true, permissions: { canSeeAgentHealth: true } }),
    ).toContain("Agent health");
  });
});
