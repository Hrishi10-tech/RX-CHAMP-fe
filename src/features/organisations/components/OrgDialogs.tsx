"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import {
  btnPrimary,
  btnSecondary,
  errorText,
  hintBase,
  inputBase,
  inputInvalid,
  labelBase,
} from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { PASSWORD_RULE, newPasswordProblem } from "@/features/auth/lib/passwordRules";
import {
  useCreateOrganisation,
  useCreateOrganisationAdmin,
  useRenameOrganisation,
} from "@/features/organisations/hooks/useOrganisations";
import type { OrganisationView } from "@/features/organisations/types";

/** Add an organisation, or rename one. */
export function OrgNameDialog({
  open,
  organisation,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** null to add a new one. */
  organisation: Pick<OrganisationView, "id" | "name"> | null;
  onClose: () => void;
  onCreated?: (org: OrganisationView) => void;
}) {
  const id = useId();
  const create = useCreateOrganisation();
  const rename = useRenameOrganisation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busy = create.isPending || rename.isPending;

  useEffect(() => {
    if (open) {
      setName(organisation?.name ?? "");
      setError(null);
    }
  }, [open, organisation]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      setError("Use 2 to 80 characters.");
      return;
    }
    try {
      if (organisation) {
        await rename.mutateAsync({ id: organisation.id, name: trimmed });
        toast.success("Organisation renamed", { description: trimmed });
      } else {
        const org = await create.mutateAsync(trimmed);
        toast.success("Organisation added", {
          description: `${trimmed}. Create its Admin next.`,
        });
        onCreated?.(org);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err) ?? "Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={organisation ? "Rename organisation" : "Add organisation"}
      description={
        organisation
          ? undefined
          : "Each organisation is a separate space with its own Admin, people and settings."
      }
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        <div>
          <label htmlFor={id} className={labelBase}>
            Name
          </label>
          <input
            id={id}
            data-autofocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Xelements Health"
            aria-invalid={Boolean(error)}
            className={`${inputBase} mt-1.5 ${error ? inputInvalid : ""}`}
          />
          {error && <p className={errorText}>{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {organisation ? "Save" : "Add organisation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const EMPTY_ADMIN = { firstName: "", lastName: "", email: "", password: "" };

/** SPEC 5.1: create the organisation's one Admin (409 ADMIN_EXISTS when it has one). */
export function CreateAdminDialog({
  organisation,
  onClose,
}: {
  organisation: Pick<OrganisationView, "id" | "name"> | null;
  onClose: () => void;
}) {
  const uid = useId();
  const create = useCreateOrganisationAdmin();
  const [values, setValues] = useState(EMPTY_ADMIN);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY_ADMIN, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (organisation) {
      setValues(EMPTY_ADMIN);
      setErrors({});
      setFormError(null);
    }
  }, [organisation]);

  function set<K extends keyof typeof EMPTY_ADMIN>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!organisation) return;
    const next: typeof errors = {};
    if (!values.firstName.trim()) next.firstName = "Enter a first name.";
    if (!values.lastName.trim()) next.lastName = "Enter a last name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Enter a valid email.";
    const pw = newPasswordProblem(values.password);
    if (pw) next.password = pw;
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await create.mutateAsync({
        id: organisation.id,
        input: {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          password: values.password,
        },
      });
      toast.success("Admin created", {
        description: `${values.firstName.trim()} can sign in to ${organisation.name} now.`,
      });
      onClose();
    } catch (err) {
      const code = errorCode(err);
      if (code === "ADMIN_EXISTS") {
        setFormError(`${organisation.name} already has an Admin.`);
      } else if (code === "EMAIL_IN_USE" || /already in use/i.test(errorMessage(err) ?? "")) {
        setErrors((e) => ({ ...e, email: "This email is already in use." }));
      } else {
        setFormError(errorMessage(err) ?? "Please try again.");
      }
    }
  }

  const field = (key: keyof typeof EMPTY_ADMIN, label: string, type = "text") => (
    <div>
      <label htmlFor={`${uid}-${key}`} className={labelBase}>
        {label}
      </label>
      <input
        id={`${uid}-${key}`}
        type={type}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        autoComplete="off"
        aria-invalid={Boolean(errors[key])}
        className={`${inputBase} mt-1.5 ${errors[key] ? inputInvalid : ""}`}
      />
      {errors[key] && <p className={errorText}>{errors[key]}</p>}
    </div>
  );

  return (
    <Modal
      open={organisation !== null}
      onClose={() => !create.isPending && onClose()}
      title="Create admin"
      description={
        organisation
          ? `The one Admin of ${organisation.name}: manages its people, settings and approvals.`
          : undefined
      }
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {formError}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("firstName", "First name")}
          {field("lastName", "Last name")}
        </div>
        {field("email", "Email", "email")}
        <div>
          <label htmlFor={`${uid}-password`} className={labelBase}>
            Password
          </label>
          <PasswordField
            id={`${uid}-password`}
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className={errorText}>{errors.password}</p>
          ) : (
            <p className={hintBase}>{PASSWORD_RULE} Share it with them privately.</p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Create admin
          </button>
        </div>
      </form>
    </Modal>
  );
}
