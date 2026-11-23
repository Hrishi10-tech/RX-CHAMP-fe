"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorMessage } from "@/lib/api";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { MONTH_NAMES, WEEKDAY_SHORT, calendarCells } from "@/lib/time/months";
import { usePersonYear } from "@/features/calendar/hooks/useCalendar";
import { CALENDAR_SOURCE_LABEL, countBySource } from "@/features/calendar/lib/calendar";
import type { CalendarSource, PersonYearView } from "@/features/calendar/types";

type Day = PersonYearView["days"][number];

/** A mark under the day for what decided it; the organisation's week has none. */
const SOURCE_MARK: Record<CalendarSource, string> = {
  OVERRIDE: "bg-violet-500",
  PERSON: "bg-[rgb(34_34_204)]",
  DEPARTMENT: "bg-sky-500",
  ORGANISATION: "",
};

const SOURCES: CalendarSource[] = ["OVERRIDE", "PERSON", "DEPARTMENT", "ORGANISATION"];

function cellClass(day: Day | undefined): string {
  if (!day) return "bg-white text-slate-300";
  if (!day.working && day.label) return "bg-violet-100 font-semibold text-violet-800";
  if (!day.working) return "bg-slate-100 text-slate-400";
  if (day.source === "OVERRIDE")
    return "bg-emerald-50 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-300";
  return "bg-white text-slate-700";
}

/** "Mon 9 Nov: day off, Diwali. A day set on the organisation calendar." */
export function personDayText(day: Day): string {
  const kind = day.working ? "working day" : "day off";
  return `${formatDayWithWeekday(day.date)}: ${kind}${day.label ? `, ${day.label}` : ""}. ${
    CALENDAR_SOURCE_LABEL[day.source]
  }.`;
}

function Month({
  month,
  byDate,
  today,
}: {
  month: string;
  byDate: Map<string, Day>;
  today: string;
}) {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  return (
    <section aria-label={name} className="min-w-0">
      <h3 className="mb-1.5 text-sm font-bold text-slate-800">{name}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} aria-hidden className="py-0.5 font-semibold text-slate-400">
            {d.slice(0, 2)}
          </span>
        ))}
        {calendarCells(month).map((date, i) => {
          if (!date) return <span key={`b${i}`} aria-hidden />;
          const day = byDate.get(date);
          const label = day ? personDayText(day) : formatDayWithWeekday(date);
          return (
            <span
              key={date}
              title={label}
              aria-label={label}
              className={`relative flex h-8 items-center justify-center rounded-md tabular-nums ${cellClass(day)} ${
                date === today ? "outline outline-2 outline-[rgb(34_34_204)]" : ""
              }`}
            >
              {Number(date.slice(8))}
              {day && SOURCE_MARK[day.source] && (
                <span
                  aria-hidden
                  className={`absolute bottom-0.5 h-1 w-3 rounded-full ${SOURCE_MARK[day.source]}`}
                />
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 3.5: one person's year, day by day, with what decides each day: a day set on
 * the calendar, their own week, their department's, or the organisation's.
 */
export function PersonYear({ userId, personName }: { userId: string; personName: string }) {
  const today = todayKey();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const query = usePersonYear(userId, year);
  const view = query.data;
  const byDate = useMemo(() => new Map((view?.days ?? []).map((d) => [d.date, d])), [view]);
  const counts = useMemo(() => countBySource(view?.days ?? []), [view]);
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`),
    [year],
  );
  const daysOff = view ? view.days.length - view.workingDays : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-slate-600">
          {view
            ? `${view.sourceLabel} decides most of ${personName}'s working days.`
            : `What decides each of ${personName}'s days.`}
        </p>
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
      </div>

      {query.isPending ? (
        <LoadingState label="Loading the year…" />
      ) : query.isError || !view ? (
        <ErrorState
          title="Couldn't load the year"
          message={errorMessage(query.error)}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-center">
            {[
              { label: "Working days", value: view.workingDays },
              { label: "Days off", value: daysOff },
              { label: "Set on the calendar", value: counts.OVERRIDE },
            ].map((t) => (
              <div key={t.label} className="bg-white px-2 py-2.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {t.label}
                </dt>
                <dd className="text-lg font-bold tabular-nums text-slate-900">{t.value}</dd>
              </div>
            ))}
          </dl>
          <section aria-label="Decided by" className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decided by
            </h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
              {SOURCES.filter((s) => counts[s] > 0).map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`h-1 w-3 rounded-full ${SOURCE_MARK[s] || "bg-slate-300"}`}
                  />
                  {CALENDAR_SOURCE_LABEL[s]}:{" "}
                  <span className="font-semibold tabular-nums text-slate-900">{counts[s]}</span>
                </li>
              ))}
            </ul>
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
            </div>
          </section>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {months.map((m) => (
              <Month key={m} month={m} byDate={byDate} today={today} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
