"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Plus,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { errorMessage } from "@/lib/api";

import { ROLES } from "@/constants/roles";
import { withDepartment } from "@/constants/departments";
import { useSession } from "@/features/auth/hooks/useSession";
import { getCompanies } from "@/features/companies/api/getCompanies";
import type { Company } from "@/features/companies/types";
import { createUser } from "@/features/users/api/createUser";
import { getUser } from "@/features/users/api/getUser";
import { updateUser } from "@/features/users/api/updateUser";
import { TimePicker, formatTime12 } from "@/components/ui/TimePicker";
import { Select } from "@/components/ui/Select";
import { LoadingOverlay } from "@/components/ui/Loader";

const SHIFT_HOURS = 9;

function shiftDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + hours * 60) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Edit mode can only PATCH firstName/lastName/department/designation, so the
// create-only fields are shown read-only and left out of validation — otherwise a
// member with no shift (or a non-9h one) could never be saved at all.
function buildMemberFields(isEdit: boolean) {
  return z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: isEdit ? z.string() : z.string().min(8, "Use at least 8 characters"),
    role: isEdit ? z.string() : z.string().min(1, "Select a role"),
    company: z.string().optional(),
    department: z.string().trim().min(1, "Department is required"),
    designation: z.string().trim().min(1, "Designation is required"),
    shiftStart: isEdit ? z.string() : z.string().min(1, "Select a shift start time"),
    shiftEnd: isEdit ? z.string() : z.string().min(1, "Select a shift end time"),
  });
}

function buildMemberSchema(isEdit: boolean) {
  const fields = buildMemberFields(isEdit);
  if (isEdit) return fields;
  return fields.refine((v) => shiftDurationMinutes(v.shiftStart, v.shiftEnd) === SHIFT_HOURS * 60, {
    message: `Shift must total exactly ${SHIFT_HOURS} hours`,
    path: ["shiftEnd"],
  });
}

type MemberValues = z.infer<ReturnType<typeof buildMemberFields>>;

type AssignOption = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const ROLE_OPTIONS: AssignOption[] = [
  {
    value: ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description: "Full access to all modules and settings",
    icon: Crown,
  },
  {
    value: ROLES.ADMIN,
    label: "Admin",
    description: "Full workspace access",
    icon: ShieldCheck,
  },
  {
    value: ROLES.MANAGER,
    label: "Manager",
    description: "Manage teams, members and projects",
    icon: UsersRound,
  },
  {
    value: ROLES.USER,
    label: "Member",
    description: "Access to assigned teams and tasks",
    icon: UserRound,
  },
];

const LIST_ROUTE = "/dashboard/admin/team-management";
const CREATE_COMPANY_ROUTE = "/dashboard/admin/team-management/company";

function companyDescription(c: Company): string {
  const parts = [
    `${c.userCount ?? 0} ${c.userCount === 1 ? "user" : "users"}`,
    `${c.managerCount ?? 0} ${c.managerCount === 1 ? "manager" : "managers"}`,
  ];
  return parts.join(" • ");
}

const fieldBase =
  "h-11 w-full rounded-lg border bg-white pl-10 pr-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:ring-2";
const fieldNormal =
  "border-slate-200 focus:border-[rgb(34_34_204)] focus:ring-[rgba(34,34,204,0.15)]";
const fieldError = "border-red-400 focus:border-red-500 focus:ring-[rgba(239,68,68,0.15)]";

function inputClass(hasError?: boolean, extra = ""): string {
  return `${fieldBase} ${hasError ? fieldError : fieldNormal} ${extra}`.trim();
}

const errorClass = "mt-1.5 text-xs text-red-600";

