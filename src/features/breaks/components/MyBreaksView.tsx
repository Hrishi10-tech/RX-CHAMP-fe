"use client";

import { useEffect, useMemo, useState } from "react";
import { Coffee, History, Laptop, Moon } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDayWithWeekday, formatMinutes, hmOf, relativeDay } from "@/lib/time/businessTime";
import { formatHmRange } from "@/features/shifts/lib/time";
import { SourceChip } from "@/features/shifts/components/ShiftBadges";
import { isSkipRecord, overrunLabel, tookLabel } from "@/features/breaks/lib/labels";
import { serverClock, slotStatus } from "@/features/breaks/lib/slots";
import { useMyBreakDay, useMyBreakHistory } from "@/features/breaks/hooks/useMyBreaks";
import { ApprovalChip, CellStatusChip, TimingChip } from "@/features/breaks/components/BreakChips";
import type { BreakRecordView, MyBreakDayView } from "@/features/breaks/types";

const HISTORY_DAYS = 14;

/** Re-renders every `ms` so "Upcoming" becomes "Open" without a refetch. */
function useTick(ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
  return tick;
}

function Decision({ record }: { record: BreakRecordView }) {
  if (record.approvalStatus === "PENDING") {
    return <p className="text-xs text-amber-700">Waiting for your manager&apos;s decision.</p>;
  }
  if (record.approvalStatus !== "APPROVED" && record.approvalStatus !== "REJECTED") return null;
  const verb = record.approvalStatus === "APPROVED" ? "Approved" : "Rejected";
  const by = record.decidedByName ? ` by ${record.decidedByName}` : "";
  return (
    <p
      className={`text-xs ${
        record.approvalStatus === "REJECTED" ? "text-rose-700" : "text-emerald-700"
      }`}
    >
      {verb}
      {by}
      {record.decisionNote ? `: “${record.decisionNote}”` : "."}
    </p>
  );
}

function SkipDetails({ record }: { record: BreakRecordView }) {
  const auto = record.outcome === "AUTO_SKIPPED";
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-slate-600">
        {auto
          ? `Skipped automatically when its window closed, ${hmOf(record.startedAt)}`
          : `Skipped at ${hmOf(record.startedAt)}`}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone={auto ? "neutral" : "violet"}>{auto ? "Auto-skipped" : "Skipped"}</Chip>
        <ApprovalChip status={record.approvalStatus} />
      </div>
      {record.reason ? (
        <p className="text-xs text-slate-500">
          {auto ? "Your comment" : "Your reason"}: &ldquo;{record.reason}&rdquo;
        </p>
      ) : record.needsComment ? (
        <p className="text-xs font-semibold text-amber-700">
          Add a comment in the RX Vision app before End Day.
        </p>
      ) : null}
      <Decision record={record} />
    </div>
  );
}

function RecordDetails({ record }: { record: BreakRecordView }) {
  if (isSkipRecord(record)) return <SkipDetails record={record} />;
  const overrun = overrunLabel(record);
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-slate-600">
        Started {hmOf(record.startedAt)}
        {record.endedAt ? `, back ${hmOf(record.endedAt)}` : ""} · {tookLabel(record)}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <TimingChip record={record} />
        <ApprovalChip status={record.approvalStatus} />
        {overrun && <Chip tone="danger">{overrun}</Chip>}
      </div>
      {record.reason && (
        <p className="text-xs text-slate-500">Your reason: &ldquo;{record.reason}&rdquo;</p>
      )}
      <Decision record={record} />
    </div>
  );
}

function freeModeText(day: MyBreakDayView): string {
  if (!day.shift) return "No shift is set for you, so your breaks have no schedule today.";
  if (!day.workday) return `Today is a day off on your ${day.shift.name} shift.`;
  return `Your ${day.shift.name} shift has no scheduled breaks.`;
}

