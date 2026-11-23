"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Crown, Globe2, Loader2, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import { Select } from "@/components/ui/Select";
import { labelBase } from "@/components/ui/classes";
import { FieldError, Hint, Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { PASSWORD_RULE } from "@/features/auth/lib/passwordRules";
import { useSession } from "@/features/auth/hooks/useSession";
import type { Gender } from "@/features/avatars/types";
import { DepartmentPicker } from "@/features/departments/components/DepartmentPicker";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useShifts } from "@/features/shifts/hooks/useShifts";
import { shiftSelectOptions } from "@/features/shifts/components/shiftOptions";
import { createUser } from "@/features/users/api/createUser";
import { createSuperManager } from "@/features/users/api/superManagers";
import { updateUser } from "@/features/users/api/updateUser";
import {
  DefaultAvatarCard,
  GenderField,
  useDefaultAvatar,
} from "@/features/users/components/GenderField";
import { GrantsEditor } from "@/features/users/components/GrantsEditor";
import { canSetGender, setsGender } from "@/features/users/lib/memberAccess";
import {
  EMPTY_MEMBER_DRAFT,
  createInput,
  detailsInput,
  draftFromMember,
  superManagerInput,
  updateInput,
  validateMemberDraft,
  type MemberDraft,
  type MemberDraftErrors,
} from "@/features/users/lib/memberForm";
import type { TeamMember } from "@/types";

const ROLE_CARDS: {
  value: MemberDraft["role"];
  label: string;
  detail: string;
  icon: LucideIcon;
}[] = [
  {
    value: "USER",
    label: "Staff",
    detail: "Uses the RX Vision app on their computer. One department.",
    icon: UserRound,
  },
  {
    value: "MANAGER",
    label: "Manager",
    detail: "Approves and reports for one or more departments. Never edits people.",
    icon: Crown,
  },
  {
    value: "SUPER_MANAGER",
    label: "Super Manager",
    detail: "Every organisation: sees and approves like a Manager, adds Staff. Belongs to none.",
    icon: Globe2,
  },
];

/** What saving this gender does to the person's avatar (3.6). */
export function genderHint(
  gender: Gender | null,
  initial: Gender | null,
  nextDefault: string | null,
): string {
  if (!gender) return "Not set yet. They show initials until you pick one.";
  if (!initial) return `They start on the default avatar${nextDefault ? `, ${nextDefault}` : ""}.`;
  if (gender !== initial) {
    return `Their avatar goes back to the new default${nextDefault ? `, ${nextDefault}` : ""}, when you save.`;
  }
  return "Decides which avatars they can choose from.";
}

/** The roles an Admin offers; the page narrows or widens them per viewer (3.3). */
const DEFAULT_ROLES: MemberDraft["role"][] = ["USER", "MANAGER"];

