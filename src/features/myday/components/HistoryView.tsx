"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useMyMonthReport } from "@/features/reports/hooks/useReports";
import { DayClassChip } from "@/features/reports/components/ReportParts";
import { FocusByDayChart } from "@/features/reports/components/MonthCharts";
import { TimelineBar } from "@/features/reports/components/TimelineBar";
import {
  compOffEarnedText,
  dayOffText,
  lateText,
  leaveText,
  wfhText,
} from "@/features/reports/lib/dayNotes";
import type { MonthTotals, PersonDaySummary } from "@/features/reports/types";
import { errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { formatTimeRange12 } from "@/lib/time/format";
import { addMonths, formatMonth, monthOfDate } from "@/lib/time/months";
import { useMyDayReport } from "@/features/myday/hooks/useMyDay";
import { monthPace } from "@/features/myday/lib/pace";
import {
  AdjustmentsList,
  BreaksList,
  MeetingsList,
  Meter,
  Notice,
  PunchesList,
  Section,
} from "@/features/myday/components/DayParts";

/** A day's notes in short: leave, work from home, a late start, comp off, a missing check-out. */
export function dayNotes(d: PersonDaySummary): string[] {
  return [
    dayOffText(d),
    leaveText(d),
    wfhText(d),
    lateText(d),
    compOffEarnedText(d),
    d.noCheckout ? "No check-out" : null,
  ].filter((t): t is string => Boolean(t));
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-card bg-panel px-3 py-2.5">
      <dt className="text-xs text-quiet">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-primary">{value}</dd>
    </div>
  );
}

function count(n: number | undefined): string {
  return String(Math.round((n ?? 0) * 100) / 100);
}

