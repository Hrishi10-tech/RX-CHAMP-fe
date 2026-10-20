import { canChangeMember } from "@/features/users/lib/memberAccess";
import { departmentsOf } from "@/features/users/lib/memberTable";

describe("who may change a Team management row", () => {
  const staff = { id: "s-1", role: "USER" };
  const manager = { id: "m-1", role: "MANAGER" };
  const admin = { id: "a-1", role: "ADMIN" };
  const superAdmin = { id: "sa-1", role: "SUPER_ADMIN" };

  it("an Admin changes Managers and Staff, never an Admin or themselves", () => {
    expect(canChangeMember("ADMIN", "a-1", staff)).toBe(true);
    expect(canChangeMember("ADMIN", "a-1", manager)).toBe(true);
    expect(canChangeMember("ADMIN", "a-1", admin)).toBe(false);
    expect(canChangeMember("ADMIN", "a-2", admin)).toBe(false);
  });

  it("the Super Admin also changes the Admin, never a Super Admin", () => {
    expect(canChangeMember("SUPER_ADMIN", "sa-1", admin)).toBe(true);
    expect(canChangeMember("SUPER_ADMIN", "sa-1", staff)).toBe(true);
    expect(canChangeMember("SUPER_ADMIN", "sa-1", superAdmin)).toBe(false);
  });

  it("managers and staff change nobody", () => {
    expect(canChangeMember("MANAGER", "m-1", staff)).toBe(false);
    expect(canChangeMember("USER", "s-1", staff)).toBe(false);
    expect(canChangeMember(null, null, staff)).toBe(false);
  });
});

describe("a member's departments", () => {
  it("takes a staff member's department, with its icon, from departmentRef", () => {
    expect(
      departmentsOf({
        id: "s-1",
        department: "Engineering",
        departmentId: "d-1",
        departmentRef: { id: "d-1", name: "Engineering", icon: "code" },
        departments: [],
      }),
    ).toEqual([{ id: "d-1", name: "Engineering", icon: "code" }]);
  });

  it("falls back to the id and name, and lists a manager's departments", () => {
    expect(departmentsOf({ id: "s-1", department: "Sales", departmentId: "d-2" })).toEqual([
      { id: "d-2", name: "Sales", icon: "briefcase" },
    ]);
    expect(
      departmentsOf({
        id: "m-1",
        departments: [
          { id: "d-1", name: "Engineering", icon: "code" },
          { id: "d-2", name: "Sales", icon: null },
        ],
      }),
    ).toEqual([
      { id: "d-1", name: "Engineering", icon: "code" },
      { id: "d-2", name: "Sales", icon: "briefcase" },
    ]);
  });
});
