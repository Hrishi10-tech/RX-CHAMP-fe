"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnPrimary,
  btnSecondary,
  cardBase,
  checkboxBase,
  errorText,
  inputBase,
  inputInvalid,
  labelBase,
} from "@/components/ui/classes";
import { errorCode, errorDetails, errorMessage, errorStatus } from "@/lib/api";
import {
  BREAK_LABEL,
  LIMITS,
  breakInputFromDraft,
  checkDraft,
  deriveBreakTimes,
  draftFromShift,
  newShiftDraft,
  ringFromDraft,
  type BreakDraft,
  type BreakNumberField,
  type NumberField,
  type ShiftDraft,
} from "@/features/shifts/lib/draft";
import {
  formatHmRange,
  formatLength,
  isOvernight,
  isValidHm,
  shiftLengthMinutes,
} from "@/features/shifts/lib/time";
import { WEEKDAYS, toggleWorkDay } from "@/features/shifts/lib/workDays";
import { useSaveShift, useShift, useShiftValidation } from "@/features/shifts/hooks/useShifts";
import { MinutesField, TimeField } from "@/features/shifts/components/fields";
import { ShiftTimeline } from "@/features/shifts/components/ShiftTimeline";
import type { BreakKind, ShiftBreakView, ShiftView } from "@/features/shifts/types";

const DOT: Record<BreakKind, string> = {
  MORNING: "bg-amber-500",
  LUNCH: "bg-teal-600",
  EVENING: "bg-amber-500",
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`${cardBase} space-y-5 p-4 sm:p-6`}>
      <div>
        <h2 id={id} className="text-base font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function reasonRuleText(early: boolean, late: boolean): string {
  if (early && late) return "Earlier or later inside the window needs a reason.";
  if (early) return "Starting earlier needs a reason; later does not.";
  if (late) return "Starting later needs a reason; earlier does not.";
  return "Any time inside the window is fine, no reason needed.";
}

