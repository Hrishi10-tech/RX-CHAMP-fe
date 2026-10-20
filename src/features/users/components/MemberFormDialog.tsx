"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Crown, Loader2, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import { Select } from "@/components/ui/Select";
import {
  btnPrimary,
  btnSecondary,
  errorText,
  hintBase,
  inputBase,
  inputInvalid,
  labelBase,
} from "@/components/ui/classes";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { PASSWORD_RULE } from "@/features/auth/lib/passwordRules";
import { DepartmentPicker } from "@/features/departments/components/DepartmentPicker";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useShifts } from "@/features/shifts/hooks/useShifts";
import { shiftSelectOptions } from "@/features/shifts/components/shiftOptions";
import { createUser } from "@/features/users/api/createUser";
import { updateUser } from "@/features/users/api/updateUser";
import { GrantsEditor } from "@/features/users/components/GrantsEditor";
import {
  EMPTY_MEMBER_DRAFT,
  createInput,
  draftFromMember,
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
];

/** Select value for "no shift of their own" (Radix needs a non-empty value). */
const FOLLOW_DEFAULT = "__default__";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
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
 */
export function MemberFormDialog({
  open,
  member,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null to add someone. */
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const isEdit = member !== null;
  const fixedRole = member && (member.role === "ADMIN" || member.role === "SUPER_ADMIN");
  const departments = useDepartments(open);
  const shifts = useShifts(open);
  const [draft, setDraft] = useState<MemberDraft>(EMPTY_MEMBER_DRAFT);
  const [errors, setErrors] = useState<MemberDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(member ? draftFromMember(member) : EMPTY_MEMBER_DRAFT);
    setErrors({});
    setFormError(null);
  }, [open, member]);

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
    const next = validateMemberDraft(draft, isEdit);
    if (fixedRole) delete next.departmentIds;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setFormError(null);
    try {
      if (member) {
        const input = updateInput(draft);
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
      } else {
        await createUser(createInput(draft));
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
      <label htmlFor={`${uid}-${key}`} className={labelBase}>
        {label}
      </label>
      <input
        id={`${uid}-${key}`}
        type={type}
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        className={`${inputBase} mt-1.5 ${errors[key] ? inputInvalid : ""}`}
        autoComplete="off"
      />
      {errors[key] && <p className={errorText}>{errors[key]}</p>}
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
          : "A Manager or a Staff member in this organisation."
      }
      className="max-w-2xl"
    >
      <form onSubmit={submit} noValidate className="space-y-6 px-6 py-5">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
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
          {!isEdit && (
            <div>
              <label htmlFor={`${uid}-password`} className={labelBase}>
                Password
              </label>
              <PasswordField
                id={`${uid}-password`}
                value={draft.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.password)}
              />
              {errors.password ? (
                <p className={errorText}>{errors.password}</p>
              ) : (
                <p className={hintBase}>{PASSWORD_RULE} They use it to sign in to the app.</p>
              )}
            </div>
          )}
        </Section>

        {fixedRole ? (
          <p className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-sm text-violet-800">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            This is the organisation&apos;s Admin. Their role is set from Organisations.
          </p>
        ) : (
          <>
            <Section title="Role">
              <div
                role="radiogroup"
                aria-label="Role"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {ROLE_CARDS.map(({ value, label, detail, icon: Icon }) => {
                  const selected = draft.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRole(value)}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
                        selected
                          ? "border-[rgb(34_34_204)] bg-[rgba(34,34,204,0.05)] ring-1 ring-[rgb(34_34_204)]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          selected
                            ? "bg-[rgb(34_34_204)] text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{label}</span>
                        <span className="block text-xs text-slate-500">{detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

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
              {errors.departmentIds && <p className={errorText}>{errors.departmentIds}</p>}
            </Section>

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

        <Section title="Shift">
          <Select
            value={draft.shiftId || FOLLOW_DEFAULT}
            onValueChange={(v) => set("shiftId", v === FOLLOW_DEFAULT ? "" : v)}
            options={shiftOptions}
            aria-label="Shift"
          />
        </Section>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isEdit ? "Save changes" : "Add member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
