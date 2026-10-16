import { canAccess, type Role } from "./roles";

/** SPEC 5: the 3.1 pages are for Managers and Super Admins; Settings for Super Admins. */
describe("canAccess for the 3.1 pages", () => {
  const matrix: [string, Record<Role, boolean>][] = [
    ["/dashboard/approvals", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/team-today", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/reports", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/reports/person/u-1", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/reports/team", { SUPER_ADMIN: true, MANAGER: true, USER: false }],
    ["/dashboard/settings", { SUPER_ADMIN: true, MANAGER: false, USER: false }],
    ["/dashboard/me", { SUPER_ADMIN: true, MANAGER: true, USER: true }],
  ];

  it.each(matrix)("%s", (path, expected) => {
    for (const role of Object.keys(expected) as Role[]) {
      expect([role, canAccess(role, path)]).toEqual([role, expected[role]]);
    }
  });
});
