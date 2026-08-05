"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Circle,
  Crown,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User as UserIcon,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { errorMessage } from "@/lib/api";
import { withDepartment } from "@/constants/departments";
import { getUser } from "@/features/users/api/getUser";
import { updateUser } from "@/features/users/api/updateUser";
import { formatJoined } from "@/features/users/lib/memberTable";
import type { EditMemberModalProps } from "@/features/users/types";

const ROLE_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  SUPER_ADMIN: { label: "Super Admin", icon: ShieldCheck },
  ADMIN: { label: "Admin", icon: Shield },
  MANAGER: { label: "Manager", icon: Crown },
  USER: { label: "Member", icon: UserIcon },
};

const STATUS_META: Record<string, { label: string; dot: string }> = {
  ACTIVE: { label: "Active", dot: "fill-emerald-500 text-emerald-500" },
  INVITED: { label: "Invited", dot: "fill-amber-500 text-amber-500" },
  DISABLED: { label: "Disabled", dot: "fill-slate-400 text-slate-400" },
  INACTIVE: { label: "Inactive", dot: "fill-slate-400 text-slate-400" },
};

const labelClass = "text-sm font-semibold text-slate-700";
const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[rgb(34_34_204)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const readOnlyClass =
  "h-11 w-full cursor-default rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-600 shadow-sm outline-none";
const hintClass = "mt-1.5 text-xs text-slate-400";
const errorClass = "mt-1.5 text-xs text-red-600";

function IconField({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  return (
    <div className="relative mt-1.5">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className={inputClass} {...props} />
    </div>
  );
}

/** A field the PATCH route can't change — shown for context, never submitted. */
function ReadOnlyField({
  icon: Icon,
  value,
  iconClassName = "text-slate-400",
}: {
  icon: LucideIcon;
  value: string;
  iconClassName?: string;
}) {
  return (
    <div className="relative mt-1.5">
      <Icon
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconClassName}`}
      />
      <input readOnly value={value} className={readOnlyClass} />
    </div>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditMemberModal({ open, member, onClose, onSaved }: EditMemberModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");

  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [joined, setJoined] = useState("—");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const memberId = member ? String(member.id) : null;

  // Seed from the row we already have, then replace with the full record —
  // designation isn't part of the list projection.
  useEffect(() => {
    if (!open || !member) return;
    const [first, ...rest] = (member.name ?? "").split(" ");
    setFirstName(first ?? "");
    setLastName(rest.join(" "));
    setDepartment(member.team && member.team !== "—" ? member.team : "");
    setDesignation("");
    setEmail(member.email ?? "");
    setRole((member.role ?? "").toUpperCase());
    setStatus((member.status ?? "").toUpperCase());
    setJoined(member.joined ?? "—");
    setNameError(null);
    setEmailError(null);
  }, [open, member]);

  useEffect(() => {
    if (!open || !memberId) return;
    let active = true;
    setLoading(true);
    getUser(memberId)
      .then((u) => {
        if (!active) return;
        const [first, ...rest] = (u.name ?? "").split(" ");
        setFirstName(u.firstName ?? first ?? "");
        setLastName(u.lastName ?? rest.join(" "));
        setDepartment(u.department ?? "");
        setDesignation(u.designation ?? "");
        setEmail(u.email ?? "");
        setRole((u.role ?? "").toUpperCase());
        setStatus((u.status ?? "").toUpperCase());
        if (u.createdAt) setJoined(formatJoined(u.createdAt));
      })
      .catch((err) => {
        if (!active) return;
        toast.error("Couldn't load member", {
          description: errorMessage(err) ?? "Please try again.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, memberId]);

  const departmentOptions = withDepartment(department);

  const roleMeta = ROLE_LABELS[role];
  const statusMeta = STATUS_META[status];

  async function handleSave() {
    if (!memberId) return;

    const trimmedEmail = email.trim();
    let invalid = false;
    if (!firstName.trim() || !lastName.trim()) {
      setNameError("First and last name are required");
      invalid = true;
    } else {
      setNameError(null);
    }
    if (!trimmedEmail) {
      setEmailError("Email is required");
      invalid = true;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Enter a valid email");
      invalid = true;
    } else {
      setEmailError(null);
    }
    if (invalid) return;

    setSaving(true);
    try {
      const updated = await updateUser(memberId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail,
        department: department.trim() || undefined,
        designation: designation.trim() || undefined,
      });

      const savedName = updated.name ?? `${firstName} ${lastName}`.trim();
      // The server has no email update path yet — if it echoed back the old
      // address, say so rather than reporting a save that didn't happen.
      const emailApplied =
        !updated.email || updated.email.toLowerCase() === trimmedEmail.toLowerCase();

      if (emailApplied) {
        toast.success("Member updated", { description: `${savedName} has been saved.` });
      } else {
        toast.warning("Saved, but the email didn't change", {
          description: `Still ${updated.email}. The server doesn't support email updates yet.`,
        });
      }

      onSaved?.();
      onClose();
    } catch (err) {
      toast.error("Couldn't update member", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={saving ? () => {} : onClose} className="max-w-2xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Edit Member</h2>
              <p className="text-sm text-slate-400">
                Update this member&apos;s name and team info.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading member details…
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="edit-first-name">
                First Name
              </label>
              <IconField
                id="edit-first-name"
                icon={UserIcon}
                value={firstName}
                disabled={saving}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit-last-name">
                Last Name
              </label>
              <IconField
                id="edit-last-name"
                icon={UserIcon}
                value={lastName}
                disabled={saving}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>
          {nameError && <p className={errorClass}>{nameError}</p>}

          <div>
            <label className={labelClass} htmlFor="edit-email">
              Email Address
            </label>
            <IconField
              id="edit-email"
              icon={Mail}
              type="email"
              value={email}
              disabled={saving}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
            {emailError && <p className={errorClass}>{emailError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="edit-department">
                Department
              </label>
              <Select
                id="edit-department"
                value={department}
                onValueChange={setDepartment}
                options={departmentOptions}
                placeholder="Select a department"
                aria-label="Department"
                disabled={saving}
                leadingIcon={Briefcase}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit-designation">
                Designation
              </label>
              <IconField
                id="edit-designation"
                icon={Briefcase}
                value={designation}
                disabled={saving}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Team Lead"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Not editable here
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Role</label>
                <ReadOnlyField
                  icon={roleMeta?.icon ?? UserIcon}
                  value={roleMeta?.label ?? role ?? "—"}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <ReadOnlyField
                  icon={Circle}
                  iconClassName={`h-2.5 w-2.5 ${statusMeta?.dot ?? "fill-slate-300 text-slate-300"}`}
                  value={statusMeta?.label ?? status ?? "—"}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Joined Date</label>
                <ReadOnlyField
                  icon={CalendarDays}
                  iconClassName="text-[rgb(34_34_204)]"
                  value={joined}
                />
              </div>
            </div>

            <p className={hintClass}>
              Role and shift have no update route yet, and status changes go through its own action
              — editing them here would look saved without changing anything.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-lg bg-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgb(28_28_180)] disabled:opacity-70"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
