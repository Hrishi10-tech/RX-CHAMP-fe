"use client";

import Link from "next/link";
import { AlertTriangle, Laptop, MessageSquareWarning } from "lucide-react";

import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { useNow } from "@/lib/hooks/useNow";
import { formatDayWithWeekday, hmOf, relativeDay } from "@/lib/time/businessTime";
import { useWorkdayToday } from "@/features/workday/hooks/useWorkdayToday";
import { decidedEffectLines, liveFocusSec, pendingEffectLines } from "@/features/workday/lib/focus";
import type { WorkdayTodayView } from "@/features/workday/types";

/** "today", "yesterday", or "12 Oct" mid-sentence. */
function dayWord(date: string): string {
  const rel = relativeDay(date);
  return rel === "Today" || rel === "Yesterday" || rel === "Tomorrow" ? rel.toLowerCase() : rel;
}

function stateChip(day: WorkdayTodayView): { label: string; tone: ChipTone; live: boolean } {
  if (day.state === "NOT_STARTED") return { label: "Not started", tone: "neutral", live: false };
  if (day.state === "ENDED") return { label: "Day ended", tone: "neutral", live: false };
  return day.focus?.running
    ? { label: "Working", tone: "success", live: true }
    : { label: "On a break", tone: "warning", live: false };
}

/** Focus time, ticking every 30 seconds while the clock runs. */
function FocusNumber({ day, fetchedAt }: { day: WorkdayTodayView; fetchedAt: number }) {
  const running = day.state === "OPEN" && Boolean(day.focus?.running);
  const now = useNow(30_000, running);
  const focus = running
    ? liveFocusSec(day.focus, fetchedAt, now)
    : Math.max(0, day.focus?.focusSec ?? 0);
  const expected = Math.max(0, day.expectedSec || 0);
  return (
    <div>
      <p className="text-sm font-semibold text-slate-600">
        {day.state === "ENDED" ? "Focus time today" : "Focus time so far"}
      </p>
      <p
        className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-slate-900"
        aria-live="off"
      >
        {formatDuration(focus)}
      </p>
      {expected > 0 && (
        <div className="mt-2 max-w-xs">
          <span aria-hidden className="block h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <span
              className="block h-full rounded-full bg-indigo-600 transition-[width]"
              style={{ width: `${Math.min(100, (focus / expected) * 100)}%` }}
            />
          </span>
          <p className="mt-1 text-xs text-slate-500">
            of {formatDuration(expected)} expected today
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The signed-in person's day from `GET /workday/me/today`: focus time (ticking
 * while the day is open), what pending approvals could still change, when the
 * day started, and any skipped break still waiting for a comment. No activity
 * figures: staff never see keyboard and mouse data.
 */
export function FocusTodayCard({ isApprover = false }: { isApprover?: boolean }) {
  const {
    data: day,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useWorkdayToday();

  if (isLoading) {
    return (
      <section className={cardBase}>
        <LoadingState label="Loading your day…" />
      </section>
    );
  }
  if (isError || !day) {
    return (
      <section className={cardBase}>
        <ErrorState
          title="Couldn't load your day"
          message={errorMessage(error)}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      </section>
    );
  }

  const chip = stateChip(day);
  const pending = pendingEffectLines(day.focus);
  const decided = decidedEffectLines(day.focus);
  const skips = Array.isArray(day.skipsNeedingComment) ? day.skipsNeedingComment : [];
  const sessions = Array.isArray(day.sessions) ? day.sessions : [];
  const late = day.lateStart && day.lateStart.minutes > 0 ? day.lateStart.minutes : 0;

  return (
    <div className="space-y-4">
      <section aria-labelledby="my-day" className={`${cardBase} space-y-5 p-4 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="my-day" className="text-base font-bold text-slate-900">
              Today{" "}
              <span className="ml-1 text-sm font-normal text-slate-500">
                {formatDayWithWeekday(day.date)}
              </span>
            </h2>
            {day.shift ? (
              <p className="mt-0.5 text-sm text-slate-600">
                {day.shift.name} shift, {day.shift.start} to {day.shift.end}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-slate-500">No shift set for today.</p>
            )}
          </div>
          <Chip tone={chip.tone} dot pulse={chip.live}>
            {chip.label}
          </Chip>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FocusNumber day={day} fetchedAt={dataUpdatedAt} />

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Day started
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {day.startedAt ? hmOf(day.startedAt) : "Not yet"}
                {late > 0 && (
                  <span className="ml-1.5 text-xs font-medium text-amber-700">
                    {late} min after your shift start
                  </span>
                )}
                {sessions.length > 1 && (
                  <span className="ml-1.5 text-xs font-normal text-slate-500">
                    {sessions.length} work sessions
                  </span>
                )}
              </dd>
            </div>
            {day.state === "ENDED" && day.endedAt && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Day ended
                </dt>
                <dd className="mt-0.5 font-semibold text-slate-900">
                  {hmOf(day.endedAt)}
                  {day.autoClosed && (
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      End Day was not pressed, so the day closed at your last activity.
                    </span>
                  )}
                </dd>
              </div>
            )}
            {(pending.length > 0 || decided.length > 0) && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Waiting for your manager
                </dt>
                <dd className="mt-0.5 space-y-0.5">
                  {pending.map((l) => (
                    <p
                      key={l.text}
                      className={`font-semibold ${l.tone === "plus" ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {l.text}
                    </p>
                  ))}
                  {pending.length === 0 && <p className="text-slate-600">Nothing pending.</p>}
                  {decided.map((l) => (
                    <p key={l.text} className="text-xs text-slate-500">
                      {l.text}
                    </p>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {day.state === "NOT_STARTED" && (
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
            <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            Press Start Day in the RX Vision app on your computer when you begin work. Nothing is
            recorded before that.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Focus time runs from Start Day to End Day, minus breaks. Meetings and skipped breaks count
          unless your manager rejects them.
        </p>
      </section>

      {skips.length > 0 && (
        <section
          aria-labelledby="skips-need-comment"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
        >
          <h2
            id="skips-need-comment"
            className="flex items-start gap-2 text-sm font-semibold text-amber-900"
          >
            <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            {skips.length === 1
              ? "A skipped break needs your comment"
              : `${skips.length} skipped breaks need your comment`}
          </h2>
          <p className="mt-1 text-sm text-amber-900">
            Add {skips.length === 1 ? "it" : "them"} in the RX Vision app before End Day.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-950">
            {skips.map((s) => (
              <li key={s.id}>
                <span className="font-semibold">{s.label}</span>, {dayWord(s.date)}:{" "}
                {s.outcome === "AUTO_SKIPPED" ? "skipped automatically" : "skipped"} at{" "}
                {hmOf(s.skippedAt)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isApprover && day.overdueApprovals > 0 && (
        <section
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
            <span>
              <span className="font-semibold">
                {day.overdueApprovals}{" "}
                {day.overdueApprovals === 1 ? "approval is" : "approvals are"} past{" "}
                {day.settings?.approvalSlaHours ?? 48} hours.
              </span>{" "}
              {day.endDayBlockedByOverdue
                ? "Decide them to end your day."
                : "They have gone to the Super Admins."}
            </span>
          </p>
          <Link
            href="/dashboard/approvals"
            className="shrink-0 font-semibold text-rose-900 underline underline-offset-2"
          >
            Open approvals
          </Link>
        </section>
      )}
    </div>
  );
}
