"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { FieldError, Textarea } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { HISTORY_ROUTE } from "@/constants/roles";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useDayProgress } from "@/features/avatars/hooks/useAvatars";
import type { DayProgress } from "@/features/avatars/types";
import { useMyMonthReport } from "@/features/reports/hooks/useReports";
import { usePresetsFor } from "@/features/settings/hooks/usePresets";
import { liveFocusSec, pendingEffectLines } from "@/features/workday/lib/focus";
import type { WorkdayTodayView } from "@/features/workday/types";
import { errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { formatTime12, formatTimeRange12 } from "@/lib/time/format";
import { monthOfDate } from "@/lib/time/months";
import {
  TODAY_REFRESH_MS,
  useMyDayReport,
  useRemoteDay,
  useSubmitLateReason,
  useWorkdayToday,
} from "@/features/myday/hooks/useMyDay";
import { REMOTE_LABEL, remoteRunning } from "@/features/myday/lib/remote";
import {
  DEFAULT_REASON_MIN,
  lateReasonProblem,
  needsLateReason,
} from "@/features/myday/lib/lateReason";
import { monthPace } from "@/features/myday/lib/pace";
import {
  BreaksList,
  MeetingsList,
  Meter,
  Notice,
  PunchesList,
  Section,
} from "@/features/myday/components/DayParts";

/** The time now, every second while `active` (a running focus clock). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

/** The day in a word, as the phone app's Today: what the person is doing right now. */
export function dayStatus(
  day: Pick<WorkdayTodayView, "state" | "dayOff" | "leave"> &
    Partial<Pick<WorkdayTodayView, "sessions">>,
  live: DayProgress["status"] | undefined,
): { label: string; tone: ChipTone; pulse: boolean } {
  if (day.state === "NOT_STARTED") {
    if (day.leave?.full) return { label: "On leave", tone: "violet", pulse: false };
    if (day.dayOff) {
      const label = day.dayOff.kind === "HOLIDAY" ? day.dayOff.name || "Holiday" : "Day off";
      return { label, tone: "neutral", pulse: false };
    }
    return { label: "Not started", tone: "neutral", pulse: false };
  }
  if (day.state === "ENDED") return { label: "Day ended", tone: "neutral", pulse: false };
  if (live === "BREAK") return { label: "On a break", tone: "warning", pulse: true };
  if (live === "MEETING") return { label: "In a meeting", tone: "violet", pulse: true };
  // 4.1: a remote day (started from the portal or the phone) reads Remote, not Working.
  if (remoteRunning({ state: day.state, sessions: day.sessions ?? [] })) {
    return { label: REMOTE_LABEL, tone: "info", pulse: true };
  }
  return { label: "Working", tone: "success", pulse: true };
}

function FocusCard({
  day,
  fetchedAt,
  live,
}: {
  day: WorkdayTodayView;
  fetchedAt: number;
  live?: DayProgress["status"];
}) {
  const now = useNow(day.focus.running);
  const focus = liveFocusSec(day.focus, fetchedAt, now);
  const target = day.expectedSec;
  const status = dayStatus(day, live);
  const biometric = day.attendance?.source === "BIOMETRIC";
  const pending = pendingEffectLines(day.focus);
  const hours =
    day.workingFrom || day.workingUntil
      ? formatTimeRange12(day.workingFrom, day.workingUntil)
      : day.shift
        ? formatTimeRange12(day.shift.start, day.shift.end)
        : null;
  return (
    <Section
      title="Focus time"
      aside={
        <Chip tone={status.tone} dot pulse={status.pulse}>
          {status.label}
        </Chip>
      }
    >
      <p className="text-3xl font-bold tabular-nums text-primary">
        {formatDuration(focus)}
        {target > 0 && (
          <span className="ml-2 text-sm font-medium text-quiet">
            of {formatDuration(target)} target
          </span>
        )}
      </p>
      {target > 0 && (
        <div className="mt-3">
          <Meter
            value={focus / target}
            label="Focus time against today's target"
            tone={focus >= target ? "working" : "brand"}
          />
        </div>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-quiet">Started</dt>
          <dd className="font-semibold text-primary">{formatTime12(day.startedAt) || "Not yet"}</dd>
        </div>
        <div>
          <dt className="text-xs text-quiet">Ended</dt>
          <dd className="font-semibold text-primary">
            {day.state === "ENDED" ? formatTime12(day.endedAt) || "Not recorded" : "Not yet"}
            {day.autoClosed && (
              <span className="ml-1 text-xs text-quiet">(closed automatically)</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-quiet">Breaks</dt>
          <dd className="font-semibold text-primary">{formatDuration(day.focus.breakSec)}</dd>
        </div>
        <div>
          <dt className="text-xs text-quiet">{day.shift?.name ?? "Shift"}</dt>
          <dd className="font-semibold text-primary">{hours || "No shift"}</dd>
        </div>
      </dl>
      {pending.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {pending.map((line) => (
            <li
              key={line.text}
              className={line.tone === "plus" ? "text-working" : "text-attention"}
            >
              {line.text}
            </li>
          ))}
        </ul>
      )}
      {day.state === "NOT_STARTED" && !day.dayOff && !day.leave?.full && (
        <p className="mt-3 text-sm text-quiet">
          {biometric
            ? "Your day starts at your first punch on the attendance device."
            : "Start your day in the RX Vision app on your computer."}
        </p>
      )}
    </Section>
  );
}

function LateReasonCard({ day }: { day: WorkdayTodayView }) {
  const presets = usePresetsFor("LATE_DAY_START");
  const submit = useSubmitLateReason();
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const minChars = day.settings?.reasonMinChars || DEFAULT_REASON_MIN;
  const problem = lateReasonProblem(text, minChars, presets);
  const minutes = day.lateStart?.minutes ?? 0;

  async function send() {
    setTried(true);
    if (problem) return;
    try {
      await submit.mutateAsync({ reason: text.trim(), date: day.date });
      toast.success("Reason saved");
      setText("");
      setTried(false);
    } catch (err) {
      toast.error(errorMessage(err) ?? "Couldn't save the reason");
    }
  }

  return (
    <Section title="Late start">
      <p className="mb-3 text-sm text-body">
        Your day started {formatDuration(minutes * 60)} late. Say why, for your manager.
      </p>
      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <ChoiceChip key={p} on={text.trim() === p} onClick={() => setText(p)}>
              {p}
            </ChoiceChip>
          ))}
        </div>
      )}
      <Textarea
        aria-label="Why the day started late"
        rows={3}
        value={text}
        invalid={tried && Boolean(problem)}
        onChange={(e) => setText(e.target.value)}
        placeholder={`At least ${minChars} characters, or pick an answer above`}
      />
      {tried && problem && <FieldError>{problem}</FieldError>}
      <div className="mt-3 flex justify-end">
        <Button variant="primary" onClick={() => void send()} disabled={submit.isPending}>
          {submit.isPending ? "Saving…" : "Save reason"}
        </Button>
      </div>
    </Section>
  );
}

