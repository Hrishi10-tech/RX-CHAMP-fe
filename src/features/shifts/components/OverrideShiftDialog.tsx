"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { inputInvalid } from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { formatDay, formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { formatHmRange } from "@/features/shifts/lib/time";
import { useAssignPeople } from "@/features/shifts/hooks/useAssignments";
import {
  FALLBACK_SHIFT,
  PERSON_FALLBACK_OPTION,
  shiftSelectOptions,
} from "@/features/shifts/components/shiftOptions";
import type { AssignPeopleResult, ShiftView } from "@/features/shifts/types";
import { Button } from "@/components/ui/Button";
import { FieldError, Hint, Input, Label } from "@/components/ui/Field";

export interface OverridePerson {
  id: string;
  name: string;
}

function who(people: OverridePerson[]): string {
  if (people.length === 1) return people[0].name;
  return `${people.length} people`;
}

/**
 * Puts one or more people on a different shift for a period (or back on their
 * department's). Shows who the server skipped, and why, before closing.
 */
export function OverrideShiftDialog({
  people,
  initialShiftId,
  shifts,
  onClose,
  onDone,
}: {
  /** Who to change; null closes the dialog. */
  people: OverridePerson[] | null;
  /** Preselect a choice, e.g. FALLBACK_SHIFT for "Back to department". */
  initialShiftId?: string;
  shifts: ShiftView[] | undefined;
  onClose: () => void;
  /** After a successful save (some or all applied). */
  onDone?: (result: AssignPeopleResult) => void;
}) {
  const today = todayKey();
  const open = people !== null && people.length > 0;
  const [shiftId, setShiftId] = useState("");
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState("");
  const [errors, setErrors] = useState<{ shift?: string; from?: string; until?: string }>({});
  const [result, setResult] = useState<AssignPeopleResult | null>(null);
  const assign = useAssignPeople();

  useEffect(() => {
    if (!open) return;
    setShiftId(initialShiftId ?? "");
    setFrom(todayKey());
    setUntil("");
    setErrors({});
    setResult(null);
    assign.reset();
    // Reset each time it opens for someone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, people, initialShiftId]);

  const options = useMemo(() => [PERSON_FALLBACK_OPTION, ...shiftSelectOptions(shifts)], [shifts]);
  const chosen = shifts?.find((s) => s.id === shiftId);
  const back = shiftId === FALLBACK_SHIFT;
  const pending = assign.isPending;
  const names = new Map((people ?? []).map((p) => [p.id, p.name]));

  function close() {
    if (!pending) onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!people?.length) return;
    const found: typeof errors = {};
    if (!shiftId) found.shift = "Pick a shift.";
    if (!from) found.from = "Pick the first day.";
    else if (from < today) found.from = "Pick today or a later day. Past days keep their shift.";
    if (until && from && until < from) found.until = "The last day can't be before the first.";
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      const res = await assign.mutateAsync({
        userIds: people.map((p) => p.id),
        shiftId: back ? null : shiftId,
        effectiveFrom: from,
        effectiveTo: !back && until ? until : undefined,
      });
      onDone?.(res);
      if (res.skipped.length === 0) {
        toast.success(back ? "Back to department shift" : "Shift overridden", {
          description: `${res.assigned.length} ${res.assigned.length === 1 ? "person" : "people"} updated from ${formatDayWithWeekday(from)}.`,
        });
        onClose();
      } else {
        setResult(res);
      }
    } catch (err) {
      const message = errorMessage(err) ?? "Please try again.";
      if (errorCode(err) === "DATE_IN_PAST") setErrors({ from: message });
      else toast.error("Couldn't change the shift", { description: message });
    }
  }

  const preview =
    people && shiftId && from
      ? back
        ? `From ${formatDayWithWeekday(from)}, ${who(people)} ${
            people.length === 1 ? "goes" : "go"
          } back to the department's shift.`
        : `From ${formatDayWithWeekday(from)}${until ? ` until ${formatDayWithWeekday(until)}` : ""}, ${who(
            people,
          )} ${people.length === 1 ? "works" : "work"} ${chosen?.name ?? "this shift"}${
            chosen ? ` (${formatHmRange(chosen.start, chosen.end)})` : ""
          }. ${until ? "Then back to the department's shift." : "With no end date, it stays until changed."}`
      : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title={people && people.length === 1 ? `Shift for ${people[0].name}` : "Override shift"}
      description={
        people && people.length > 1
          ? `For ${people.length} selected people. Their department's shift is unchanged.`
          : "Their department's shift is unchanged."
      }
      className="max-w-lg"
    >
      {result ? (
        <div className="space-y-4 px-6 py-5">
          {result.assigned.length > 0 && (
            <p className="flex items-start gap-2 text-sm text-working-ink">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-working" aria-hidden />
              {result.assigned.length} {result.assigned.length === 1 ? "person" : "people"} updated
              from {formatDay(result.effectiveFrom)}.
            </p>
          )}
          <div
            role="alert"
            className="rounded-xl border border-attention-edge bg-attention-wash p-4 text-sm text-attention-ink"
          >
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-attention" aria-hidden />
              {result.skipped.length} skipped
            </p>
            <ul className="mt-2 space-y-1">
              {result.skipped.map((s) => (
                <li key={s.id}>
                  <span className="font-semibold">{names.get(s.id) ?? "Someone"}</span>: {s.reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end border-t border-divider pt-4">
            <Button variant="primary" type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
          <div>
            <Label htmlFor="ovr-shift">Shift</Label>
            <Select
              id="ovr-shift"
              value={shiftId}
              onValueChange={setShiftId}
              options={options}
              placeholder="Pick a shift"
              aria-label="Shift"
              invalid={!!errors.shift}
              disabled={pending}
            />
            {errors.shift && <FieldError>{errors.shift}</FieldError>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ovr-from">From</Label>
              <Input
                id="ovr-from"
                type="date"
                min={today}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-invalid={!!errors.from || undefined}
                aria-describedby="ovr-from-hint"
                disabled={pending}
                className={`mt-1.5 ${errors.from ? inputInvalid : ""}`}
              />
              <Hint id="ovr-from-hint" error={errors.from}>
                {errors.from ?? "Today or later."}
              </Hint>
            </div>
            {!back && (
              <div>
                <Label htmlFor="ovr-until">
                  Until <span className="font-normal text-quiet">(optional)</span>
                </Label>
                <Input
                  id="ovr-until"
                  type="date"
                  min={from || today}
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  aria-invalid={!!errors.until || undefined}
                  aria-describedby="ovr-until-hint"
                  disabled={pending}
                  className={`mt-1.5 ${errors.until ? inputInvalid : ""}`}
                />
                <Hint id="ovr-until-hint" error={errors.until}>
                  {errors.until ?? "Last day on this shift."}
                </Hint>
              </div>
            )}
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
      )}
    </Modal>
  );
}