/** Note under fields that exist on create but have no update route. */
const lockedClass = "mt-1.5 text-xs text-slate-400";

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function IconInput({
  icon: Icon,
  hasError,
  extra,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
  hasError?: boolean;
  extra?: string;
}) {
  return (
    <div className="relative mt-1.5">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className={inputClass(hasError, extra)} {...props} />
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  badge,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            {title}
            {badge && <span className="ml-1.5 text-sm font-medium text-slate-400">{badge}</span>}
          </h2>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function CompanyCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors ${
        selected
          ? "border-[rgb(34_34_204)] bg-[rgba(34,34,204,0.05)] ring-1 ring-[rgb(34_34_204)]"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-[rgb(34_34_204)]" : "border-slate-300"
        }`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-[rgb(34_34_204)]" />}
      </span>
    </button>
  );
}

function AddMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role: currentRole } = useSession();
  const [showPassword, setShowPassword] = useState(false);

  const editId = searchParams.get("id");
  const isEdit = Boolean(editId);
  const [loadingUser, setLoadingUser] = useState(isEdit);

  const isManager = currentRole === ROLES.MANAGER;
  const listRoute = isManager ? "/dashboard/manager" : LIST_ROUTE;
  const backLabel = isManager ? "Team Overview" : "Team Management";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  const memberSchema = useMemo(() => buildMemberSchema(isEdit), [isEdit]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "",
      company: "",
      department: "",
      designation: "",
      shiftStart: "",
      shiftEnd: "",
    },
  });

  useEffect(() => {
    if (!editId) return;
    let active = true;
    setLoadingUser(true);
    getUser(editId)
      .then((u) => {
        if (!active) return;
        const [firstFromName, ...restFromName] = (u.name ?? "").split(" ");
        reset({
          firstName: u.firstName ?? firstFromName ?? "",
          lastName: u.lastName ?? restFromName.join(" "),
          email: u.email ?? "",
          password: "",
          role: u.role ?? "",
          company: u.companyId ?? "",
          department: u.department ?? "",
          designation: u.designation ?? "",
          shiftStart: u.shiftStart ?? "",
          shiftEnd: u.shiftEnd ?? "",
        });
      })
      .catch((err) => {
        if (!active) return;
        toast.error("Couldn't load member", {
          description: errorMessage(err) ?? "Please try again.",
        });
        router.push(listRoute);
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });
    return () => {
      active = false;
    };
  }, [editId, reset, router, listRoute]);

  const shiftStart = watch("shiftStart");
  const shiftEnd = watch("shiftEnd");
  useEffect(() => {
    if (isEdit) return; // keep the server's shift as-is; it isn't editable here
    if (shiftStart) {
      setValue("shiftEnd", addHoursToTime(shiftStart, SHIFT_HOURS), {
        shouldValidate: true,
      });
    }
  }, [isEdit, shiftStart, setValue]);

  const roleOptions = useMemo(() => {
    if (currentRole === ROLES.SUPER_ADMIN)
      return ROLE_OPTIONS.filter((r) => r.value === ROLES.MANAGER);
    if (currentRole === ROLES.MANAGER) return ROLE_OPTIONS.filter((r) => r.value === ROLES.USER);
    return ROLE_OPTIONS;
  }, [currentRole]);

  const roleValue = watch("role");
  const roleSelectOptions = useMemo(() => {
    const opts = roleOptions.map((r) => ({
      value: r.value,
      label: r.label,
      description: r.description,
      icon: r.icon,
    }));
    // When editing, the member's role may not be one this session can create —
    // add it so the (read-only) select still shows it instead of a placeholder.
    if (roleValue && !opts.some((o) => o.value === roleValue)) {
      const known = ROLE_OPTIONS.find((r) => r.value === roleValue);
      opts.unshift({
        value: roleValue,
        label: known?.label ?? roleValue,
        description: known?.description ?? "",
        icon: known?.icon ?? UserRound,
      });
    }
    return opts;
  }, [roleOptions, roleValue]);

  const departmentValue = watch("department");
  const departmentOptions = useMemo(() => withDepartment(departmentValue), [departmentValue]);

  useEffect(() => {
    if (isEdit) return; // don't overwrite the member's actual role with the only creatable one
    if (roleOptions.length === 1) {
      setValue("role", roleOptions[0].value, { shouldValidate: true });
    }
  }, [isEdit, roleOptions, setValue]);

  useEffect(() => {
    // The company card only renders when creating, so don't fetch otherwise.
    if (isManager || isEdit) {
      setCompaniesLoading(false);
      return;
    }
    let active = true;
    setCompaniesLoading(true);
    getCompanies({ page: 1, limit: 100 })
      .then((res) => {
        if (active) setCompanies(res.companies);
      })
      .catch(() => {
        if (!active) return;
        setCompanies([]);
        toast.error("Couldn't load companies", {
          description: "Please try again.",
        });
      })
      .finally(() => {
        if (active) setCompaniesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isManager, isEdit]);

  async function onSubmit(values: MemberValues) {
    const fullName = `${values.firstName} ${values.lastName}`.trim();
    try {
      if (isEdit && editId) {
        const updated = await updateUser(editId, {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          department: values.department,
          designation: values.designation,
        });
        // The server has no email update path yet — don't report a save it ignored.
        if (updated.email && updated.email.toLowerCase() !== values.email.toLowerCase()) {
          toast.warning("Saved, but the email didn't change", {
            description: `Still ${updated.email}. The server doesn't support email updates yet.`,
          });
        } else {
          toast.success("Member updated", {
            description: `${fullName} has been saved.`,
          });
        }
      } else {
        await createUser({
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          password: values.password,
          role: values.role,
          companyId: values.company || undefined,
          department: values.department,
          designation: values.designation,
          shiftStart: values.shiftStart,
          shiftEnd: values.shiftEnd,
        });
        toast.success("Member created", {
          description: `${fullName} has been added.`,
        });
      }
      router.push(listRoute);
    } catch (err) {
      toast.error(isEdit ? "Couldn't update member" : "Couldn't create member", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={listRoute}
            className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="font-semibold text-slate-700">
            {isEdit ? "Edit Member" : "Add Member"}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Edit Member" : "Add Member"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit
            ? "Update this member's details and access."
            : "Create a new team member and assign role & access."}
        </p>
      </div>

      {loadingUser && <LoadingOverlay label="Loading member…" />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card
          icon={UserRound}
          title="Personal Information"
          action={
            <span className="text-xs text-slate-400">
              <span className="text-red-500">*</span> Required fields
            </span>
          }
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="firstName" required>
                First name
              </FieldLabel>
              <IconInput
                id="firstName"
                icon={UserRound}
                hasError={!!errors.firstName}
                placeholder="Enter first name"
                {...register("firstName")}
              />
              {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="lastName" required>
                Last name
              </FieldLabel>
              <IconInput
                id="lastName"
                icon={UserRound}
                hasError={!!errors.lastName}
                placeholder="Enter last name"
                {...register("lastName")}
              />
              {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="email" required>
                Email address
              </FieldLabel>
              <IconInput
                id="email"
                type="email"
                icon={Mail}
                hasError={!!errors.email}
                placeholder="Enter email address"
                {...register("email")}
              />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
            {!isEdit && (
              <div>
                <FieldLabel htmlFor="password" required>
                  Password
                </FieldLabel>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={inputClass(!!errors.password, "pr-10")}
                    placeholder="Create password"
                    autoComplete="new-password"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className={errorClass}>{errors.password.message}</p>}
              </div>
            )}
            <div>
              <FieldLabel htmlFor="department" required>
                Department
              </FieldLabel>
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <Select
                    id="department"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={departmentOptions}
                    placeholder="Department name"
                    invalid={!!errors.department}
                    aria-label="Department"
                    leadingIcon={Briefcase}
                  />
                )}
              />
              {errors.department && <p className={errorClass}>{errors.department.message}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="designation" required>
                Designation
              </FieldLabel>
              <IconInput
                id="designation"
                icon={Briefcase}
                hasError={!!errors.designation}
                placeholder="Enter designation"
                {...register("designation")}
              />
              {errors.designation && <p className={errorClass}>{errors.designation.message}</p>}
            </div>
          </div>
        </Card>

        <div className={`grid grid-cols-1 gap-6 ${isManager || isEdit ? "" : "lg:grid-cols-2"}`}>
          <Card icon={ShieldCheck} title="Role & Access">
            <FieldLabel htmlFor="role" required={!isEdit}>
              Role
            </FieldLabel>
            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? "The role this member was created with."
                : "Select the role that defines this member's permissions."}
            </p>
            <div className="mt-3">
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    id="role"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={roleSelectOptions}
                    placeholder="Select a role"
                    invalid={!!errors.role}
                    aria-label="Role"
                    disabled={isEdit}
                    leadingIcon={ShieldCheck}
                  />
                )}
              />
            </div>
            {errors.role && <p className={errorClass}>{errors.role.message}</p>}
            {isEdit && <p className={lockedClass}>Role changes aren&apos;t supported yet.</p>}
          </Card>

          {!isManager && !isEdit && (
            <Card icon={Building2} title="Company Assignment">
              <FieldLabel required>Company</FieldLabel>
              <p className="mt-1 text-sm text-slate-500">
                Select the company this member belongs to.
              </p>

              {companiesLoading ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading companies…
                </div>
              ) : companies.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3.5 py-6 text-center text-sm text-slate-400">
                  No companies available.
                </div>
              ) : (
                <Controller
                  name="company"
                  control={control}
                  render={({ field }) => {
                    const scrolls = companies.length > 4;
                    return (
                      <div
                        className={`mt-4 ${
                          scrolls
                            ? "scrollbar-slim max-h-44 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2 [scrollbar-gutter:stable]"
                            : ""
                        }`}
                      >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {companies.map((c) => (
                            <CompanyCard
                              key={c.id}
                              selected={field.value === c.id}
                              onClick={() => field.onChange(field.value === c.id ? "" : c.id)}
                              label={c.name}
                              description={companyDescription(c)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
              )}

              <Link
                href={CREATE_COMPANY_ROUTE}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(34_34_204)] hover:underline"
              >
                <Plus className="h-4 w-4" />
                Create new company
              </Link>
            </Card>
          )}
        </div>

        <Card icon={Clock} title="Shift Timing" badge={isEdit ? undefined : "(Optional)"}>
          <p className="text-sm text-slate-500">
            {isEdit
              ? "This member's assigned shift. Shift changes aren't supported yet."
              : `Pick a shift start — the end is set automatically to ${SHIFT_HOURS} hours later.`}
          </p>

          <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div>
              <FieldLabel htmlFor="shiftStart">Shift start</FieldLabel>
              {isEdit ? (
                <div className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 pl-3.5 pr-3 text-sm font-semibold tabular-nums">
                  <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className={shiftStart ? "text-slate-700" : "text-slate-400"}>
                    {shiftStart ? formatTime12(shiftStart) : "Not set"}
                  </span>
                </div>
              ) : (
                <div className="mt-1.5">
                  <Controller
                    name="shiftStart"
                    control={control}
                    render={({ field }) => (
                      <TimePicker
                        id="shiftStart"
                        value={field.value}
                        onChange={field.onChange}
                        iconClassName="text-[rgb(34_34_204)]"
                        hasError={!!errors.shiftStart || !!errors.shiftEnd}
                      />
                    )}
                  />
                </div>
              )}
            </div>

            <div className="hidden pb-2.5 sm:flex sm:items-center sm:justify-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>

            <div>
              <FieldLabel>Shift end</FieldLabel>
              <div className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 pl-3.5 pr-3 text-sm font-semibold tabular-nums">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                <span className={shiftEnd ? "text-slate-700" : "text-slate-400"}>
                  {shiftEnd ? formatTime12(shiftEnd) : isEdit ? "Not set" : "Select time"}
                </span>
              </div>
            </div>
          </div>
          {errors.shiftStart && <p className={errorClass}>{errors.shiftStart.message}</p>}
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={listRoute}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || loadingUser}
            className="inline-flex items-center gap-2 rounded-lg bg-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[rgb(28_28_180)] disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserRoundPlus className="h-4 w-4" />
            )}
            {isEdit
              ? isSubmitting
                ? "Saving…"
                : "Save changes"
              : isSubmitting
                ? "Creating…"
                : "Create member"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AddMemberPage() {
  return (
    <Suspense fallback={<LoadingOverlay label="Loading…" />}>
      <AddMemberForm />
    </Suspense>
  );
}
