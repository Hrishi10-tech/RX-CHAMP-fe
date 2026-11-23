"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/Select";
import { cardBase } from "@/components/ui/classes";
import { Button } from "@/components/ui/Button";
import { FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { errorMessage } from "@/lib/api";
import { useSaveSaturdays } from "@/features/calendar/hooks/useCalendar";
import {
  SATURDAY_OPTIONS,
  SATURDAY_RULE_LABEL,
  saturdayAnchorProblem,
} from "@/features/calendar/lib/calendar";
import type { CalendarView, SaturdayRule } from "@/features/calendar/types";

/**
 * 3.5: how the organisation works the Saturdays in its week pattern (every one,
 * 2nd and 4th off, alternate weeks...). Departments and people with a week of
 * their own carry their own rule.
 */
export function SaturdayRuleCard({
  view,
  editable,
}: {
  view: Pick<CalendarView, "weekPattern" | "saturdays" | "saturdayAnchor" | "saturdaysLabel">;
  editable: boolean;
}) {
  const id = useId();
  const [rule, setRule] = useState<SaturdayRule>(view.saturdays);
  const [anchor, setAnchor] = useState(view.saturdayAnchor ?? "");
  const [touched, setTouched] = useState(false);
  const save = useSaveSaturdays();

  // A fresh calendar (another year, a save) resets the draft.
  useEffect(() => {
    setRule(view.saturdays);
    setAnchor(view.saturdayAnchor ?? "");
    setTouched(false);
  }, [view.saturdays, view.saturdayAnchor]);

  const changed =
    rule !== view.saturdays || (rule === "ALTERNATE" && anchor !== (view.saturdayAnchor ?? ""));
  const problem = saturdayAnchorProblem(rule, anchor);
  const saturdayWorked = view.weekPattern.includes(6);

  async function submit() {
    setTouched(true);
    if (problem) return;
    try {
      await save.mutateAsync({ rule, anchor: rule === "ALTERNATE" ? anchor : null });
      toast.success("Saturdays saved", { description: `${SATURDAY_RULE_LABEL[rule]}.` });
    } catch (err) {
      toast.error("Couldn't save the Saturdays", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  return (
    <section
      className={`${cardBase} flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between`}
      aria-labelledby={`${id}-title`}
    >
      <div className="min-w-0 lg:max-w-md">
        <h2 id={`${id}-title`} className="text-sm font-bold text-primary">
          Saturdays
        </h2>
        <p className="text-xs text-quiet">
          {saturdayWorked
            ? "Which Saturdays of the working week are worked. Departments and people with a week of their own follow theirs."
            : "Saturday isn't in the working week now, so every Saturday is off. The rule applies whenever Saturday is in it."}
        </p>
        {!editable && (
          <p className="mt-1.5 text-sm font-semibold text-strong">{view.saturdaysLabel}</p>
        )}
      </div>
      {editable && (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
          <div className="sm:w-72">
            <label htmlFor={`${id}-rule`} className="sr-only">
              Saturday rule
            </label>
            <Select
              id={`${id}-rule`}
              aria-label="Saturday rule"
              value={rule}
              onValueChange={(v) => setRule(v as SaturdayRule)}
              options={SATURDAY_OPTIONS}
              disabled={save.isPending}
            />
          </div>
          {rule === "ALTERNATE" && (
            <div className="sm:w-48">
              <Label htmlFor={`${id}-anchor`}>One Saturday that is worked</Label>
              <Input
                id={`${id}-anchor`}
                type="date"
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                className="mt-1.5"
              />
              {touched && problem ? (
                <FieldError>{problem}</FieldError>
              ) : (
                <Hint>Every second Saturday from it is worked.</Hint>
              )}
            </div>
          )}
          {changed && (
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={save.isPending}
                onClick={() => {
                  setRule(view.saturdays);
                  setAnchor(view.saturdayAnchor ?? "");
                  setTouched(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={save.isPending}
                onClick={() => void submit()}
              >
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Save Saturdays
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