/** Select value for "no shift of their own" (Radix needs a non-empty value). */
const FOLLOW_DEFAULT = "__default__";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-primary">{title}</h3>
        {hint && <p className="text-xs text-quiet">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Add or edit a member (SPEC 7.2 Team management): role Manager or Staff,
 * department(s) with icons (one for staff, any number for a manager), a
 * manager's view grants, and the shift. Admins are created per organisation by
 * the Super Admin; editing one here changes only their details.
 *
 * 3.3: `roles` limits the role cards (the Super Manager adds Staff only; the
 * Super Admin adds a Super Manager from the platform view). A Super Manager has
 * no organisation, so no department, grants or shift, and is created through
 * POST /super-managers; editing one changes only their details.
 */
export function MemberFormDialog({
  open,
  member,
  onClose,
  onSaved,
  roles = DEFAULT_ROLES,
}: {
  open: boolean;
  /** null to add someone. */
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
  /** The role cards offered when adding someone (and when editing a Manager or Staff). */
  roles?: MemberDraft["role"][];
}) {
  const uid = useId();
  const { user: me, role: viewerRole } = useSession();
  const isEdit = member !== null;
  const superManagerAccount = member?.role === "SUPER_MANAGER";
  const fixedRole =
    member && (member.role === "ADMIN" || member.role === "SUPER_ADMIN" || superManagerAccount);
  const firstRole = roles[0] ?? "USER";
  const [draft, setDraft] = useState<MemberDraft>(EMPTY_MEMBER_DRAFT);
  // A Super Manager belongs to no organisation: no department, grants or shift.
  const noOrg = superManagerAccount || (!isEdit && draft.role === "SUPER_MANAGER");
  const departments = useDepartments(open && !noOrg);
  const shifts = useShifts(open && !noOrg);
  const [errors, setErrors] = useState<MemberDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const genderRef = useRef<HTMLButtonElement>(null);
  // 3.6: gender (the avatar library) is the organisation admin's or a Super Admin's to set:
  // on someone they may edit, or when adding a Manager or Staff (a new Super Manager's is
  // set by editing them afterwards).
  const genderAllowed = member
    ? canSetGender(viewerRole, me?.id, member)
    : setsGender(viewerRole) && draft.role !== "SUPER_MANAGER";
  const initialGender: Gender | null = member?.gender ?? null;
  const nextDefault = useDefaultAvatar(genderAllowed && draft.gender ? draft.gender : null).id;

  useEffect(() => {
    if (!open) return;
    setDraft(member ? draftFromMember(member) : { ...EMPTY_MEMBER_DRAFT, role: firstRole });
    setErrors({});
    setFormError(null);
  }, [open, member, firstRole]);

  function set<K extends keyof MemberDraft>(key: K, value: MemberDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function setRole(role: MemberDraft["role"]) {
    setDraft((d) => ({
      ...d,
      role,
      // Staff keep one department: the first of a manager's list.
      departmentIds: role === "USER" ? d.departmentIds.slice(0, 1) : d.departmentIds,
    }));
    setErrors((e) => ({ ...e, departmentIds: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = validateMemberDraft(draft, isEdit, genderAllowed);
    if (fixedRole) delete next.departmentIds;
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.gender && Object.keys(next).length === 1) genderRef.current?.focus();
      return;
    }
    // Sent only by those who may set it, and on an edit only when it changed.
    const gender =
      genderAllowed && draft.gender && draft.gender !== initialGender ? draft.gender : undefined;
    setSaving(true);
    setFormError(null);
    try {
      if (member && superManagerAccount) {
        await updateUser(member.id, { ...detailsInput(draft), ...(gender ? { gender } : {}) });
        toast.success("Super Manager saved", {
          description: `${draft.firstName} ${draft.lastName}`.trim(),
        });
      } else if (member) {
        const input = { ...updateInput(draft), ...(gender ? { gender } : {}) };
        if (fixedRole) {
          delete input.role;
          delete input.departmentId;
          delete input.departmentIds;
          delete input.grants;
        }
        await updateUser(member.id, input);
        toast.success("Member saved", {
          description: `${draft.firstName} ${draft.lastName}`.trim(),
        });
      } else if (draft.role === "SUPER_MANAGER") {
        await createSuperManager(superManagerInput(draft));
        toast.success("Super Manager added", {
          description: `${draft.firstName} can sign in to the portal and pick an organisation.`,
        });
      } else {
        await createUser({ ...createInput(draft), ...(gender ? { gender } : {}) });
        toast.success("Member added", {
          description: `${draft.firstName} can sign in once their RX Vision app is set up.`,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      const message = errorMessage(err) ?? "Please try again.";
      if (/email/i.test(message) && /use|exist|taken/i.test(message)) {
        setErrors((x) => ({ ...x, email: "This email is already in use." }));
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  const shiftOptions: SelectOption[] = [
    {
      value: FOLLOW_DEFAULT,
      label: "Department or default shift",
      description: "Follows the department's shift, else the organisation's default",
    },
    ...shiftSelectOptions(shifts.data),
  ];

  const text = (
    key: "firstName" | "lastName" | "email" | "designation",
    label: string,
    type = "text",
  ) => (
    <div>
      <Label htmlFor={`${uid}-${key}`}>{label}</Label>
      <Input
        id={`${uid}-${key}`}
        type={type}
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        invalid={Boolean(errors[key])}
        className="mt-1.5"
        autoComplete="off"
      />
      {errors[key] && <FieldError>{errors[key]}</FieldError>}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={isEdit ? `Edit ${member?.name ?? "member"}` : "Add member"}
      description={
        isEdit
          ? "Changes apply straight away."
          : roles.length === 1 && roles[0] === "SUPER_MANAGER"
            ? "A Super Manager: every organisation, read and decide, adds Staff."
            : roles.length === 1 && roles[0] === "USER"
              ? "A Staff member in this organisation."
              : "A Manager or a Staff member in this organisation."
      }
      className="max-w-2xl"
    >
      <form onSubmit={submit} noValidate className="space-y-6 px-6 py-5">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-attention-edge bg-attention-wash px-3 py-2 text-sm text-attention"
          >
            {formError}
          </p>
        )}

        <Section title="Person">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text("firstName", "First name")}
            {text("lastName", "Last name")}
            {text("email", "Email", "email")}
            {text("designation", "Designation")}
          </div>
          {genderAllowed && (
            <div>
              <span id={`${uid}-gender`} className={labelBase}>
                Gender
              </span>
              <GenderField
                labelledBy={`${uid}-gender`}
                value={draft.gender || null}
                onChange={(g) => set("gender", g)}
                disabled={saving}
                invalid={Boolean(errors.gender)}
                firstOptionRef={genderRef}
              />
              {errors.gender ? (
                <FieldError>{errors.gender}</FieldError>
              ) : isEdit ? (
                <Hint>{genderHint(draft.gender || null, initialGender, nextDefault)}</Hint>
              ) : null}
              {!isEdit && draft.gender && (
                <DefaultAvatarCard
                  gender={draft.gender}
                  firstName={draft.firstName}
                  webToo={draft.role !== "USER"}
                />
              )}
            </div>
          )}
          {!isEdit && (
            <div>
              <Label htmlFor={`${uid}-password`}>Password</Label>
              <PasswordField
                id={`${uid}-password`}
                value={draft.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
              />
              {errors.password ? (
                <FieldError>{errors.password}</FieldError>
              ) : (
                <Hint>{PASSWORD_RULE} They use it to sign in to the app.</Hint>
              )}
            </div>
          )}
        </Section>

        {fixedRole ? (
          <p className="flex items-center gap-2 rounded-xl bg-meeting-wash px-3 py-2.5 text-sm text-meeting-ink">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            {superManagerAccount
              ? "This is a Super Manager. They belong to no organisation; their role does not change here."
              : "This is the organisation’s Admin. Their role is set from Organisations."}
          </p>
        ) : (
          <>
            <Section title="Role">
              <div
                role="radiogroup"
                aria-label="Role"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {ROLE_CARDS.filter(
                  (c) => roles.includes(c.value) || (isEdit && c.value === draft.role),
                ).map(({ value, label, detail, icon: Icon }) => {
                  const selected = draft.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRole(value)}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 ${
                        selected
                          ? "border-brand bg-brand/5 ring-1 ring-brand"
                          : "border-card hover:bg-fill"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          selected ? "bg-brand text-on-brand" : "bg-panel text-quiet"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-primary">{label}</span>
                        <span className="block text-xs text-quiet">{detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {!noOrg && (
              <Section
                title={draft.role === "MANAGER" ? "Departments" : "Department"}
                hint={
                  draft.role === "MANAGER"
                    ? "The departments this manager approves and reports for."
                    : "Where this person works."
                }
              >
                <DepartmentPicker
                  departments={departments.data ?? []}
                  value={draft.departmentIds}
                  onChange={(ids) => set("departmentIds", ids)}
                  multiple={draft.role === "MANAGER"}
                  label={draft.role === "MANAGER" ? "Departments" : "Department"}
                  invalid={Boolean(errors.departmentIds)}
                />
                {errors.departmentIds && <FieldError>{errors.departmentIds}</FieldError>}
              </Section>
            )}

            {draft.role === "MANAGER" && (
              <Section
                title="What they can see"
                hint="With any of these, the manager gets the Team page for their departments' staff."
              >
                <GrantsEditor value={draft.grants} onChange={(g) => set("grants", g)} />
              </Section>
            )}
          </>
        )}

        {!noOrg && (
          <Section title="Shift">
            <Select
              value={draft.shiftId || FOLLOW_DEFAULT}
              onValueChange={(v) => set("shiftId", v === FOLLOW_DEFAULT ? "" : v)}
              options={shiftOptions}
              aria-label="Shift"
            />
          </Section>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-divider pt-4 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isEdit ? "Save changes" : "Add member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