function Today({ day, fetchedAt }: { day: MyBreakDayView; fetchedAt: number }) {
  useTick(30_000);
  const now = serverClock(day.serverNow, fetchedAt);

  return (
    <section className={`${cardBase} space-y-4 p-4 sm:p-6`} aria-labelledby="my-breaks-today">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="my-breaks-today" className="text-base font-bold text-slate-900">
            Today{" "}
            <span className="ml-1 text-sm font-normal text-slate-500">
              {formatDayWithWeekday(day.date)}
            </span>
          </h2>
          {day.shift ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {day.shift.name} · {formatHmRange(day.shift.start, day.shift.end)}
              </span>
              <SourceChip source={day.source} />
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No shift set.</p>
          )}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
        <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        Breaks are started from the RX Vision app on your computer, not here.
      </p>

      {day.activeBreak && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(34,34,204,0.2)] bg-[rgba(34,34,204,0.05)] px-3.5 py-2.5 text-sm text-slate-800">
          <Chip tone="brand" dot pulse>
            On a break now
          </Chip>
          <span>
            {day.activeBreak.label} since {hmOf(day.activeBreak.startedAt)} (
            {formatMinutes(day.activeBreak.tookSec)} so far)
          </span>
        </div>
      )}
      {day.dayEnded && (
        <p className="flex items-start gap-2 text-sm text-slate-600">
          <Moon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          You ended your day, so no more breaks today.
        </p>
      )}

      {day.mode === "FREE" ? (
        <p className="text-sm text-slate-600">{freeModeText(day)}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {day.breaks.map((slot) => {
            const status = slotStatus(slot, now);
            return (
              <li
                key={slot.kind}
                className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="min-w-0 sm:w-56 sm:shrink-0">
                  <p className="font-semibold text-slate-900">{slot.label}</p>
                  <p className="text-sm tabular-nums text-slate-600">
                    {formatHmRange(slot.local.start, slot.local.end)} · {slot.durationMin} min
                  </p>
                  <p className="text-xs text-slate-500">
                    Can start {formatHmRange(slot.local.windowOpen, slot.local.windowClose)}
                  </p>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <CellStatusChip status={status} />
                  {slot.record ? (
                    <RecordDetails record={slot.record} />
                  ) : status === "MISSED" ? (
                    <p className="text-xs text-slate-500">Its window has closed.</p>
                  ) : status === "OPEN" ? (
                    <p className="text-xs text-slate-500">
                      On time while the app rings (
                      {formatHmRange(slot.local.ringStart, slot.local.ringEnd)}).
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {day.unscheduled.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Outside the schedule</h3>
          <ul className="space-y-2">
            {day.unscheduled.map((r) => (
              <li key={r.id} className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <RecordDetails record={r} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function HistoryList() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMyBreakHistory(HISTORY_DAYS);

  const groups = useMemo(() => {
    const byDate = new Map<string, BreakRecordView[]>();
    for (const item of data?.items ?? []) {
      const list = byDate.get(item.date) ?? [];
      list.push(item);
      byDate.set(item.date, list);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [data]);

  return (
    <section className={cardBase} aria-labelledby="my-breaks-history">
      <div className="border-b border-slate-200 px-4 py-3.5 sm:px-6">
        <h2 id="my-breaks-history" className="text-base font-bold text-slate-900">
          Last {HISTORY_DAYS} days
        </h2>
        <p className="text-sm text-slate-500">Your breaks, with your manager&apos;s decisions.</p>
      </div>
      {isLoading ? (
        <LoadingState label="Loading your breaks…" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your breaks"
          message={errorMessage(error)}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={History}
          title="No breaks yet"
          message={`Nothing in the last ${HISTORY_DAYS} days.`}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {groups.map(([date, items]) => (
            <div key={date} className="px-4 py-3.5 sm:px-6">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {relativeDay(date)}
                {relativeDay(date) !== formatDayWithWeekday(date) && " "}
                {relativeDay(date) !== formatDayWithWeekday(date) && (
                  <span className="ml-0.5 font-semibold normal-case tracking-normal text-slate-400">
                    {formatDayWithWeekday(date)}
                  </span>
                )}
              </h3>
              <ul className="mt-2 space-y-3">
                {items.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <p className="text-sm font-semibold text-slate-800 sm:w-44 sm:shrink-0">
                      {r.label}
                    </p>
                    <div className="min-w-0 flex-1">
                      <RecordDetails record={r} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** My breaks: today's schedule and what was taken, then recent history with decisions. Read-only. */
export function MyBreaksView() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useMyBreakDay();

  return (
    <div className="space-y-5">
      {isLoading ? (
        <section className={cardBase}>
          <LoadingState label="Loading today's breaks…" />
        </section>
      ) : isError || !data ? (
        <section className={cardBase}>
          <ErrorState
            title="Couldn't load today's breaks"
            message={errorMessage(error)}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        </section>
      ) : (
        <Today day={data} fetchedAt={dataUpdatedAt} />
      )}
      <HistoryList />
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Coffee className="h-3.5 w-3.5" aria-hidden />
        Times are in the business time zone.
      </p>
    </div>
  );
}
