"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Lock, PartyPopper, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardBase,
  hintBase,
  inputBase,
  labelBase,
} from "@/components/ui/classes";
import { errorCode, errorDetails, errorMessage } from "@/lib/api";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { MONTH_NAMES, WEEKDAY_SHORT, formatMonth } from "@/lib/time/months";
import { useOrgScope } from "@/lib/org/selection";
import {
  clearCalendarDay,
  getCalendar,
  setCalendarDay,
  setWeekPattern,
} from "@/features/calendar/api/calendar";
import {
  WEEKDAY_NAMES,
  buildYear,
  currentPatternFrom,
  dayChange,
  holidaysOf,
  isSinceAlways,
  pastPatterns,
  patternOn,
  patternText,
  toggleWeekday,
  upcomingPattern,
  weekLockedText,
} from "@/features/calendar/lib/calendar";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import type { CalendarDayCell, CalendarMonthGrid } from "@/features/calendar/types";

export const calendarKeys = {
  all: ["calendar"] as const,
  year: (org: string, year: number) => [...calendarKeys.all, org, year] as const,
};

function dayClass(cell: CalendarDayCell): string {
  if (!cell.isWorking && cell.label) return "bg-violet-100 text-violet-800 font-semibold";
  if (!cell.isWorking) return "bg-slate-100 text-slate-400";
  if (cell.overridden)
    return "bg-emerald-50 text-emerald-800 font-semibold ring-1 ring-inset ring-emerald-300";
  return "bg-white text-slate-700";
}

function dayTitle(cell: CalendarDayCell): string {
  const kind = cell.isWorking ? "Working day" : "Day off";
  return `${formatDayWithWeekday(cell.date)}: ${kind}${cell.label ? `, ${cell.label}` : ""}`;
}

function MonthCard({
  grid,
  editable,
  onPick,
}: {
  grid: CalendarMonthGrid;
  editable: boolean;
  onPick: (cell: CalendarDayCell) => void;
}) {
  const monthIndex = Number(grid.month.slice(5, 7)) - 1;
  return (
    <section className={`${cardBase} p-4`} aria-label={MONTH_NAMES[monthIndex]}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-slate-900">{MONTH_NAMES[monthIndex]}</h2>
        <span className="text-xs font-semibold text-slate-500">
          <span className="tabular-nums text-[rgb(34_34_204)]">{grid.workingDays}</span> working
          days
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {WEEKDAY_SHORT.map((w) => (
          <span
            key={w}
            className="pb-1 text-[10px] font-semibold uppercase text-slate-400"
            role="columnheader"
          >
            {w.slice(0, 2)}
          </span>
        ))}
        {grid.weeks.flat().map((cell, i) =>
          cell ? (
            editable ? (
              <button
                key={cell.date}
                type="button"
                role="gridcell"
                onClick={() => onPick(cell)}
                title={dayTitle(cell)}
                aria-label={dayTitle(cell)}
                className={`relative flex h-8 items-center justify-center rounded-md text-xs tabular-nums transition hover:ring-2 hover:ring-[rgba(34,34,204,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(34_34_204)] ${dayClass(cell)} ${
                  cell.isToday ? "outline outline-2 outline-[rgb(34_34_204)]" : ""
                }`}
              >
                {cell.day}
                {cell.label && (
                  <span
                    aria-hidden
                    className="absolute bottom-0.5 h-1 w-1 rounded-full bg-current"
                  />
                )}
              </button>
            ) : (
              <span
                key={cell.date}
                role="gridcell"
                title={dayTitle(cell)}
                aria-label={dayTitle(cell)}
                className={`relative flex h-8 items-center justify-center rounded-md text-xs tabular-nums ${dayClass(cell)} ${
                  cell.isToday ? "outline outline-2 outline-[rgb(34_34_204)]" : ""
                }`}
              >
                {cell.day}
              </span>
            )
          ) : (
            <span key={`pad-${i}`} aria-hidden />
          ),
        )}
      </div>
    </section>
  );
}

