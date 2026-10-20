import { NO_GRANTS, type Grants } from "@/constants/roles";
import { newPasswordProblem } from "@/features/auth/lib/passwordRules";
import type { CreateUserInput, UpdateUserInput } from "@/features/users/types";
import type { TeamMember } from "@/types";

/** The Add / Edit member form (SPEC 7.2), as typed. */
export interface MemberDraft {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  designation: string;
  role: "MANAGER" | "USER";
  departmentIds: string[];
  grants: Grants;
  /** "" follows the department or the organisation's default shift. */
  shiftId: string;
}

export type MemberDraftErrors = Partial<Record<keyof MemberDraft, string>>;

export const EMPTY_MEMBER_DRAFT: MemberDraft = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  designation: "",
  role: "USER",
  departmentIds: [],
  grants: { ...NO_GRANTS },
  shiftId: "",
};

export function draftFromMember(m: TeamMember): MemberDraft {
  return {
    firstName: m.firstName,
    lastName: m.lastName,
    email: m.email,
    password: "",
    designation: m.designation,
    role: m.role === "MANAGER" ? "MANAGER" : "USER",
    departmentIds: m.departments.map((d) => d.id),
    grants: { ...m.grants },
    shiftId: m.shiftId ?? "",
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Staff need exactly one department, managers at least one (SPEC 2.1). */
export function validateMemberDraft(draft: MemberDraft, isEdit: boolean): MemberDraftErrors {
  const errors: MemberDraftErrors = {};
  if (!draft.firstName.trim()) errors.firstName = "Enter a first name.";
  if (!draft.lastName.trim()) errors.lastName = "Enter a last name.";
  if (!EMAIL.test(draft.email.trim())) errors.email = "Enter a valid email.";
  if (!isEdit) {
    const pw = newPasswordProblem(draft.password);
    if (pw) errors.password = pw;
  }
  if (draft.role === "USER" && draft.departmentIds.length !== 1) {
    errors.departmentIds = "Pick the department this person works in.";
  }
  if (draft.role === "MANAGER" && draft.departmentIds.length === 0) {
    errors.departmentIds = "Pick at least one department for this manager.";
  }
  return errors;
}

function departmentFields(
  draft: MemberDraft,
): Pick<CreateUserInput, "departmentId" | "departmentIds"> {
  return draft.role === "USER"
    ? { departmentId: draft.departmentIds[0] }
    : { departmentIds: [...draft.departmentIds] };
}

/** `POST /users` body. Grants go only with a manager. */
export function createInput(draft: MemberDraft): CreateUserInput {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    password: draft.password,
    role: draft.role,
    designation: draft.designation.trim() || undefined,
    ...departmentFields(draft),
    shiftId: draft.shiftId || null,
    ...(draft.role === "MANAGER" ? { grants: { ...draft.grants } } : {}),
  };
}

/** `PATCH /users/:id` body: the whole form (a role change moves departments too). */
export function updateInput(draft: MemberDraft): UpdateUserInput {
  return {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    designation: draft.designation.trim(),
    role: draft.role,
    ...(draft.role === "USER"
      ? { departmentId: draft.departmentIds[0] ?? null }
      : { departmentIds: [...draft.departmentIds] }),
    shiftId: draft.shiftId || null,
    ...(draft.role === "MANAGER" ? { grants: { ...draft.grants } } : {}),
  };
}