function TodayNotes({ day }: { day: WorkdayTodayView }) {
  const lines: { key: string; text: string; tone: ChipTone }[] = [];
  const leave = day.leave;
  if (leave && leave.days > 0) {
    lines.push({
      key: "leave",
      text: `${leave.categories || "Leave"} leave, ${leave.full ? "full day" : leave.label}`,
      tone: "violet",
    });
  }
  if (leave && leave.pendingDays > 0) {
    lines.push({
      key: "leave-wait",
      text: "Leave asked for today, waiting for a decision",
      tone: "warning",
    });
  }
  if (day.lateStart && day.lateStart.reason) {
    lines.push({
      key: "late",
      text: `Started ${formatDuration(day.lateStart.minutes * 60)} late: ${day.lateStart.reason}`,
      tone: "neutral",
    });
  }
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {lines.map((l) => (
        <Chip key={l.key} tone={l.tone} wrap>
          {l.text}
        </Chip>
      ))}
    </div>
  );
}

/**
 * Work from home today. 4.1: biometric staff start (or resume) and end their remote day here,
 * as on the phone; the day reads Remote while it runs.
 */
function WfhCard({ day }: { day: WorkdayTodayView }) {
  const { start, end } = useRemoteDay();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const wfh = day.wfh;
  if (!wfh || (wfh.days <= 0 && wfh.pendingDays <= 0)) return null;
  const biometric = day.attendance?.source === "BIOMETRIC";
  if (wfh.days <= 0) {
    return (
      <Section title={REMOTE_LABEL}>
        <Notice>
          Work from home asked for today, waiting for a decision. Until it is approved the day is
          recorded as usual.
        </Notice>
      </Section>
    );
  }
  const used = day.focus.wfhSec ?? 0;
  const over = day.focus.wfhOverSec ?? 0;
  const busy = start.isPending || end.isPending;

  async function run(action: () => Promise<void>, done: string) {
    try {
      await action();
      toast.success(done);
    } catch (err) {
      toast.error(errorMessage(err) ?? "That didn't work. Try again in a moment.");
    }
  }

  return (
    <Section title={REMOTE_LABEL} aside={<Chip tone="info">{wfh.sourceLabel || wfh.label}</Chip>}>
      <p className="text-sm text-body">
        Working remotely today, {wfh.label.charAt(0).toLowerCase()}
        {wfh.label.slice(1)}.{" "}
        {biometric
          ? `Start and end your day here or on the phone; up to ${formatDuration(wfh.capSec)} counts.`
          : "Your desktop app tracks the day as usual."}
      </p>
      {biometric && wfh.capSec > 0 && (remoteRunning(day) || used > 0 || over > 0) && (
        <div className="mt-3 space-y-1.5">
          <Meter value={used / wfh.capSec} label="Remote time against today's cap" />
          <p className={`text-xs ${over > 0 ? "font-semibold text-attention" : "text-quiet"}`}>
            {over > 0
              ? `Cap reached: ${formatDuration(used)} remote counted, ${formatDuration(over)} over it does not.`
              : day.focus.capRemainingSec != null
                ? `${formatDuration(used)} remote so far, ${formatDuration(day.focus.capRemainingSec)} left under the cap.`
                : `${formatDuration(used)} remote counted today.`}
          </p>
        </div>
      )}
      {biometric && (
        <div className="mt-4">
          {wfh.canStart ? (
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void run(() => start.mutateAsync(), "Your remote day has started.")}
            >
              {start.isPending
                ? "Starting…"
                : day.state === "NOT_STARTED"
                  ? "Start your remote day"
                  : "Resume remote day"}
            </Button>
          ) : wfh.canEnd ? (
            <Button variant="attention-outline" disabled={busy} onClick={() => setConfirmEnd(true)}>
              {end.isPending ? "Ending…" : "End your day"}
            </Button>
          ) : wfh.startBlocked ? (
            <p className="text-sm text-quiet">{wfh.startBlocked}</p>
          ) : null}
        </div>
      )}
      <ConfirmDialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End your day?"
        description="Your remote day ends now. You can start again later today if work continues."
        confirmLabel="End day"
        cancelLabel="Keep working"
        destructive
        loading={end.isPending}
        onConfirm={() => {
          setConfirmEnd(false);
          void run(() => end.mutateAsync(), "Your day has ended.");
        }}
      />
    </Section>
  );
}

