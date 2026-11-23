import { canSetGender, setsGender } from "@/features/users/lib/memberAccess";
import { EMPTY_MEMBER_DRAFT, validateMemberDraft } from "@/features/users/lib/memberForm";
import { buildUsersQuery } from "@/features/users/api/getUsers";

// 3.6 gender fitted to 4.0: the API's canSetGender, mirrored so the portal offers the
// field, the filter and Reset avatar only where the API takes them.
describe("who may set (and so sees) a gender", () => {
  const staff = { id: "s-1", role: "USER" };
  const manager = { id: "m-1", role: "MANAGER" };
  const admin = { id: "a-1", role: "ADMIN" };
  const superManager = { id: "sm-1", role: "SUPER_MANAGER" };
  const superAdmin = { id: "sa-1", role: "SUPER_ADMIN" };

  it.each<[string, string, string, { id: string; role: string }, boolean]>([
    ["an Admin, their Staff", "ADMIN", "a-1", staff, true],
    ["an Admin, their Manager", "ADMIN", "a-1", manager, true],
    ["an Admin, themselves", "ADMIN", "a-1", admin, false],
    ["an Admin, another Admin", "ADMIN", "a-2", admin, false],
    ["a Super Admin, an Admin", "SUPER_ADMIN", "sa-1", admin, true],
    ["a Super Admin, Staff", "SUPER_ADMIN", "sa-1", staff, true],
    ["a Super Admin, the Super Manager", "SUPER_ADMIN", "sa-1", superManager, true],
    ["a Super Admin, themselves", "SUPER_ADMIN", "sa-1", superAdmin, true],
    ["a Super Admin, another Super Admin", "SUPER_ADMIN", "sa-2", superAdmin, false],
    ["the Super Manager, Staff", "SUPER_MANAGER", "sm-1", staff, false],
    ["a Manager, their Staff", "MANAGER", "m-1", staff, false],
  ])("%s", (_who, role, myId, target, allowed) => {
    expect(canSetGender(role, myId, target)).toBe(allowed);
  });

  it("adding someone with a gender, and the filter, are the admins' only", () => {
    expect(setsGender("SUPER_ADMIN")).toBe(true);
    expect(setsGender("ADMIN")).toBe(true);
    expect(setsGender("SUPER_MANAGER")).toBe(false);
    expect(setsGender("MANAGER")).toBe(false);
  });
});

describe("the gender on Add member", () => {
  const draft = {
    ...EMPTY_MEMBER_DRAFT,
    firstName: "Arjun",
    lastName: "Mehta",
    email: "arjun@x.test",
    password: "S3cure!pass1",
    departmentIds: ["d-1"],
  };

  it("is required of whoever may set it", () => {
    expect(validateMemberDraft(draft, false, true).gender).toBe("Select male or female.");
    expect(validateMemberDraft({ ...draft, gender: "MALE" }, false, true).gender).toBeUndefined();
  });

  it("is never asked of anyone else, nor on an edit", () => {
    expect(validateMemberDraft(draft, false, false).gender).toBeUndefined();
    expect(validateMemberDraft(draft, true, true).gender).toBeUndefined();
  });
});

describe("GET /users?gender", () => {
  it("is sent when chosen, left out otherwise", () => {
    expect(buildUsersQuery({ gender: "UNSET" })).toMatchObject({ gender: "UNSET" });
    expect(buildUsersQuery({})).not.toHaveProperty("gender");
  });
});
