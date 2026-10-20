import { canAccess, type Role } from "./roles";

/**
 * The 3.1 pages under the 4.0 roles (SPEC 1.2): Admins join Super Admins
 * everywhere, Managers keep approvals, Team breaks and reports, Settings is the
 * organisation admins' only, and Staff no longer use the portal at all.
 */
describe("canAccess for the 3.1 pages in 4.0", () => {
  const matrix: [string, Record<Role, boolean>][] = [
    ["/dashboard/approvals", { SUPER_ADMIN: true, ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/reports", { SUPER_ADMIN: true, ADMIN: true, MANAGER: true, USER: false }],
    [
      "/dashboard/reports/person/u-1",
      { SUPER_ADMIN: true, ADMIN: true, MANAGER: true, USER: false },
    ],
    ["/dashboard/reports/team", { SUPER_ADMIN: true, ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/settings", { SUPER_ADMIN: true, ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/breaks/team", { SUPER_ADMIN: true, ADMIN: true, MANAGER: true, USER: false }],
  ];

  it.each(matrix)("%s", (path, expected) => {
    for (const role of Object.keys(expected) as Role[]) {
      expect([role, canAccess(role, path)]).toEqual([role, expected[role]]);
    }
  });
});
