"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Briefcase, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/types";
import { inputInvalid, labelBase } from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { DEPARTMENT_NAMES } from "@/constants/departments";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { formatHmRange } from "@/features/shifts/lib/time";
import { useAssignDepartment } from "@/features/shifts/hooks/useAssignments";
import type { DepartmentAssignmentView, ShiftView } from "@/features/shifts/types";
import { Checkbox, FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/**
 * Sets a department's shifts from a day onward: tick one or more. With several, each
 * person gets the one that's on when they press Start Day; the earliest-starting one
 * counts on days nobody started. Opened from a department's row (department fixed) or
 * from "Set a department's shift" (pick one, including a department nobody is in yet).
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
  const [from, setFrom] = useState(today);
  const [ids, setIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ department?: string; shift?: string; from?: string }>({});
  const assign = useAssignDepartment();

  useEffect(() => {
    if (!open) return;
    setDepartment(row?.department ?? "");
    setFrom(todayKey());
    const current = row?.current?.shift?.id;
    setIds([
      ...(current ? [current] : []),
      ...(row?.extraShifts ?? []).map((s) => s.id).filter((id) => id !== current),
    ]);
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

  const target =
    row ?? departments.find((d) => d.department.toLowerCase() === department.toLowerCase());
  /** 4.1: only a shared-computer department may hold more than one shift. */
  const shared = !!target?.sharedComputer;
  /** Ticked shifts, earliest start first: the first one is the department's main shift. */
  const chosen = useMemo(() => {
    const ticked = (shifts ?? [])
      .filter((s) => ids.includes(s.id))
      .sort((a, b) => a.start.localeCompare(b.start));
    return shared ? ticked : ticked.slice(0, 1);
  }, [shifts, ids, shared]);
  const pending = assign.isPending;

  function close() {
    if (!pending) onClose();
  }

  function toggle(id: string) {
    if (!shared) {
      // One shift: ticking another one replaces it.
      setIds(chosen[0]?.id === id ? [] : [id]);
      return;
    }
    setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  const names = chosen.map((s) => `${s.name} (${formatHmRange(s.start, s.end)})`).join(", ");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (!department.trim()) found.department = "Pick a department.";
    if (!chosen.length) found.shift = "Tick at least one shift.";
    if (!from) found.from = "Pick the first day.";
    else if (from < today) found.from = "Pick today or a later day. Past days keep their shift.";
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      await assign.mutateAsync({
        department: department.trim(),
        companyId: target?.companyId ?? undefined,
        shiftId: chosen[0].id,
        effectiveFrom: from,
        extraShiftIds: chosen.slice(1).map((s) => s.id),
      });
      toast.success("Department shifts saved", {
        description: `${department.trim()}: ${chosen.map((s) => s.name).join(", ")} from ${formatDayWithWeekday(from)}.`,
      });
      onClose();
    } catch (err) {
      const message = errorMessage(err) ?? "Please try again.";
      if (errorCode(err) === "DATE_IN_PAST") setErrors({ from: message });
      else toast.error("Couldn't set the department's shifts", { description: message });
    }
  }

  const preview =
    department.trim() && chosen.length && from
      ? `From ${formatDayWithWeekday(from)}, ${department.trim()} works ${names}.${
          chosen.length > 1
            ? " Each person gets the shift that's on when they press Start Day (in a gap, the next one)."
            : ""
        } People with a personal override keep it.`
      : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={row ? `Shifts for ${row.department}` : "Set a department's shifts"}
      description="Applies from the day you pick. Past days keep the shift they had."
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        {!row && (
          <div>
            <Label htmlFor="dept-name">Department</Label>
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
            {errors.department && <FieldError>{errors.department}</FieldError>}
          </div>
        )}

        <fieldset>
          <legend className={labelBase}>Shifts</legend>
          <Hint>
            {shared
              ? "Tick one or more. With several, each person gets the shift that's on when they press Start Day; in a gap, the next one."
              : "Pick one shift. To give a department several shifts, turn on Shared computer for it on the Departments page."}
          </Hint>
          <div
            className={`mt-2 max-h-56 space-y-1.5 overflow-y-auto rounded-xl border px-3 py-2 ${
              errors.shift ? "border-attention-edge-strong" : "border-card"
            }`}
          >
            {(shifts ?? []).length === 0 && (
              <p className="text-sm text-quiet">No shifts yet. Create one first.</p>
            )}
            {(shifts ?? []).map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-body"
              >
                <Checkbox
                  checked={chosen.some((c) => c.id === s.id)}
                  onChange={() => toggle(s.id)}
                  disabled={pending}
                />
                <span>
                  {s.name} <span className="text-quiet">({formatHmRange(s.start, s.end)})</span>
                </span>
              </label>
            ))}
          </div>
          {errors.shift && <FieldError>{errors.shift}</FieldError>}
        </fieldset>

        <div>
          <Label htmlFor="dept-from">From</Label>
          <Input
            id="dept-from"
            type="date"
            min={today}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-invalid={!!errors.from || undefined}
            aria-describedby="dept-from-hint"
            disabled={pending}
            className={`mt-1.5 ${errors.from ? inputInvalid : ""}`}
          />
          <Hint id="dept-from-hint" error={errors.from}>
            {errors.from ?? "Today or later."}
          </Hint>
        </div>

        {preview && (
          <p className="rounded-xl bg-fill px-4 py-3 text-sm leading-relaxed text-soft">
            {preview}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-divider pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
