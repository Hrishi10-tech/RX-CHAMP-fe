import {
  EMPTY_MEMBER_DRAFT,
  createInput,
  detailsInput,
  superManagerInput,
  updateInput,
  validateMemberDraft,
  type MemberDraft,
} from "@/features/users/lib/memberForm";

const person: MemberDraft = {
  ...EMPTY_MEMBER_DRAFT,
  firstName: " Asha ",
  lastName: "Raman",
  email: "asha@example.test",
  password: "S3cure!pass1",
  designation: "Ops",
};

describe("the member form for a Super Manager (3.3)", () => {
  it("needs no department", () => {
    expect(validateMemberDraft({ ...person, role: "SUPER_MANAGER" }, false)).toEqual({});
    expect(validateMemberDraft({ ...person, role: "USER" }, false)).toHaveProperty("departmentIds");
  });

  it("sends the person only to POST /super-managers", () => {
    expect(superManagerInput({ ...person, role: "SUPER_MANAGER", departmentIds: ["d"] })).toEqual({
      firstName: "Asha",
      lastName: "Raman",
      email: "asha@example.test",
      password: "S3cure!pass1",
      designation: "Ops",
    });
  });

  it("edits an account with a fixed role through its details only", () => {
    expect(detailsInput({ ...person, role: "SUPER_MANAGER" })).toEqual({
      firstName: "Asha",
      lastName: "Raman",
      email: "asha@example.test",
      designation: "Ops",
    });
  });

  it("never sends SUPER_MANAGER to the people endpoints", () => {
    const draft: MemberDraft = { ...person, role: "SUPER_MANAGER", departmentIds: ["d"] };
    expect(createInput(draft).role).toBe("USER");
    expect(updateInput(draft).role).toBe("USER");
  });
});
