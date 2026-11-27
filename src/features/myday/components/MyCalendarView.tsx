"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { useSession } from "@/features/auth/hooks/useSession";
import { usePersonYear } from "@/features/calendar/hooks/useCalendar";
import type { PersonYearView } from "@/features/calendar/types";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useMyLeave } from "@/features/leave/hooks/useLeave";
import { useMyWfh } from "@/features/wfh/hooks/useWfh";
import { errorMessage } from "@/lib/api";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { MONTH_NAMES, WEEKDAY_SHORT, calendarCells } from "@/lib/time/months";
import { dayMarks } from "@/features/myday/lib/calendarMarks";
import type { DayMark } from "@/features/myday/types";

type Day = PersonYearView["days"][number];

/** A day's colour: leave and work from home first (a waiting one is outlined), then the calendar. */
export function cellLook(day: Day | undefined, mark: DayMark | undefined): string {
  if (mark?.kind === "LEAVE") {
    return mark.pending
      ? "bg-card text-meeting ring-1 ring-inset ring-meeting-edge"
      : "bg-meeting-wash-strong font-semibold text-meeting-ink";
  }
  if (mark?.kind === "WFH") {
    return mark.pending
      ? "bg-card text-brand ring-1 ring-inset ring-brand-edge"
      : "bg-brand-wash font-semibold text-brand";
  }
  if (!day) return "bg-card text-faint";
  if (!day.working && day.label) return "bg-attention-wash font-semibold text-attention-ink";
  if (!day.working) return "bg-panel text-quiet";
  return "bg-card text-body";
}

/** "Fri 13 Nov: working day. EL/PL leave (waiting)." for a screen reader and the tooltip. */
export function dayText(date: string, day: Day | undefined, mark: DayMark | undefined): string {
  const kind = !day
    ? ""
    : day.working
      ? "working day"
      : day.label
        ? `holiday, ${day.label}`
        : "day off";
  const what = mark ? ` ${mark.label}${mark.pending ? " (waiting for a decision)" : ""}.` : "";
  return `${formatDayWithWeekday(date)}${kind ? `: ${kind}.` : "."}${what}`;
}

function Month({
  month,
  byDate,
  marks,
  today,
}: {
  month: string;
  byDate: Map<string, Day>;
  marks: Map<string, DayMark>;
  today: string;
}) {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  return (
    <section aria-label={name} className="min-w-0">
      <h3 className="mb-1.5 text-sm font-bold text-strong">{name}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[0.6875rem]">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} aria-hidden className="py-0.5 font-semibold text-quiet">
            {d.slice(0, 2)}
          </span>
        ))}
        {calendarCells(month).map((date, i) => {
          if (!date) return <span key={`b${i}`} aria-hidden />;
          const day = byDate.get(date);
          const mark = marks.get(date);
          const label = dayText(date, day, mark);
          return (
            <span
              key={date}
              title={label}
              aria-label={label}
              className={`flex h-8 items-center justify-center rounded-md tabular-nums ${cellLook(day, mark)} ${
                date === today ? "outline outline-2 outline-brand" : ""
              }`}
            >
              {Number(date.slice(8))}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["bg-card ring-1 ring-inset ring-card", "Working day"],
    ["bg-panel", "Day off"],
    ["bg-attention-wash", "Holiday"],
    ["bg-meeting-wash-strong", "Leave"],
    ["bg-brand-wash", "Remote"],
    ["bg-card ring-1 ring-inset ring-meeting-edge", "Waiting for a decision"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-soft">
      {items.map(([cls, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-3.5 w-3.5 rounded ${cls}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * 4.1 Calendar for Staff (the phone app's Calendar): your year as your calendar sets it
 * (working days, days off, holidays), with your leave and work from home on it. The
 * organisation's calendar itself is the admins' page.
 */
export function MyCalendarView() {
  const { user } = useSession();
  const today = todayKey();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const thisYear = Number(today.slice(0, 4));
  const yearQuery = usePersonYear(user?.id ?? null, year);
  const leave = useMyLeave(year === thisYear ? undefined : year);
  const wfh = useMyWfh();
  const view = yearQuery.data;

  const byDate = useMemo(() => new Map((view?.days ?? []).map((d) => [d.date, d])), [view]);
  const marks = useMemo(
    () => dayMarks(leave.data?.requests ?? [], wfh.data?.requests ?? [], wfh.data?.schedules ?? []),
    [leave.data, wfh.data],
  );
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`),
    [year],
  );
  const holidays = (view?.days ?? []).filter((d) => !d.working && d.label);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        subtitle="Your working days, holidays, leave and remote days."
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-card bg-card p-1 shadow-sm">
            <IconButton label="Previous year" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <span
              className="min-w-[4rem] text-center text-sm font-bold tabular-nums text-primary"
              aria-live="polite"
            >
              {year}
            </span>
            <IconButton label="Next year" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        }
      />
      {yearQuery.isPending ? (
        <LoadingState label="Loading the year…" />
      ) : yearQuery.isError || !view ? (
        <ErrorState
          title="Couldn't load the year"
          message={errorMessage(yearQuery.error)}
          onRetry={() => void yearQuery.refetch()}
          retrying={yearQuery.isFetching}
        />
      ) : (
        <>
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-soft">
                {view.workingDays} working days, {view.days.length - view.workingDays} days off
                {holidays.length > 0 ? ` (${holidays.length} holidays)` : ""}.
              </p>
              <Legend />
            </div>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {months.map((m) => (
                <Month key={m} month={m} byDate={byDate} marks={marks} today={today} />
              ))}
            </div>
          </Card>
          {holidays.length > 0 && (
            <Card as="section" aria-label="Holidays" className="p-4 sm:p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-quiet">
                Holidays
              </h2>
              <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {holidays.map((d) => (
                  <li key={d.date} className="flex justify-between gap-3">
                    <span className="text-body">{d.label}</span>
                    <span className="text-quiet">{formatDayWithWeekday(d.date)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
