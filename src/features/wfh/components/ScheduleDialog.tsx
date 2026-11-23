"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { labelBase } from "@/components/ui/classes";
import { errorDetails, errorMessage } from "@/lib/api";
import { todayKey } from "@/lib/time/businessTime";
import { KIND_OPTIONS, PART_OPTIONS } from "@/features/leave/lib/format";
import type { LeaveKind, LeavePart } from "@/features/leave/types";
import { useSession } from "@/features/auth/hooks/useSession";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { usePeopleOptions } from "@/features/users/hooks/usePeopleOptions";
import { useSaveWfhSchedule } from "@/features/wfh/hooks/useWfh";
import {
  NOTE_MAX,
  scheduleProblems,
  scheduleText,
  WEEK_OPTIONS,
  WEEKDAY_OPTIONS,
} from "@/features/wfh/lib/format";
import type { WfhScheduleInput, WfhScheduleView } from "@/features/wfh/types";
import { FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

function emptyInput(userId: string, today: string): WfhScheduleInput {
  return {
    userId,
    weekdays: [],
    weeks: [],
    kind: "FULL_DAY",
    part: null,
    fromDate: today,
    toDate: "",
    note: "",
  };
}

function inputOf(s: WfhScheduleView): WfhScheduleInput {
  return {
    userId: s.userId,
    weekdays: s.weekdays,
    weeks: s.weeks,
    kind: s.kind,
    part: s.part,
    fromDate: s.fromDate,
    toDate: s.toDate ?? "",
    note: s.note,
  };
}

function Toggle({
  on,
  label,
  onClick,
  pressedLabel,
}: {
  on: boolean;
  label: string;
  pressedLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={pressedLabel}
      onClick={onClick}
      className={`min-h-10 min-w-12 rounded-lg border px-3 text-sm font-semibold ${
        on ? "border-brand bg-brand/8 text-brand" : "border-card bg-card text-soft"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Set or change a work-from-home schedule (3.5): a person, the weekdays, only
 * some weeks of the month if wanted, how much of the day, from when and until
 * when. 4.0: a Manager picks from the Staff of their departments; the organisation
 * admin from its people; the Super Manager and Super Admins from the organisation in
 * view, or every organisation (each person with theirs) on "All organisations".
 * Nobody sets their own here. A schedule that has begun is ended today and a new one
 * starts; past days keep what they were.
 */
export function ScheduleDialog({
  open,
  editing,
  presetUserId,
  onClose,
}: {
  open: boolean;
  editing: WfhScheduleView | null;
  presetUserId?: string;
  onClose: () => void;
}) {
  const today = todayKey();
  const { user } = useSession();
  const { mixed } = useOrgsInView();
  const people = usePeopleOptions(open && !editing, { excludeId: user?.id, showOrg: mixed });
  const save = useSaveWfhSchedule();
  const [form, setForm] = useState<WfhScheduleInput>(emptyInput(presetUserId ?? "", today));
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? inputOf(editing) : emptyInput(presetUserId ?? "", todayKey()));
    setTouched(false);
    setProblem(null);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, presetUserId]);

  const own = scheduleProblems(form, today, !!editing);
  const show = (k: keyof typeof own) => (touched ? own[k] : undefined);

  function set<K extends keyof WfhScheduleInput>(key: K, value: WfhScheduleInput[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "kind") {
        const kind = value as LeaveKind;
        next.part = kind === "FULL_DAY" ? null : PART_OPTIONS[kind][0].value;
      }
      return next;
    });
    setProblem(null);
  }
  const toggleIn = (key: "weekdays" | "weeks", v: number) =>
    set(
      key,
      form[key].includes(v)
        ? form[key].filter((x) => x !== v)
        : [...form[key], v].sort((a, b) => a - b),
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(own).length) return;
    try {
      const saved = await save.mutateAsync({ id: editing?.id, input: form });
      toast.success(
        editing ? `Schedule changed: ${saved.userName}` : `Schedule set: ${saved.userName}`,
        {
          description: `${saved.label}. ${saved.userName.split(" ")[0]} has been told.`,
        },
      );
      onClose();
    } catch (err) {
      setProblem({
        field: errorDetails(err)?.field as string | undefined,
        message: errorMessage(err) ?? "Couldn't save the schedule.",
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `${editing.userName}: change the schedule` : "Set a work-from-home schedule"}
      description="Scheduled days count as approved work from home; no request is needed. The person is told."
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5 sm:px-6">
        {!editing && (
          <div>
            <Label htmlFor="sched-person">Who</Label>
            <Select
              id="sched-person"
              value={form.userId}
              onValueChange={(v) => set("userId", v)}
              options={people.options}
              placeholder={people.isLoading ? "Loading people…" : "Pick a person"}
              searchable
              searchPlaceholder="Search people…"
              invalid={!!show("userId")}
              aria-label="Who"
            />
            {show("userId") && <FieldError>{show("userId")}</FieldError>}
          </div>
        )}

        <fieldset>
          <legend className={labelBase}>Weekdays at home</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_OPTIONS.map((d) => (
              <Toggle
                key={d.value}
                on={form.weekdays.includes(d.value)}
                label={d.label}
                pressedLabel={d.long}
                onClick={() => toggleIn("weekdays", d.value)}
              />
            ))}
          </div>
          {show("weekdays") && <FieldError>{show("weekdays")}</FieldError>}
        </fieldset>

        <fieldset>
          <legend className={labelBase}>
            Weeks of the month{" "}
            <span className="font-normal text-quiet">(none picked: every week)</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEK_OPTIONS.map((w) => (
              <Toggle
                key={w.value}
                on={form.weeks.includes(w.value)}
                label={w.label}
                pressedLabel={`${w.label} week`}
                onClick={() => toggleIn("weeks", w.value)}
              />
            ))}
          </div>
        </fieldset>

        <div>
          <span className={labelBase}>How much of the day</span>
          <div className="mt-1.5">
            <SegmentedTabs
              label="How much"
              value={form.kind}
              onChange={(v) => set("kind", v)}
              tabs={KIND_OPTIONS}
            />
          </div>
          {form.kind !== "FULL_DAY" && (
            <div className="mt-2.5">
              <SegmentedTabs
                label={form.kind === "HALF_DAY" ? "Which half" : "Which quarter"}
                size="sm"
                value={(form.part ?? PART_OPTIONS[form.kind][0].value) as LeavePart}
                onChange={(v) => set("part", v)}
                tabs={PART_OPTIONS[form.kind]}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sched-from">From</Label>
            <Input
              id="sched-from"
              type="date"
              value={form.fromDate}
              min={editing ? undefined : today}
              onChange={(e) => set("fromDate", e.target.value)}
              invalid={!!show("fromDate")}
              className="mt-1.5"
            />
            {show("fromDate") && <FieldError>{show("fromDate")}</FieldError>}
          </div>
          <div>
            <Label htmlFor="sched-to">
              Until <span className="font-normal text-quiet">(optional)</span>
            </Label>
            <Input
              id="sched-to"
              type="date"
              value={form.toDate}
              min={form.fromDate || today}
              onChange={(e) => set("toDate", e.target.value)}
              invalid={!!show("toDate")}
              className="mt-1.5"
            />
            {show("toDate") && <FieldError>{show("toDate")}</FieldError>}
          </div>
        </div>

        <div>
          <Label htmlFor="sched-note">
            Note <span className="font-normal text-quiet">(optional)</span>
          </Label>
          <Input
            id="sched-note"
            value={form.note}
            maxLength={NOTE_MAX}
            placeholder="Agreed for the move"
            onChange={(e) => set("note", e.target.value)}
            className="mt-1.5"
          />
        </div>

        <p className="rounded-xl border border-brand/20 bg-brand/4 px-3.5 py-2.5 text-sm text-body">
          {scheduleText(form.weekdays, form.weeks)},{" "}
          {KIND_OPTIONS.find((k) => k.value === form.kind)?.label.toLowerCase()}
          {form.kind !== "FULL_DAY" && form.part
            ? ` (${PART_OPTIONS[form.kind].find((p) => p.value === form.part)?.label.toLowerCase()})`
            : ""}
          {editing && editing.fromDate <= today
            ? ". The old schedule ends today; this one starts from the next free day."
            : "."}
        </p>
        {problem && <FieldError>{problem.message}</FieldError>}
        <Hint>
          Days off and leave are never work from home; a request on a scheduled day is refused.
        </Hint>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {editing ? "Save changes" : "Set schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