function BreakCard({
  brk,
  derived,
  errors,
  onChange,
  disabled,
  reasonText,
}: {
  brk: BreakDraft;
  derived: Pick<
    ShiftBreakView,
    "endTime" | "windowOpen" | "windowClose" | "ringStart" | "ringEnd"
  > | null;
  errors: Record<string, string>;
  onChange: (patch: Partial<BreakDraft>) => void;
  disabled: boolean;
  reasonText: string;
}) {
  const base = `brk-${brk.kind.toLowerCase()}`;
  const err = (field: string) => errors[`${brk.kind}.${field}`];
  const off = !brk.enabled;

  return (
    <div
      className={`rounded-xl border p-4 ${
        off ? "border-dashed border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-[15px] font-bold text-slate-900">
          <input
            type="checkbox"
            className={checkboxBase}
            checked={brk.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            disabled={disabled}
          />
          <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${DOT[brk.kind]}`} />
          {BREAK_LABEL[brk.kind]}
        </label>
        {off ? (
          <Chip tone="neutral">Off for this shift</Chip>
        ) : derived ? (
          <Chip tone={brk.kind === "LUNCH" ? "info" : "warning"}>
            Can start {formatHmRange(derived.windowOpen, derived.windowClose)}
          </Chip>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label htmlFor={`${base}-start`} className="text-xs font-semibold text-slate-600">
            Starts at
          </label>
          <TimeField
            id={`${base}-start`}
            value={brk.startTime}
            onChange={(v) => onChange({ startTime: v })}
            error={err("startTime")}
            disabled={disabled || off}
          />
        </div>
        {(
          [
            ["durationMin", "Length", LIMITS.durationMin],
            ["windowBeforeMin", "Can start, before", LIMITS.windowBeforeMin],
            ["windowAfterMin", "Can start, after", LIMITS.windowAfterMin],
          ] as [BreakNumberField, string, { min: number; max: number }][]
        ).map(([field, label, lim]) => (
          <div key={field}>
            <label htmlFor={`${base}-${field}`} className="text-xs font-semibold text-slate-600">
              {label}
            </label>
            <MinutesField
              id={`${base}-${field}`}
              value={brk[field]}
              onChange={(v) => onChange({ [field]: v } as Partial<BreakDraft>)}
              min={lim.min}
              max={lim.max}
              error={err(field)}
              disabled={disabled || off}
            />
          </div>
        ))}
      </div>

      <label
        className={`mt-3 flex items-start gap-2.5 text-sm ${
          off || disabled ? "cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"
        }`}
      >
        <input
          type="checkbox"
          className={`${checkboxBase} mt-0.5`}
          checked={brk.allowSkip}
          onChange={(e) => onChange({ allowSkip: e.target.checked })}
          disabled={disabled || off}
          aria-describedby={`${base}-skip-help`}
        />
        <span>
          <span className="font-semibold">Allow Skip button</span>
          <span id={`${base}-skip-help`} className="block text-xs text-slate-500">
            {brk.allowSkip
              ? "The desktop app offers Skip break. A skip needs a reason and the manager's decision; it counts as focus time unless rejected."
              : "No Skip break button. If the break is not taken, it is skipped automatically when its window closes."}
          </span>
        </span>
      </label>

      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {off
          ? "No ring and no break in this slot."
          : derived
            ? `Scheduled ${formatHmRange(brk.startTime, derived.endTime)}. Rings ${formatHmRange(
                derived.ringStart,
                derived.ringEnd,
              )}: starting then is on time. ${reasonText}`
            : "Fill in the times to see the schedule."}
      </p>
    </div>
  );
}

function UsageLine({ shift }: { shift: ShiftView }) {
  const { people, departments, overrides } = shift.usage;
  const parts = [
    `${people} ${people === 1 ? "person" : "people"}`,
    departments.length
      ? `the ${departments.join(", ")} department${departments.length === 1 ? "" : "s"}`
      : null,
    overrides ? `${overrides} personal ${overrides === 1 ? "override" : "overrides"}` : null,
  ].filter(Boolean);
  return (
    <p className="text-sm text-slate-600">
      Today this shift applies to {parts.join(", ")}
      {shift.isDefault ? ", and is the default shift" : ""}.{" "}
      <Link
        href="/dashboard/shifts/assign"
        className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
      >
        Manage assignments
      </Link>
    </p>
  );
}

type CheckTone = "ok" | "problem" | "pending" | "warn";

function CheckPanel({ tone, title, items }: { tone: CheckTone; title: string; items: string[] }) {
  const styles: Record<CheckTone, { box: string; icon: ReactNode }> = {
    ok: {
      box: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />,
    },
    problem: {
      box: "border-rose-200 bg-rose-50 text-rose-900",
      icon: <XCircle className="h-5 w-5 shrink-0 text-rose-600" aria-hidden />,
    },
    warn: {
      box: "border-amber-200 bg-amber-50 text-amber-900",
      icon: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />,
    },
    pending: {
      box: "border-slate-200 bg-slate-50 text-slate-700",
      icon: <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-400" aria-hidden />,
    },
  };
  const s = styles[tone];
  return (
    <section
      id="shift-check"
      tabIndex={-1}
      aria-live="polite"
      aria-label="Shift check"
      className={`flex scroll-mt-4 gap-3 rounded-2xl border p-4 text-sm outline-none ${s.box}`}
    >
      {s.icon}
      <div className="min-w-0 space-y-1.5">
        <p className="font-semibold">{title}</p>
        {items.length > 0 && (
          <ul className="list-disc space-y-1 pl-4">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const RULE_FIELDS: [NumberField, string, string, { min: number; max: number }][] = [
  ["ringLeadMin", "Ring starts, before the break", "min", LIMITS.ringLeadMin],
  ["ringDurationMin", "Ring lasts", "min", LIMITS.ringDurationMin],
  ["reasonMinChars", "Shortest reason", "chars", LIMITS.reasonMinChars],
];

/** Create or edit a shift, with the server checking it live as you type. */
export function ShiftEditor({ shiftId }: { shiftId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(shiftId);
  const shiftQuery = useShift(shiftId);
  const [draft, setDraft] = useState<ShiftDraft | null>(() => (shiftId ? null : newShiftDraft()));
  const [nameConflict, setNameConflict] = useState<string | null>(null);
  const [saveProblems, setSaveProblems] = useState<string[]>([]);
  const save = useSaveShift(shiftId);

  // Load an existing shift into the form once; later re-reads must not
  // overwrite what is being typed.
  useEffect(() => {
    if (isEdit && shiftQuery.data && draft === null) setDraft(draftFromShift(shiftQuery.data));
  }, [isEdit, shiftQuery.data, draft]);

  const check = useMemo(() => (draft ? checkDraft(draft) : null), [draft]);
  const validation = useShiftValidation(check?.body ?? null);

  function update(patch: Partial<ShiftDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setSaveProblems([]);
    if ("name" in patch) setNameConflict(null);
  }

  function updateBreak(kind: BreakKind, patch: Partial<BreakDraft>) {
    setDraft((d) =>
      d ? { ...d, breaks: d.breaks.map((b) => (b.kind === kind ? { ...b, ...patch } : b)) } : d,
    );
    setSaveProblems([]);
  }

  // Drawn from the draft itself (same arithmetic as the server), so it keeps up
  // with typing and survives a slow or failed check.
  const timelineInput = useMemo(() => {
    if (!draft || !isValidHm(draft.start) || !isValidHm(draft.end)) return null;
    return {
      start: draft.start,
      end: draft.end,
      breaks: draft.breaks
        .map(breakInputFromDraft)
        .filter((b): b is NonNullable<typeof b> => b !== null),
      rules: ringFromDraft(draft),
    };
  }, [draft]);

  if (isEdit && shiftQuery.isLoading) return <LoadingState label="Loading shift…" />;
  if (isEdit && (shiftQuery.isError || (!shiftQuery.data && !draft))) {
    const notFound = errorStatus(shiftQuery.error) === 404;
    return (
      <div className={cardBase}>
        <ErrorState
          title={notFound ? "This shift no longer exists" : "Couldn't load this shift"}
          message={notFound ? "It may have been deleted." : errorMessage(shiftQuery.error)}
          onRetry={notFound ? undefined : () => shiftQuery.refetch()}
          retrying={shiftQuery.isFetching}
        />
        <div className="pb-8 text-center">
          <Link href="/dashboard/shifts" className={btnSecondary}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to shifts
          </Link>
        </div>
      </div>
    );
  }
  if (!draft || !check) return <LoadingState label="Loading shift…" />;

  const errors = check.errors;
  const localProblems = Object.values(errors);
  const serverData = validation.current ? validation.data : undefined;
  const serverBreaks = new Map((serverData?.breaks ?? []).map((b) => [b.kind, b]));
  const rules = ringFromDraft(draft);
  const knownInvalid = Boolean(serverData && !serverData.valid);
  const canSave = Boolean(check.body) && !knownInvalid && !save.isPending;

  let panel: { tone: CheckTone; title: string; items: string[] };
  if (localProblems.length) {
    panel = { tone: "problem", title: "Fix the highlighted fields", items: localProblems };
  } else if (saveProblems.length) {
    panel = { tone: "problem", title: "The server refused this shift", items: saveProblems };
  } else if (serverData) {
    panel = serverData.valid
      ? {
          tone: "ok",
          title: "Ready to save. Windows don't overlap and every break sits inside the shift.",
          items: [],
        }
      : { tone: "problem", title: "Fix before saving", items: serverData.problems };
  } else if (validation.isError && !validation.checking) {
    panel = {
      tone: "warn",
      title: "Couldn't check the shift just now. You can still save; it is checked again then.",
      items: [],
    };
  } else {
    panel = { tone: "pending", title: "Checking the shift…", items: [] };
  }

  const length = shiftLengthMinutes(draft.start, draft.end);
  const reasonText = reasonRuleText(draft.reasonOnEarly, draft.reasonOnLate);
  const pending = save.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!check?.body) {
      toast.error("Fix the highlighted fields first.");
      return;
    }
    if (!check.body.name) {
      setSaveProblems(["Give the shift a name."]);
      return;
    }
    try {
      const saved = await save.mutateAsync(check.body);
      toast.success(isEdit ? "Shift saved" : "Shift created", {
        description: isEdit
          ? `${saved.name}: new times apply from the next break not yet started. Breaks already taken keep theirs.`
          : `${saved.name} is ready. Assign it to departments or people under Assign shifts.`,
      });
      router.push("/dashboard/shifts");
    } catch (err) {
      const code = errorCode(err);
      const message = errorMessage(err) ?? "Please try again.";
      if (code === "SHIFT_INVALID") {
        const problems = errorDetails(err)?.problems;
        setSaveProblems(
          Array.isArray(problems)
            ? problems.filter((p): p is string => typeof p === "string")
            : [message],
        );
      } else if (errorStatus(err) === 409) {
        setNameConflict(message);
      } else {
        toast.error("Couldn't save the shift", { description: message });
      }
    }
  }

  const nameError = errors.name ?? nameConflict ?? undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard/shifts"
            className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Shifts
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
          <span className="truncate font-semibold text-slate-700" aria-current="page">
            {isEdit ? (shiftQuery.data?.name ?? "Edit shift") : "New shift"}
          </span>
        </nav>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Edit shift" : "New shift"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Working hours, working days and the three daily breaks. Checked as you type.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <Section title="Shift details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="shift-name" className={labelBase}>
                Shift name
              </label>
              <input
                id="shift-name"
                type="text"
                value={draft.name}
                maxLength={LIMITS.nameMax + 10}
                placeholder="e.g. General"
                autoComplete="off"
                aria-invalid={Boolean(nameError) || undefined}
                aria-describedby={nameError ? "shift-name-error" : undefined}
                onChange={(e) => update({ name: e.target.value })}
                disabled={pending}
                className={`${inputBase} mt-1.5 ${nameError ? inputInvalid : ""}`}
              />
              {nameError && (
                <p id="shift-name-error" className={errorText}>
                  {nameError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="shift-start" className={labelBase}>
                Starts
              </label>
              <TimeField
                id="shift-start"
                value={draft.start}
                onChange={(v) => update({ start: v })}
                error={errors.start}
                disabled={pending}
              />
            </div>
            <div>
              <label htmlFor="shift-end" className={labelBase}>
                Ends
              </label>
              <TimeField
                id="shift-end"
                value={draft.end}
                onChange={(v) => update({ end: v })}
                error={errors.end}
                disabled={pending}
              />
            </div>
          </div>
          {isValidHm(draft.start) && isValidHm(draft.end) && draft.start !== draft.end && (
            <p className="text-sm text-slate-600">
              {formatLength(length)} shift
              {isOvernight(draft.start, draft.end) ? ", ends the next day" : ""}. Times are in the
              business time zone.
            </p>
          )}

          <fieldset>
            <legend className={labelBase}>Working days</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = draft.workDays.includes(d.iso);
                return (
                  <button
                    key={d.iso}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.long}
                    onClick={() => update({ workDays: toggleWorkDay(draft.workDays, d.iso) })}
                    disabled={pending}
                    className={`h-10 min-w-[3.25rem] rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
                      on
                        ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            {errors.workDays && <p className={errorText}>{errors.workDays}</p>}
          </fieldset>

          {isEdit && shiftQuery.data && <UsageLine shift={shiftQuery.data} />}
        </Section>

        <Section
          title="Breaks"
          description="Three breaks a day. The window is when someone can start the break; outside it the desktop app won't start it."
        >
          <div className="space-y-3">
            {draft.breaks.map((b) => {
              const server = serverBreaks.get(b.kind);
              const input = breakInputFromDraft(b);
              const local = input ? deriveBreakTimes(input, rules) : null;
              return (
                <BreakCard
                  key={b.kind}
                  brk={b}
                  derived={server ?? local}
                  errors={errors}
                  onChange={(patch) => updateBreak(b.kind, patch)}
                  disabled={pending}
                  reasonText={reasonText}
                />
              );
            })}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Shift timeline</h3>
            {timelineInput ? (
              <ShiftTimeline input={timelineInput} />
            ) : (
              <p className="text-sm text-slate-500">
                Set the shift&apos;s start and end to see the timeline.
              </p>
            )}
          </div>
        </Section>

        <Section title="Ring and rules">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {RULE_FIELDS.map(([field, label, suffix, lim]) => (
              <div key={field}>
                <label htmlFor={`rule-${field}`} className={labelBase}>
                  {label}
                </label>
                <MinutesField
                  id={`rule-${field}`}
                  value={draft[field]}
                  onChange={(v) => update({ [field]: v } as Partial<ShiftDraft>)}
                  min={lim.min}
                  max={lim.max}
                  suffix={suffix}
                  error={errors[field]}
                  disabled={pending}
                />
              </div>
            ))}
          </div>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            The desktop app rings from {rules.ringLeadMin} min before each break, for{" "}
            {rules.ringDurationMin} min. Starting while it rings is on time.
          </p>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className={`${checkboxBase} mt-0.5`}
                checked={draft.ringSound}
                onChange={(e) => update({ ringSound: e.target.checked })}
                disabled={pending}
              />
              Play a sound while it rings
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className={`${checkboxBase} mt-0.5`}
                checked={draft.reasonOnEarly}
                onChange={(e) => update({ reasonOnEarly: e.target.checked })}
                disabled={pending}
              />
              Ask for a reason when a break starts early (window open, before the ring)
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className={`${checkboxBase} mt-0.5`}
                checked={draft.reasonOnLate}
                onChange={(e) => update({ reasonOnLate: e.target.checked })}
                disabled={pending}
              />
              Ask for a reason when a break starts late (after the ring stops)
            </label>
            {/* SPEC 1.5: the grace applies to every late return, so it is always
                editable. The reason checkbox only drives desktop apps before 3.1. */}
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-slate-700">
                <label htmlFor="rule-overrunGraceMin">Grace for a late return</label>
                <div className="w-28">
                  <MinutesField
                    id="rule-overrunGraceMin"
                    value={draft.overrunGraceMin}
                    onChange={(v) => update({ overrunGraceMin: v })}
                    min={LIMITS.overrunGraceMin.min}
                    max={LIMITS.overrunGraceMin.max}
                    error={errors.overrunGraceMin}
                    disabled={pending}
                  />
                </div>
                <span>over the break&apos;s length.</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                Back within the grace counts as break time. Later than that, the desktop app asks
                whether to count the extra minutes, and the manager decides.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className={`${checkboxBase} mt-0.5`}
                checked={draft.overrunReason}
                onChange={(e) => update({ overrunReason: e.target.checked })}
                disabled={pending}
              />
              Desktop apps before 3.1: ask for a reason when someone is back later than the grace
            </label>
          </div>
          <p className="text-sm text-slate-500">
            Breaks started early or late, skipped breaks, and minutes over a break that someone asks
            to count go to the person&apos;s manager, who decides them in Approvals.
          </p>
        </Section>

        <CheckPanel tone={panel.tone} title={panel.title} items={panel.items} />

        {/* Sticky, so the check's verdict and Save stay in reach on a long form.
            The full panel above is the live region; this is a visual summary. */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:shadow-sm">
          <p aria-hidden className="flex min-w-0 items-center gap-2 text-sm">
            {panel.tone === "ok" && (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-semibold text-emerald-700">Ready to save</span>
              </>
            )}
            {panel.tone === "pending" && (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
                <span className="text-slate-500">Checking…</span>
              </>
            )}
            {panel.tone === "warn" && (
              <>
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="text-amber-700">Not checked</span>
              </>
            )}
            {panel.tone === "problem" && (
              <>
                <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span className="font-semibold text-rose-700">
                  {panel.items.length || 1} {panel.items.length === 1 ? "problem" : "problems"} to
                  fix
                </span>
                <a
                  href="#shift-check"
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.getElementById("shift-check");
                    target?.scrollIntoView({ behavior: "smooth", block: "center" });
                    target?.focus({ preventScroll: true });
                  }}
                  className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                >
                  Show
                </a>
              </>
            )}
          </p>
          {/* Side by side even on a phone, so the bar stays short over the form. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Link href="/dashboard/shifts" className={btnSecondary} aria-disabled={pending}>
              Cancel
            </Link>
            <button type="submit" disabled={!canSave} className={btnPrimary}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              {pending ? "Saving…" : isEdit ? "Save shift" : "Create shift"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