function MonthRow() {
  const today = todayKey();
  const month = useMyMonthReport(monthOfDate(today));
  if (!month.data) return null;
  const pace = monthPace(month.data, today);
  if (pace.target <= 0) return null;
  const focus = month.data.totals.focusSec;
  return (
    <Link
      href={HISTORY_ROUTE}
      className="block rounded-2xl border border-card bg-card p-4 shadow-sm transition hover:bg-fill sm:p-5"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-quiet">
            <span className="font-semibold text-soft">This month</span>{" "}
            <span className="text-lg font-bold tabular-nums text-primary">
              {formatDuration(focus)}
            </span>{" "}
            {pace.targetText}
          </p>
          <Meter
            value={focus / pace.target}
            mark={pace.mark}
            label="This month's focus time against the target"
          />
          {pace.track && (
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={pace.trackTone}>{pace.track}</Chip>
              {pace.left && <span className="text-sm text-soft">{pace.left}</span>}
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-quiet" aria-hidden />
      </div>
    </Link>
  );
}

/**
 * 4.1 Today, Staff's home on the portal (the phone app's Today): focus time and what the
 * person is doing, a late start's reason, leave and work from home today, a biometric
 * person's punches, today's breaks and meetings, and the month's pace. Read every 30 s and
 * on every `workday:changed` push.
 */
export function TodayView() {
  const day = useWorkdayToday();
  const progress = useDayProgress();
  const data = day.data;
  const report = useMyDayReport(data?.date ?? null, { refetchMs: TODAY_REFRESH_MS });

  if (day.isPending) return <LoadingState label="Loading your day…" />;
  if (day.isError || !data) {
    return (
      <ErrorState
        title="Couldn't load your day"
        message={errorMessage(day.error)}
        onRetry={() => void day.refetch()}
        retrying={day.isFetching}
      />
    );
  }

  const biometric = data.attendance?.source === "BIOMETRIC";
  const breaks = report.data?.breaks ?? [];
  const meetings = report.data?.meetings ?? [];
  const punches = data.punches ?? report.data?.punches ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title="Today" subtitle={formatDayWithWeekday(data.date)} />
      <TodayNotes day={data} />
      <FocusCard day={data} fetchedAt={day.dataUpdatedAt} live={progress.data?.status} />
      {needsLateReason(data) && <LateReasonCard day={data} />}
      <WfhCard day={data} />
      {biometric && (
        <Section
          title="Punches"
          aside={
            data.attendance?.biometricCode ? (
              <span className="text-xs text-quiet">Code {data.attendance.biometricCode}</span>
            ) : undefined
          }
        >
          {data.checkoutMissing && (
            <div className="mb-3">
              <Notice>
                No check-out was recorded: the day was closed at your last punch. If you left later,
                tell the organisation admin so the missing punch can be added.
              </Notice>
            </div>
          )}
          <PunchesList punches={punches} />
        </Section>
      )}
      {!biometric && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Breaks">
            <BreaksList breaks={breaks} />
          </Section>
          <Section title="Meetings">
            <MeetingsList meetings={meetings} />
          </Section>
        </div>
      )}
      <MonthRow />
    </div>
  );
}
