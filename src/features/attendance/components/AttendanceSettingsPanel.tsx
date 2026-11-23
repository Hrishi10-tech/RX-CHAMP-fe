"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorDetails, errorMessage } from "@/lib/api";
import {
  useBiometricSettings,
  useSaveBiometricSettings,
} from "@/features/attendance/hooks/useAttendance";
import type {
  BiometricSettingsPatch,
  BiometricSettingsView,
  GapRule,
  MissingCheckoutRule,
} from "@/features/attendance/types";
import { Card } from "@/components/ui/Card";
import { FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

interface Form {
  gapRule: GapRule;
  missingCheckout: MissingCheckoutRule;
  duplicateWindowSec: string;
  pushInWords: string;
  pushOutWords: string;
}

function formOf(s: BiometricSettingsView): Form {
  return {
    gapRule: s.gapRule,
    missingCheckout: s.missingCheckout,
    duplicateWindowSec: String(s.duplicateWindowSec),
    pushInWords: s.pushInWords.join(", "),
    pushOutWords: s.pushOutWords.join(", "),
  };
}
const parseWords = (s: string) =>
  s
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 20);

/**
 * How a biometric day is worked out from its punches (3.5). 4.0: the organisation's
 * own rules, changed by its admin; the Super Manager reads them.
 */
export function AttendanceSettingsPanel({ canEdit }: { canEdit: boolean }) {
  const q = useBiometricSettings();
  const save = useSaveBiometricSettings();
  const [form, setForm] = useState<Form | null>(null);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  useEffect(() => {
    if (q.data) setForm(formOf(q.data));
  }, [q.data]);
  if (q.isLoading || (!form && !q.isError)) return <LoadingState label="Loading the settings…" />;
  if (q.isError || !q.data || !form)
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const s = q.data;

  const patch: BiometricSettingsPatch = {};
  if (form.gapRule !== s.gapRule) patch.gapRule = form.gapRule;
  if (form.missingCheckout !== s.missingCheckout) patch.missingCheckout = form.missingCheckout;
  if (Number(form.duplicateWindowSec) !== s.duplicateWindowSec)
    patch.duplicateWindowSec = Number(form.duplicateWindowSec);
  if (parseWords(form.pushInWords).join("|") !== s.pushInWords.join("|"))
    patch.pushInWords = parseWords(form.pushInWords);
  if (parseWords(form.pushOutWords).join("|") !== s.pushOutWords.join("|"))
    patch.pushOutWords = parseWords(form.pushOutWords);
  const dirty = Object.keys(patch).length > 0;

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setProblem(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    try {
      await save.mutateAsync(patch);
      toast.success("Attendance settings saved", {
        description: "Days are worked out with the new rules as punches arrive.",
      });
    } catch (err) {
      setProblem({
        field: errorDetails(err)?.field as string | undefined,
        message: errorMessage(err) ?? "Couldn't save.",
      });
    }
  }

  return (
    <Card as="form" onSubmit={submit} noValidate className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-base font-bold text-primary">How a biometric day is worked out</h2>
        <p className="text-sm text-quiet">
          {canEdit
            ? "These apply to every biometric person in this organisation."
            : "These apply to every biometric person in this organisation. Only the organisation admin changes them."}
        </p>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="att-gap">Time between a check-out and the next check-in</Label>
          <Select
            id="att-gap"
            value={form.gapRule}
            onValueChange={(v) => set("gapRule", v as GapRule)}
            options={[
              { value: "SPAN", label: "Counts as work (first punch to last)" },
              { value: "PAIRS", label: "Does not count (in to out, gaps left out)" },
            ]}
            disabled={!canEdit}
            aria-label="Gap rule"
          />
          <Hint error={problem?.field === "gapRule"}>
            {problem?.field === "gapRule"
              ? problem.message
              : "As asked: focus runs from the first punch of the day to the last, with no break taken off. Switch to pairs to leave the gaps out; punches with no direction then alternate in, out, in."}
          </Hint>
        </div>
        <div>
          <Label htmlFor="att-missing">A day with no check-out closes at</Label>
          <Select
            id="att-missing"
            value={form.missingCheckout}
            onValueChange={(v) => set("missingCheckout", v as MissingCheckoutRule)}
            options={[
              { value: "LAST_PUNCH", label: "The last punch" },
              { value: "SHIFT_END", label: "The shift end" },
            ]}
            disabled={!canEdit}
            aria-label="Missing check-out"
          />
          <Hint error={problem?.field === "missingCheckout"}>
            {problem?.field === "missingCheckout"
              ? problem.message
              : "Once the shift end plus the organisation's automatic close (Settings, Rules, Forgotten End Day) has passed. The day is marked and the person and their manager are told."}
          </Hint>
        </div>
        <div>
          <Label htmlFor="att-dup">Duplicate punches within (seconds)</Label>
          <Input
            id="att-dup"
            type="number"
            inputMode="numeric"
            min={s.bounds.duplicateWindowSec?.min ?? 0}
            max={s.bounds.duplicateWindowSec?.max ?? 600}
            value={form.duplicateWindowSec}
            disabled={!canEdit}
            onChange={(e) => set("duplicateWindowSec", e.target.value)}
            className="mt-1.5"
          />
          <Hint error={problem?.field === "duplicateWindowSec"}>
            {problem?.field === "duplicateWindowSec"
              ? problem.message
              : "A finger held on the reader: punches this close together, the same way, are one punch."}
          </Hint>
        </div>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="att-in">Pushed check-in words</Label>
            <Input
              id="att-in"
              value={form.pushInWords}
              disabled={!canEdit}
              onChange={(e) => set("pushInWords", e.target.value)}
              placeholder="0, C/In"
              className="mt-1.5 font-mono text-xs"
            />
            <Hint error={problem?.field === "pushInWords"}>
              {problem?.field === "pushInWords"
                ? problem.message
                : "Besides IN, in, check-in, entry. Comma separated, up to 20. Anything else is a punch with no direction."}
            </Hint>
          </div>
          <div>
            <Label htmlFor="att-out">Pushed check-out words</Label>
            <Input
              id="att-out"
              value={form.pushOutWords}
              disabled={!canEdit}
              onChange={(e) => set("pushOutWords", e.target.value)}
              placeholder="1, C/Out"
              className="mt-1.5 font-mono text-xs"
            />
            {problem?.field === "pushOutWords" && <FieldError>{problem.message}</FieldError>}
          </div>
        </div>
      </fieldset>
      {problem && !problem.field && <FieldError>{problem.message}</FieldError>}
      {canEdit && (
        <div className="flex justify-end">
          <Button variant="primary" type="submit" disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save settings
          </Button>
        </div>
      )}
    </Card>
  );
}
