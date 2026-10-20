"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import {
  btnPrimary,
  btnSecondary,
  errorText,
  inputBase,
  inputInvalid,
  labelBase,
} from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { DepartmentIconPicker } from "@/features/departments/components/DepartmentIconPicker";
import { useSaveDepartment } from "@/features/departments/hooks/useDepartments";
import {
  DEFAULT_DEPARTMENT_ICON,
  nameSuggestions,
  normalizeName,
  suggestIcon,
} from "@/features/departments/lib/icons";
import type { DepartmentView } from "@/features/departments/types";

export const MAX_DEPARTMENT_NAME = 60;

/** Name rules from SPEC 2.1: 1 to 60 characters, unique ignoring case and spacing. */
export function validateDepartmentName(name: string, others: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Give the department a name.";
  if (trimmed.length > MAX_DEPARTMENT_NAME) return `Use at most ${MAX_DEPARTMENT_NAME} characters.`;
  const n = normalizeName(trimmed);
  if (others.some((o) => normalizeName(o) === n))
    return "There is already a department with this name.";
  return null;
}

/** Add or edit a department: a name (with suggestions) and an icon from the themed grid. */
export function DepartmentDialog({
  open,
  department,
  existing,
  onClose,
}: {
  open: boolean;
  /** null to add a new one. */
  department: DepartmentView | null;
  existing: DepartmentView[];
  onClose: () => void;
}) {
  const nameId = useId();
  const save = useSaveDepartment();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(DEFAULT_DEPARTMENT_ICON);
  const [iconChosen, setIconChosen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(department?.name ?? "");
    setIcon(department?.icon ?? DEFAULT_DEPARTMENT_ICON);
    setIconChosen(Boolean(department));
    setError(null);
  }, [open, department]);

  const others = existing.filter((d) => d.id !== department?.id).map((d) => d.name);
  const suggestions = department ? [] : nameSuggestions(name, others);

  function changeName(next: string) {
    setName(next);
    setError(null);
    // Until someone picks an icon themselves, the icon follows the name.
    if (!iconChosen) setIcon(suggestIcon(next));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateDepartmentName(name, others);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await save.mutateAsync({ id: department?.id, input: { name: name.trim(), icon } });
      toast.success(department ? "Department saved" : "Department added", {
        description: name.trim(),
      });
      onClose();
    } catch (err) {
      if (errorCode(err) === "DEPARTMENT_EXISTS") {
        setError("There is already a department with this name.");
        return;
      }
      toast.error("Couldn't save the department", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !save.isPending && onClose()}
      title={department ? "Edit department" : "Add department"}
      description="People are grouped by department; managers look after one or more."
      className="max-w-xl"
    >
      <form onSubmit={submit} noValidate className="space-y-5 px-6 py-5">
        <div className="flex items-start gap-4">
          <DepartmentIcon icon={icon} size="lg" />
          <div className="min-w-0 flex-1">
            <label htmlFor={nameId} className={labelBase}>
              Name
            </label>
            <input
              id={nameId}
              data-autofocus
              value={name}
              maxLength={MAX_DEPARTMENT_NAME + 10}
              onChange={(e) => changeName(e.target.value)}
              placeholder="e.g. Hardware"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${nameId}-error` : undefined}
              className={`${inputBase} mt-1.5 ${error ? inputInvalid : ""}`}
            />
            {error && (
              <p id={`${nameId}-error`} className={errorText}>
                {error}
              </p>
            )}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-[rgb(34_34_204)]" aria-hidden />
              Suggestions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    setName(s.name);
                    setIcon(s.icon);
                    setIconChosen(true);
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 transition hover:border-[rgba(34,34,204,0.4)] hover:bg-[rgba(34,34,204,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
                >
                  <DepartmentIcon icon={s.icon} size="xs" />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={labelBase}>Icon</p>
          <div className="mt-2 max-h-[46vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:max-h-none">
            <DepartmentIconPicker
              value={icon}
              onChange={(key) => {
                setIcon(key);
                setIconChosen(true);
              }}
              label="Department icon"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {department ? "Save" : "Add department"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
