"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Briefcase, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/types";
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
import { DEPARTMENT_NAMES } from "@/constants/departments";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { formatHmRange } from "@/features/shifts/lib/time";
import { useAssignDepartment } from "@/features/shifts/hooks/useAssignments";
import {
  FALLBACK_SHIFT,
  departmentFallbackOption,
  shiftSelectOptions,
} from "@/features/shifts/components/shiftOptions";
import type { DepartmentAssignmentView, ShiftView } from "@/features/shifts/types";

/**
 * Sets a department's shift from a day onward. Opened from a department's row
 * (department fixed) or from "Set a department's shift" (pick one, including a
 * department nobody is in yet).
 */
export function AssignDepartmentDialog({
  open,
  row,
  departments,
  shifts,
  onClose,
}: {
  open: boolean;
  /** The department being changed; null to pick one in the dialog. */
  row: DepartmentAssignmentView | null;
  departments: DepartmentAssignmentView[];
  shifts: ShiftView[] | undefined;
  onClose: () => void;
}) {
  const today = todayKey();
  const [department, setDepartment] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [from, setFrom] = useState(today);
  const [errors, setErrors] = useState<{ department?: string; shift?: string; from?: string }>({});
  const assign = useAssignDepartment();

  useEffect(() => {
    if (!open) return;
    setDepartment(row?.department ?? "");
    setShiftId(row?.current?.shift?.id ?? (row?.current ? FALLBACK_SHIFT : ""));
    setFrom(todayKey());
    setErrors({});
    assign.reset();
    // Reset each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  const departmentOptions = useMemo<SelectOption[]>(() => {
    const names = new Map<string, string>();
    for (const d of departments) names.set(d.department.toLowerCase(), d.department);
    for (const d of DEPARTMENT_NAMES)
      if (!names.has(d.toLowerCase())) names.set(d.toLowerCase(), d);
    return [...names.values()]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name, icon: Briefcase }));
  }, [departments]);

  const defaultShift = shifts?.find((s) => s.isDefault);
  const shiftOptions = useMemo(
    () => [departmentFallbackOption(defaultShift), ...shiftSelectOptions(shifts)],
    [shifts, defaultShift],
  );

  const chosen = shifts?.find((s) => s.id === shiftId);
  const target =
    row ?? departments.find((d) => d.department.toLowerCase() === department.toLowerCase());
  const pending = assign.isPending;

  function close() {
    if (!pending) onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!department.trim()) found.department = "Pick a department.";
    if (!shiftId) found.shift = "Pick a shift.";
    if (!from) found.from = "Pick the first day.";
    else if (from < today) found.from = "Pick today or a later day. Past days keep their shift.";
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      await assign.mutateAsync({
        department: department.trim(),
        companyId: target?.companyId ?? undefined,
        shiftId: shiftId === FALLBACK_SHIFT ? null : shiftId,
        effectiveFrom: from,
      });
      toast.success("Department shift saved", {
        description: `${department.trim()}: ${
          chosen ? chosen.name : "the default shift"
        } from ${formatDayWithWeekday(from)}.`,
      });
      onClose();
    } catch (err) {
      const message = errorMessage(err) ?? "Please try again.";
      if (errorCode(err) === "DATE_IN_PAST") setErrors({ from: message });
      else toast.error("Couldn't set the department's shift", { description: message });
    }
  }

  const preview =
    department.trim() && shiftId && from
      ? `From ${formatDayWithWeekday(from)}, ${department.trim()} works ${
          chosen
            ? `${chosen.name} (${formatHmRange(chosen.start, chosen.end)})`
            : `the default shift${defaultShift ? ` (${defaultShift.name})` : ""}`
        }. People with a personal override keep it.`
      : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={row ? `Shift for ${row.department}` : "Set a department's shift"}
      description="Applies from the day you pick. Past days keep the shift they had."
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        {!row && (
          <div>
            <label htmlFor="dept-name" className={labelBase}>
              Department
            </label>
            <Select
              id="dept-name"
              value={department}
              onValueChange={setDepartment}
              options={departmentOptions}
              placeholder="Pick a department"
              aria-label="Department"
              searchable
              searchPlaceholder="Search departments…"
              invalid={!!errors.department}
              leadingIcon={Briefcase}
              disabled={pending}
            />
            {errors.department && <p className={errorText}>{errors.department}</p>}
          </div>
        )}

        <div>
          <label htmlFor="dept-shift" className={labelBase}>
            Shift
          </label>
          <Select
            id="dept-shift"
            value={shiftId}
            onValueChange={setShiftId}
            options={shiftOptions}
            placeholder="Pick a shift"
            aria-label="Shift"
            invalid={!!errors.shift}
            disabled={pending}
          />
          {errors.shift && <p className={errorText}>{errors.shift}</p>}
        </div>

        <div>
          <label htmlFor="dept-from" className={labelBase}>
            From
          </label>
          <input
            id="dept-from"
            type="date"
            min={today}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-invalid={!!errors.from || undefined}
            aria-describedby="dept-from-hint"
            disabled={pending}
            className={`${inputBase} mt-1.5 ${errors.from ? inputInvalid : ""}`}
          />
          <p id="dept-from-hint" className={errors.from ? errorText : hintBase}>
            {errors.from ?? "Today or later."}
          </p>
        </div>

        {preview && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            {preview}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={pending} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