/** Flip one day between working and off, with an optional name (SPEC 7.2 Calendar). */
export function DayDialog({
  cell,
  weekPattern,
  onClose,
  onSave,
  saving,
}: {
  cell: CalendarDayCell | null;
  weekPattern: number[];
  onClose: () => void;
  onSave: (date: string, change: ReturnType<typeof dayChange>) => void;
  saving: boolean;
}) {
  const id = useId();
  const [working, setWorking] = useState(true);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!cell) return;
    // Opening a working day suggests making it a day off, and the other way round.
    setWorking(!cell.isWorking);
    setLabel(cell.label ?? "");
  }, [cell]);

  if (!cell) return null;
  const patternWorking = weekPattern.includes(cell.weekday);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!cell) return;
    onSave(cell.date, dayChange(cell.date, weekPattern, { isWorking: working, label }));
  }

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={formatDayWithWeekday(cell.date)}
      description={`The week pattern makes ${WEEKDAY_NAMES[cell.weekday - 1]} a ${
        patternWorking ? "working day" : "day off"
      }.${cell.overridden ? " This day is set by hand." : ""}`}
      className="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        <div role="radiogroup" aria-label="This day is" className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: "Working day" },
            { value: false, label: "Day off" },
          ].map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={working === o.value}
              onClick={() => setWorking(o.value)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
                working === o.value
                  ? o.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-violet-500 bg-violet-50 text-violet-800"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor={id} className={labelBase}>
            Name <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id={id}
            value={label}
            maxLength={60}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={working ? "e.g. Make-up day" : "e.g. Diwali"}
            className={`${inputBase} mt-1.5`}
          />
          <p className={hintBase}>Named days off appear as holidays to everyone, in the app too.</p>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {cell.overridden ? (
            <button
              type="button"
              className={btnGhost}
              disabled={saving}
              onClick={() => onSave(cell.date, { kind: "delete" })}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Back to the week pattern
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Save
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/**
 * SPEC 7.2 Calendar: the year in twelve months. Admins click a day to make it a
 * working day or a day off (with a name, for holidays) and switch the working
 * week; managers read it. Monthly focus targets follow it (SPEC 2.6).
 */
export function CalendarView({ editable }: { editable: boolean }) {
  const org = useOrgScope();
  const queryClient = useQueryClient();
  const today = todayKey();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [picked, setPicked] = useState<CalendarDayCell | null>(null);
  const key = calendarKeys.year(org, year);
  const calendar = useQuery({ queryKey: key, queryFn: () => getCalendar(year) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: calendarKeys.all });

  const saveDay = useMutation({
    mutationFn: async ({
      date,
      change,
    }: {
      date: string;
      change: ReturnType<typeof dayChange>;
    }) => {
      if (change.kind === "delete") await clearCalendarDay(date);
      else await setCalendarDay(date, change.isWorking, change.label);
    },
    onSuccess: (_d, { date, change }) => {
      toast.success("Calendar saved", {
        description: `${formatDayWithWeekday(date)}: ${
          change.kind === "delete"
            ? "back to the week pattern"
            : change.isWorking
              ? "working day"
              : `day off${change.label ? `, ${change.label}` : ""}`
        }.`,
      });
      setPicked(null);
      return invalidate();
    },
    onError: (err) =>
      errorCode(err) === "MONTH_LOCKED"
        ? toast.error("That month is locked for payroll", {
            description: "Unlock the month in Reports before changing its days.",
          })
        : toast.error("Couldn't save the day", {
            description: errorMessage(err) ?? "Please try again.",
          }),
  });

  // A new working week is drafted, then saved with the day it applies from.
  const [draft, setDraft] = useState<number[] | null>(null);
  const [from, setFrom] = useState(today);
  const fromId = useId();
  const savePattern = useMutation({
    mutationFn: ({ days, from: start }: { days: number[]; from: string }) =>
      setWeekPattern(days, start),
    onSuccess: (_d, { from: start }) => {
      toast.success("Working week saved", {
        description: `It applies from ${formatDayWithWeekday(start)} ${start.slice(0, 4)}.`,
      });
      setDraft(null);
      return invalidate();
    },
    onError: (err) =>
      errorCode(err) === "MONTH_LOCKED"
        ? toast.error("That month is locked for payroll", {
            description: weekLockedText(
              typeof errorDetails(err)?.month === "string"
                ? String(errorDetails(err)?.month)
                : null,
              formatMonth,
            ),
          })
        : toast.error("Couldn't save the working week", {
            description: errorMessage(err) ?? "Please try again.",
          }),
  });

  const data = calendar.data;
  const patternFor = useMemo(
    () => (date: string) => (data ? patternOn(date, data.weekPattern, data.patternHistory) : []),
    [data],
  );
  const months = useMemo(
    () => (data ? buildYear(year, patternFor, data.overrides, today) : []),
    [data, year, today, patternFor],
  );
  const shownPattern = draft ?? data?.weekPattern ?? [];
  const changed =
    draft !== null && data !== undefined && draft.join(",") !== data.weekPattern.join(",");
  const appliesFrom = data ? currentPatternFrom(data.patternHistory, today) : null;
  const past = data ? pastPatterns(data.patternHistory, today) : [];
  const upcoming = data ? upcomingPattern(data.patternHistory, today) : null;
  const holidays = useMemo(() => (data ? holidaysOf(data.overrides, year) : []), [data, year]);
  const totalWorking = months.reduce((s, m) => s + m.workingDays, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        subtitle={
          editable
            ? "Working days and holidays for the organisation. Click a day to change it; monthly focus targets follow."
            : "Working days and holidays for the organisation. Monthly focus targets follow this calendar."
        }
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span
              className="min-w-[4rem] text-center text-sm font-bold tabular-nums text-slate-900"
              aria-live="polite"
            >
              {year}
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {calendar.isPending ? (
        <div className={cardBase}>
          <LoadingState label="Loading the calendar…" />
        </div>
      ) : calendar.isError || !data ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(calendar.error)}
            onRetry={() => void calendar.refetch()}
            retrying={calendar.isFetching}
          />
        </div>
      ) : (
        <>
          <section
            className={`${cardBase} flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between`}
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">Working week</h2>
              <p className="text-xs text-slate-500">
                {editable
                  ? "Tap a day to switch it on or off, then choose the day the new week applies from."
                  : "Set by the Admin."}
                {appliesFrom && !changed
                  ? ` Applies from ${formatDayWithWeekday(appliesFrom)} ${appliesFrom.slice(0, 4)}.`
                  : ""}
              </p>
              {upcoming && !changed && (
                <p className="mt-1 text-xs font-semibold text-[rgb(34_34_204)]">
                  {patternText(upcoming.days)} from {formatDayWithWeekday(upcoming.from)}{" "}
                  {upcoming.from.slice(0, 4)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Working week">
              {WEEKDAY_SHORT.map((label, i) => {
                const day = i + 1;
                const on = shownPattern.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    disabled={!editable || savePattern.isPending}
                    onClick={() => {
                      if (draft === null) setFrom(today);
                      setDraft(toggleWeekday(shownPattern, day));
                    }}
                    className={`h-10 min-w-[3.25rem] rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-default ${
                      on
                        ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] text-white"
                        : "border-slate-200 bg-white text-slate-500"
                    } ${editable ? "hover:brightness-105" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-slate-200 bg-white" /> Working
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-slate-100" /> Off
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-violet-100" /> Holiday
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-emerald-50 ring-1 ring-emerald-300" /> Extra
                working day
              </span>
              {!editable && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Lock className="h-3 w-3" aria-hidden /> Read only
                </span>
              )}
            </div>
          </section>

          {editable && changed && draft && (
            <section
              aria-label="Save the working week"
              className={`${cardBase} flex flex-col gap-3 border-[rgba(34,34,204,0.35)] p-4 sm:flex-row sm:items-end sm:justify-between`}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  New working week: {patternText(draft)}
                </p>
                <label htmlFor={fromId} className={`${labelBase} mt-2 block`}>
                  Applies from
                </label>
                <input
                  id={fromId}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={`${inputBase} mt-1.5 w-48`}
                />
                <p className={hintBase}>
                  Days before it keep the working week they had. Targets follow from that day.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setDraft(null)}
                  disabled={savePattern.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={savePattern.isPending || !/^\d{4}-\d{2}-\d{2}$/.test(from)}
                  onClick={() => savePattern.mutate({ days: draft, from })}
                >
                  {savePattern.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  )}
                  Save working week
                </button>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {months.map((m) => (
                <MonthCard key={m.month} grid={m} editable={editable} onPick={setPicked} />
              ))}
            </div>

            <aside className="space-y-5">
              <section className={`${cardBase} p-4`}>
                <h2 className="mb-3 text-sm font-bold text-slate-900">Working days by month</h2>
                <ul className="divide-y divide-slate-100 text-sm">
                  {months.map((m) => (
                    <li key={m.month} className="flex items-center justify-between py-1.5">
                      <span className="text-slate-600">
                        {MONTH_NAMES[Number(m.month.slice(5)) - 1]}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {m.workingDays}
                      </span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between pt-2 font-bold">
                    <span className="text-slate-800">{year}</span>
                    <span className="tabular-nums text-[rgb(34_34_204)]">{totalWorking}</span>
                  </li>
                </ul>
              </section>

              {past.length > 0 && (
                <section className={`${cardBase} p-4`}>
                  <h2 className="mb-1 text-sm font-bold text-slate-900">Earlier working weeks</h2>
                  <p className="mb-3 text-xs text-slate-500">Kept for the days they covered.</p>
                  <ul className="space-y-2 text-sm">
                    {past.map((p) => (
                      <li key={p.from} className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{patternText(p.days)}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {isSinceAlways(p.from)
                            ? "Until"
                            : `${formatDayWithWeekday(p.from)} ${p.from.slice(0, 4)} to`}{" "}
                          {formatDayWithWeekday(p.until)} {p.until.slice(0, 4)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={`${cardBase} p-4`}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <PartyPopper className="h-4 w-4 text-violet-600" aria-hidden />
                  Holidays
                </h2>
                {holidays.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    {editable ? "None yet. Click a day and name it." : "None this year."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {holidays.map((h) => (
                      <li key={h.date} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-semibold text-slate-800">
                          {h.label || "Day off"}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {formatDayWithWeekday(h.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </>
      )}

      {editable && data && (
        <DayDialog
          cell={picked}
          weekPattern={picked ? patternFor(picked.date) : data.weekPattern}
          onClose={() => setPicked(null)}
          saving={saveDay.isPending}
          onSave={(date, change) => saveDay.mutate({ date, change })}
        />
      )}
    </div>
  );
}
