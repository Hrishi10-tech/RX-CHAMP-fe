"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { labelBase } from "@/components/ui/classes";
import { WEEKDAY_SHORT } from "@/lib/time/months";
import {
  SATURDAY_OPTIONS,
  SATURDAY_RULE_LABEL,
  lowerFirst,
  saturdayAnchorProblem,
  weekdaysText,
} from "@/features/calendar/lib/calendar";
import type { SaturdayRule, WorkWeekInput } from "@/features/calendar/types";

/** The weekdays toggled in the form: every day but Saturday, which the rule decides. */
const TOGGLED_DAYS = [1, 2, 3, 4, 5, 7];

/**
 * A working week (3.5): the weekdays worked and the Saturday rule, for a
 * department's or a person's own week. Saturday is set by the rule, never by the
 * weekday toggles (`workWeekBody` puts it in the week the API stores).
 */
export function WorkWeekForm({
  initial,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = "Save working week",
  lead,
}: {
  initial?: WorkWeekInput | null;
  onSubmit: (input: WorkWeekInput) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
  /** Something to say above the form (who it applies to). */
  lead?: ReactNode;
}) {
  const id = useId();
  const [days, setDays] = useState<number[]>(
    initial?.workDays.filter((d) => d !== 6) ?? [1, 2, 3, 4, 5],
  );
  const [saturdays, setSaturdays] = useState<SaturdayRule>(initial?.saturdays ?? "OFF_2_4");
  const [anchor, setAnchor] = useState(initial?.saturdayAnchor ?? "");
  const [touched, setTouched] = useState(false);
  const anchorProblem = saturdayAnchorProblem(saturdays, anchor);
  const daysProblem =
    !days.length && saturdays === "NONE" ? "Pick at least one working day." : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (anchorProblem || daysProblem) return;
    void onSubmit({
      workDays: days,
      saturdays,
      ...(saturdays === "ALTERNATE" ? { saturdayAnchor: anchor } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-6 py-5" noValidate>
      {lead}
      <fieldset>
        <legend className={labelBase}>Working weekdays</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOGGLED_DAYS.map((d) => {
            const on = days.includes(d);
            return (
              <ChoiceChip
                key={d}
                on={on}
                onClick={() =>
                  setDays((prev) =>
                    on ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
                  )
                }
                className="h-10 min-w-[3.25rem] rounded-xl"
              >
                {WEEKDAY_SHORT[d - 1]}
              </ChoiceChip>
            );
          })}
        </div>
        {touched && daysProblem && <FieldError>{daysProblem}</FieldError>}
      </fieldset>
      <div>
        <Label htmlFor={`${id}-saturdays`}>Saturdays</Label>
        <Select
          id={`${id}-saturdays`}
          value={saturdays}
          onValueChange={(v) => setSaturdays(v as SaturdayRule)}
          options={SATURDAY_OPTIONS}
        />
      </div>
      {saturdays === "ALTERNATE" && (
        <div>
          <Label htmlFor={`${id}-anchor`}>One Saturday that is worked</Label>
          <Input
            id={`${id}-anchor`}
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            className="mt-1.5"
          />
          <Hint error={touched && anchorProblem}>
            {touched && anchorProblem
              ? anchorProblem
              : "Every second Saturday from it is worked; the others are off."}
          </Hint>
        </div>
      )}
      <p className="rounded-xl bg-fill px-3 py-2 text-sm text-body">
        {weekdaysText(days)}; {lowerFirst(SATURDAY_RULE_LABEL[saturdays])}.
      </p>
      <div className="flex flex-col-reverse gap-2 border-t border-divider pt-4 sm:flex-row sm:justify-end">
        <Button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