function MonthSummary({
  month,
  totals,
  days,
}: {
  month: string;
  totals: MonthTotals;
  days: PersonDaySummary[];
}) {
  const pace = monthPace({ month, totals, days }, todayKey());
  return (
    <Card as="section" aria-label="The month" className="space-y-4 p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm text-quiet">
          <span className="text-2xl font-bold tabular-nums text-primary">
            {formatDuration(totals.focusSec)}
          </span>{" "}
          {pace.targetText}
        </p>
        {pace.target > 0 && (
          <Meter
            value={totals.focusSec / pace.target}
            mark={pace.mark}
            label="Focus time against the month's target"
          />
        )}
        {pace.track && (
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={pace.trackTone}>{pace.track}</Chip>
            {pace.left && <span className="text-sm text-soft">{pace.left}</span>}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Full days" value={count(totals.full)} />
        <Tile label="Half days" value={count(totals.half)} />
        <Tile label="Absent" value={count(totals.absent)} />
        <Tile label="Late starts" value={count(totals.lateStarts)} />
        <Tile label="Leave (days)" value={count(totals.leaveDays)} />
        <Tile label="Remote (days)" value={count(totals.wfhDays)} />
        <Tile label="Comp off earned" value={count(totals.compOffEarnedDays)} />
        <Tile label="Average focus" value={formatDuration(totals.avgFocusSec)} />
      </dl>
    </Card>
  );
}

function DayRow({
  day,
  selected,
  onSelect,
}: {
  day: PersonDaySummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const notes = dayNotes(day);
  const target = day.plannedSec ?? day.expectedSec;
  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 ${
        selected ? "bg-brand-wash" : ""
      }`}
    >
      <span className="w-28 shrink-0 text-sm font-semibold text-primary">
        {formatDayWithWeekday(day.date)}
      </span>
      <span className="w-28 shrink-0">
        <DayClassChip dayClass={day.dayClass} />
      </span>
      <span className="w-40 shrink-0 text-sm text-soft">
        {day.startedAt ? formatTimeRange12(day.startedAt, day.endedAt) : "Not worked"}
      </span>
      <span className="w-32 shrink-0 text-sm tabular-nums text-primary">
        {formatDuration(day.focusSec)}
        {target > 0 && <span className="text-quiet"> / {formatDuration(target)}</span>}
      </span>
      <span className="min-w-0 flex-1 text-xs text-quiet">{notes.join(" · ")}</span>
      <IconButton
        label={`${selected ? "Close" : "Open"} ${formatDayWithWeekday(day.date)}`}
        aria-expanded={selected}
        onClick={onSelect}
      >
        <ChevronRight className={`h-4 w-4 transition ${selected ? "rotate-90" : ""}`} />
      </IconButton>
    </li>
  );
}

function DayDetail({ date, onClose }: { date: string; onClose: () => void }) {
  const q = useMyDayReport(date);
  const r = q.data && q.data.summary.date === date ? q.data : null;
  return (
    <Card
      as="section"
      aria-label={`Your day, ${formatDayWithWeekday(date)}`}
      className="space-y-4 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">{formatDayWithWeekday(date)}</h2>
          {r?.shift && (
            <p className="text-sm text-quiet">
              {r.shift.name} · {formatTimeRange12(r.shift.start, r.shift.end)}
            </p>
          )}
        </div>
        <IconButton label="Close the day" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {q.isError ? (
        <ErrorState
          title="Couldn't load the day"
          message={errorMessage(q.error)}
          onRetry={() => void q.refetch()}
          retrying={q.isFetching}
        />
      ) : !r ? (
        <LoadingState label="Loading the day…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <DayClassChip dayClass={r.summary.dayClass} />
            <span className="text-sm text-soft">
              {formatDuration(r.summary.focusSec)} focus · {formatDuration(r.summary.breakSec)}{" "}
              breaks · {formatDuration(r.summary.meetingSec)} meetings
            </span>
          </div>
          {dayNotes(r.summary).length > 0 && (
            <p className="text-sm text-body">{dayNotes(r.summary).join(" · ")}</p>
          )}
          {r.summary.noCheckout && (
            <Notice>No check-out was recorded: the day was closed at your last punch.</Notice>
          )}
          {r.timeline.length > 0 && <TimelineBar timeline={r.timeline} skips={[]} />}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Breaks">
              <BreaksList breaks={r.breaks} />
            </Section>
            <Section title="Meetings">
              <MeetingsList meetings={r.meetings} />
            </Section>
          </div>
          {r.punches.length > 0 && (
            <Section title="Punches">
              <PunchesList punches={r.punches} />
            </Section>
          )}
          {r.adjustments.length > 0 && (
            <Section title="Focus time changed by hand">
              <AdjustmentsList adjustments={r.adjustments} />
            </Section>
          )}
        </>
      )}
    </Card>
  );
}

/**
 * 4.1 History (the phone app's History): a month of your own days against the target, the
 * attendance and leave totals, and every day; open a day for its timeline, breaks, meetings
 * and punches. No month after the current one.
 */
export function HistoryView() {
  const current = monthOfDate(todayKey());
  const [month, setMonth] = useState(current);
  const [selected, setSelected] = useState<string | null>(null);
  const q = useMyMonthReport(month);
  const r = q.data && q.data.month === month ? q.data : null;
  const days = (r?.days ?? [])
    .filter((d) => d.dayClass !== "UPCOMING")
    .slice()
    .reverse();

  function go(n: number) {
    setSelected(null);
    setMonth((m) => addMonths(m, n));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="History"
        subtitle="Your focus time, attendance and leave, month by month."
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-card bg-card p-1 shadow-sm">
            <IconButton label="Previous month" onClick={() => go(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <span
              className="min-w-[8rem] text-center text-sm font-bold text-primary"
              aria-live="polite"
            >
              {formatMonth(month)}
            </span>
            <IconButton label="Next month" onClick={() => go(1)} disabled={month >= current}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        }
      />
      {q.isError ? (
        <ErrorState
          title="Couldn't load the month"
          message={errorMessage(q.error)}
          onRetry={() => void q.refetch()}
          retrying={q.isFetching}
        />
      ) : !r ? (
        <LoadingState label="Loading the month…" />
      ) : (
        <>
          <MonthSummary month={r.month} totals={r.totals} days={r.days} />
          {selected && <DayDetail date={selected} onClose={() => setSelected(null)} />}
          {r.days.some((d) => d.focusSec > 0) && (
            <Card as="section" aria-label="Focus time by day" className="p-4 sm:p-5">
              <FocusByDayChart days={r.days} />
            </Card>
          )}
          <Card as="section" aria-label="Every day" className="overflow-hidden">
            {days.length === 0 ? (
              <p className="px-4 py-6 text-sm text-quiet">No days yet this month.</p>
            ) : (
              <ul className="divide-y divide-card">
                {days.map((d) => (
                  <DayRow
                    key={d.date}
                    day={d}
                    selected={selected === d.date}
                    onSelect={() => setSelected(selected === d.date ? null : d.date)}
                  />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
