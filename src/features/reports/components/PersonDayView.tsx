"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  Fingerprint,
  Home,
  CheckCircle2,
  ClipboardCheck,
  Info,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { errorMessage, errorStatus } from "@/lib/api";
import { formatDuration, formatMinutesShort, formatSignedAmount } from "@/lib/format/duration";
import { formatMinutes, todayKey } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { formatMonth, monthOfDate } from "@/lib/time/months";
import { canAccess, roleLabel } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { AdjustFocusDialog } from "@/features/adjustments/components/AdjustFocusDialog";
import { AdjustmentsList } from "@/features/adjustments/components/AdjustmentsList";
import { blockingApprovalsHref } from "@/features/approvals/lib/query";
import {
  compOffEarnedText,
  dayOffText,
  lateMinutes,
  lateReason,
  leaveText,
  meetingsCountNote,
  statusMeetingLine,
  wfhText,
} from "@/features/reports/lib/dayNotes";
import { InputBreakdown } from "@/features/reports/components/InputBreakdown";
import { useAppSettings } from "@/features/settings/hooks/useSettings";
import { usePersonDayReport } from "@/features/reports/hooks/useReports";
import { periodLabel, stepPeriod } from "@/features/reports/lib/period";
import { dayClassLook } from "@/features/reports/lib/labels";
import { focusSum } from "@/features/reports/lib/focusSum";
import { PAYROLL_PAUSED_LABEL, dayFigures, idleOfInput } from "@/features/reports/lib/timeFigures";
import { TimeFigures } from "@/features/reports/components/TimeFigures";
import {
  APPROVAL_LABEL,
  APPROVAL_TONE,
  isQuickBreak,
  overrunLabel,
  recordLabel,
  timingLabel,
  timingTone,
} from "@/features/breaks/lib/labels";
import {
  CategoryChip,
  DueChip,
  EffectChip,
  StatusChip,
} from "@/features/approvals/components/ApprovalChips";
import { NO_COMMENT_TEXT, decidedLine } from "@/features/approvals/lib/labels";
import { HourlyActivityChart } from "@/features/reports/components/HourlyActivityChart";
import { TimelineBar } from "@/features/reports/components/TimelineBar";
import {
  ActivityGate,
  Kpi,
  KpiGrid,
  ManagersOnly,
  ReportSection,
  TimelineGate,
  paidTimeSub,
  unverifiedNote,
  useCanSeeActivity,
} from "@/features/reports/components/ReportParts";
import { PrintButton, ReportShell, type Crumb } from "@/features/reports/components/ReportShell";
import type { ApprovalItemView } from "@/features/approvals/types";
import type { BreakRecordView } from "@/features/breaks/types";
import type { MeetingRecordView } from "@/features/meetings/types";
import type { PersonDayReport, ReportSkip } from "@/features/reports/types";
import { Th } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function personLine(report: PersonDayReport): string {
  const p = report.person;
  return [
    roleLabel(p.role),
    p.department,
    report.shift
      ? `${report.shift.name} shift, ${formatTime12(report.shift.start)} to ${formatTime12(report.shift.end)}`
      : "No shift",
  ]
    .filter(Boolean)
    .join(" · ");
}

function effectFor(
  approvals: ApprovalItemView[],
  type: "BREAK" | "MEETING",
  id: string,
): ApprovalItemView | undefined {
  return approvals.find(
    (a) =>
      (a.type === type && a.id === id) ||
      (type === "BREAK" ? a.break?.id === id : a.meeting?.id === id),
  );
}

/** One row of the breaks table, from a break record or a skip with no record. */
interface BreakRow {
  key: string;
  name: string;
  scheduled: string;
  when: string;
  result: ReactNode;
  reason: ReactNode;
  decision: ReactNode;
  effect: ReactNode;
}

function decisionCell(r: BreakRecordView): ReactNode {
  const status = r.approvalStatus;
  if (status === "NOT_REQUIRED")
    return <span className="text-xs text-quiet">No approval needed</span>;
  return (
    <span className="space-y-0.5">
      <Chip tone={APPROVAL_TONE[status] ?? "neutral"} dot={status === "PENDING"}>
        {APPROVAL_LABEL[status] ?? status}
      </Chip>
      {r.decidedByName && <span className="block text-xs text-quiet">by {r.decidedByName}</span>}
    </span>
  );
}

function breakRows(report: PersonDayReport): BreakRow[] {
  const rows: BreakRow[] = report.breaks.map((r) => {
    const skip = r.outcome === "SKIPPED" || r.outcome === "AUTO_SKIPPED";
    const approval = effectFor(report.approvals, "BREAK", r.id);
    const over = overrunLabel(r);
    const reasonText = r.reason?.trim() || r.overrunReason?.trim();
    const quick = isQuickBreak(r);
    return {
      key: r.id,
      name: recordLabel(r),
      scheduled:
        r.scheduledStart && r.durationMin
          ? `Due ${formatTime12(r.scheduledStart)}, ${r.durationMin} min`
          : quick
            ? "Any time, from the break buffer"
            : "Not on the schedule",
      when: skip
        ? `${r.outcome === "AUTO_SKIPPED" ? "Auto-skipped" : "Skipped"} at ${formatTime12(r.startedAt)}`
        : `${formatTime12(r.startedAt)} to ${r.endedAt ? formatTime12(r.endedAt) : "now"} · ${formatMinutes(r.tookSec ?? 0)}`,
      result: skip ? (
        <Chip tone={r.outcome === "SKIPPED" ? "violet" : "neutral"}>
          {r.outcome === "SKIPPED" ? "Skipped" : "Auto-skipped"}
        </Chip>
      ) : (
        <span className="flex flex-wrap gap-1">
          {quick ? (
            !over && <Chip tone="success">Within its length</Chip>
          ) : (
            <Chip tone={timingTone(r.timing)}>{timingLabel(r)}</Chip>
          )}
          {over && <Chip tone="danger">{over}</Chip>}
        </span>
      ),
      reason: reasonText ? (
        <span className="text-strong">&ldquo;{reasonText}&rdquo;</span>
      ) : (
        <span className="italic text-quiet">
          {r.needsComment ? NO_COMMENT_TEXT : "None needed"}
        </span>
      ),
      decision: decisionCell(r),
      effect: approval ? (
        <EffectChip item={approval} />
      ) : (
        <span className="text-xs text-quiet">No change</span>
      ),
    };
  });

  // Skips the server reported without a record in `breaks` (one per break kind).
  const recorded = new Set(
    report.breaks
      .filter((r) => r.outcome === "SKIPPED" || r.outcome === "AUTO_SKIPPED")
      .map((r) => r.kind),
  );
  report.skips
    .filter((s: ReportSkip) => !recorded.has(s.kind))
    .forEach((s) =>
      rows.push({
        key: `skip-${s.kind}-${s.at}`,
        name: s.label,
        scheduled: "",
        when: `${s.outcome === "AUTO_SKIPPED" ? "Auto-skipped" : "Skipped"} at ${formatTime12(s.at)}`,
        result: (
          <Chip tone={s.outcome === "SKIPPED" ? "violet" : "neutral"}>
            {s.outcome === "SKIPPED" ? "Skipped" : "Auto-skipped"}
          </Chip>
        ),
        reason: <span className="italic text-quiet">Not recorded</span>,
        decision: <span className="text-xs text-quiet">See Approvals</span>,
        effect: <span className="text-xs text-quiet">No change</span>,
      }),
    );
  return rows;
}

function BreaksTable({ rows }: { rows: BreakRow[] }) {
  if (rows.length === 0) {
    return <p className="px-4 pb-5 text-sm text-quiet sm:px-6">No breaks recorded on this day.</p>;
  }
  return (
    <>
      <ul className="divide-y divide-divider border-t border-divider lg:hidden print:hidden">
        {rows.map((r) => (
          <li key={r.key} className="space-y-1.5 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-primary">{r.name}</p>
              {r.result}
            </div>
            <p className="text-xs text-soft">{[r.scheduled, r.when].filter(Boolean).join(" · ")}</p>
            <p className="text-sm">{r.reason}</p>
            <div className="flex flex-wrap items-center gap-2">
              {r.decision}
              {r.effect}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto lg:block print:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-card bg-fill/70">
              <Th scope="col" className="pl-6">
                Break
              </Th>
              <Th scope="col">Taken</Th>
              <Th scope="col">Result</Th>
              <Th scope="col">Reason</Th>
              <Th scope="col">Decision</Th>
              <Th scope="col" className="pr-6">
                Focus time
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-divider align-top last:border-b-0">
                <th scope="row" className="py-3 pl-6 pr-4 text-left font-normal">
                  <span className="block font-semibold text-primary">{r.name}</span>
                  {r.scheduled && <span className="block text-xs text-quiet">{r.scheduled}</span>}
                </th>
                <td className="px-4 py-3 text-xs tabular-nums text-body">{r.when}</td>
                <td className="px-4 py-3">{r.result}</td>
                <td className="max-w-xs px-4 py-3 text-sm">{r.reason}</td>
                <td className="px-4 py-3">{r.decision}</td>
                <td className="py-3 pl-4 pr-6">{r.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MeetingsList({
  meetings,
  approvals,
}: {
  meetings: MeetingRecordView[];
  approvals: ApprovalItemView[];
}) {
  if (meetings.length === 0) {
    return <p className="text-sm text-quiet">No meetings logged on this day.</p>;
  }
  return (
    <ul className="divide-y divide-divider rounded-xl border border-card">
      {meetings.map((m) => {
        const approval = effectFor(approvals, "MEETING", m.id);
        const people = (m.participants ?? []).map((p) => p.name).filter(Boolean);
        return (
          <li
            key={m.id}
            className="grid gap-2 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-4"
          >
            <div>
              <p className="text-sm font-semibold tabular-nums text-primary">
                {formatTime12(m.startedAt)} to {m.endedAt ? formatTime12(m.endedAt) : "now"}
              </p>
              <p className="text-xs text-quiet">{formatDuration(m.durationSec)}</p>
            </div>
            <div className="min-w-0">
              {m.kind !== "STATUS" && (
                <p className="break-words text-sm text-primary">{m.agenda}</p>
              )}
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-quiet">
                <Chip tone="neutral">
                  {m.kind === "STATUS"
                    ? "In a meeting"
                    : m.mode === "PAST"
                      ? "Logged after"
                      : "Started live"}
                </Chip>
                {statusMeetingLine(m) && <span>{statusMeetingLine(m)}</span>}
                {people.length > 0 && (
                  <span className="inline-flex items-start gap-1 break-words">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    With {people.join(", ")}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-1.5 sm:flex-col sm:items-end">
              <Chip
                tone={APPROVAL_TONE[m.approvalStatus] ?? "neutral"}
                dot={m.approvalStatus === "PENDING"}
              >
                {m.approvalStatus === "NOT_REQUIRED"
                  ? "No approval needed"
                  : APPROVAL_LABEL[m.approvalStatus]}
              </Chip>
              {approval && <EffectChip item={approval} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ApprovalsList({ items, fetchedAt }: { items: ApprovalItemView[]; fetchedAt: number }) {
  if (items.length === 0) {
    return <p className="text-sm text-quiet">Nothing on this day needed a decision.</p>;
  }
  return (
    <ul className="divide-y divide-divider rounded-xl border border-card">
      {items.map((a) => {
        const decided = decidedLine(a);
        return (
          <li key={`${a.type}:${a.id}`} className="space-y-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryChip category={a.category} inProgress={a.inProgress} />
              <StatusChip status={a.status} />
              <EffectChip item={a} />
              <DueChip item={a} fetchedAt={fetchedAt} />
            </div>
            <p className="break-words text-sm font-semibold text-primary">{a.title}</p>
            <p className="break-words text-xs text-soft">{a.detail}</p>
            {a.reason && <p className="break-words text-sm text-body">&ldquo;{a.reason}&rdquo;</p>}
            {decided && (
              <p
                className={`text-xs ${a.status === "REJECTED" ? "text-attention" : "text-working"}`}
              >
                {decided}
                {a.decisionNote ? `. Note: ${a.decisionNote}` : "."}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One person, one day: the totals, a timeline from Start Day to End Day, every
 * break and skip with its reason and decision, the meetings, the approvals, and
 * activity by hour for managers.
 */
export function PersonDayView({
  userId,
  date,
  back,
  autoPrint,
}: {
  userId: string;
  date: string;
  back: { href: string; label: string } | null;
  autoPrint: boolean;
}) {
  const router = useRouter();
  const today = todayKey();
  const query = usePersonDayReport(userId, date);
  const settings = useAppSettings();
  const canSeeActivity = useCanSeeActivity();
  const report = query.data;
  const name = report?.person.name ?? "Day report";
  // 3.3: the Super Manager corrects a day's focus time by hand from here, while
  // the organisation allows it; everyone who reads the day sees the trail.
  const { role, me } = useSession();
  const [adjusting, setAdjusting] = useState(false);
  const canAdjust =
    me?.permissions?.canAdjustFocus === true &&
    settings.data?.focusAdjustmentsEnabled !== false &&
    report?.person.id !== me?.id;
  const adjustments = report?.adjustments ?? [];
  const punches = report?.punches ?? [];
  const liveAdjustments = adjustments.filter((a) => !a.voidedAt);
  const adjustmentsHref = "/dashboard/focus-adjustments";

  const rows = useMemo(() => (report ? breakRows(report) : []), [report]);

  const go = (d: string) =>
    router.replace(`/dashboard/reports/person/${encodeURIComponent(userId)}?date=${d}`, {
      scroll: false,
    });
  const prev = stepPeriod({ kind: "day", date }, -1, today);
  const next = stepPeriod({ kind: "day", date }, 1, today);

  const crumbs: Crumb[] = [
    { label: "Reports", href: "/dashboard/reports" },
    {
      label: `${name}, ${formatMonth(monthOfDate(date))}`,
      href: `/dashboard/reports/person/${encodeURIComponent(userId)}?month=${monthOfDate(date)}`,
    },
    { label: periodLabel({ kind: "day", date }, today) },
  ];

  const shell = (children: ReactNode) => (
    <ReportShell
      crumbs={crumbs}
      back={back}
      title={name}
      subtitle={
        report
          ? `${personLine(report)} · ${periodLabel({ kind: "day", date }, today)}`
          : periodLabel({ kind: "day", date }, today)
      }
      stepper={{
        label: periodLabel({ kind: "day", date }, today).replace(", today", ""),
        prevLabel: "Previous day",
        nextLabel: "Next day",
        onPrev: prev?.kind === "day" ? () => go(prev.date) : undefined,
        onNext: next?.kind === "day" ? () => go(next.date) : undefined,
      }}
      actions={<PrintButton disabled={!report} />}
      autoPrint={autoPrint}
      ready={Boolean(report) && !query.isPlaceholderData}
    >
      {children}
    </ReportShell>
  );

  if (query.isLoading)
    return shell(
      <Card>
        <LoadingState label="Loading the day report…" />
      </Card>,
    );
  // A failed refresh keeps the report on screen (see the notice below); only a
  // report that never loaded shows the error.
  if (!report) {
    const status = errorStatus(query.error);
    return shell(
      <Card>
        {status === 403 || status === 404 ? (
          <EmptyState
            icon={Info}
            title={status === 403 ? "Not in your reports" : "No such person"}
            message={
              status === 403
                ? "You can report on the people who report to you."
                : "They may have been removed. Pick someone else from Reports."
            }
          />
        ) : (
          <ErrorState
            title="Couldn't load the day report"
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        )}
      </Card>,
    );
  }

  const s = report.summary;
  const look = dayClassLook(s.dayClass);
  // 4.0: the day's target (shift minus the paid break allowance, SPEC 2.4).
  const expected = Math.max(0, s.targetSec || s.expectedSec);
  const pct = expected ? Math.round((s.focusSec / expected) * 100) : 0;
  const fullPct = settings.data?.fullDayPct ?? 80;
  const spanText =
    s.startedAt && s.endedAt
      ? `${formatTime12(s.startedAt)} to ${formatTime12(s.endedAt)}`
      : s.startedAt
        ? `${formatTime12(s.startedAt)} to now`
        : "Did not start";
  const pendingApprovals = report.approvals.filter((a) => a.status === "PENDING");
  const quietBelow = settings.data?.quietHourActiveMin ?? 20;
  // The pending items of this day's month, across the organisation for a Super Admin.
  const approvalsHref = blockingApprovalsHref(monthOfDate(date), role === "SUPER_ADMIN");
  const offText = dayOffText(s);
  const late = lateMinutes(s);
  const reason = lateReason(s);
  const input = report.input;
  const activeSec = input ? input.activeSec : s.activeMin * 60;
  const meetingsNote = meetingsCountNote(report.meetings);

  return shell(
    <div className={`space-y-5 ${query.isPlaceholderData ? "opacity-60 transition-opacity" : ""}`}>
      {query.isError && (
        <RefreshFailedNotice
          what="this report"
          updatedAt={query.dataUpdatedAt}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      )}
      {leaveText(s) && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-2xl border border-meeting-edge bg-meeting-wash px-4 py-3 text-sm text-meeting-ink"
        >
          <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-meeting" aria-hidden />
          <span>
            <span className="font-semibold">{leaveText(s)}.</span>{" "}
            {s.leave?.full
              ? "Nothing is expected this day; work done anyway counts as an extra day."
              : s.leave && s.leave.days > 0
                ? "The day is judged on the rest of the shift, and a late start counts from the end of the leave."
                : ""}
          </span>
        </div>
      )}
      {s.payrollPaused && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-2xl border border-card bg-fill px-4 py-3 text-sm text-strong"
        >
          <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-quiet" aria-hidden />
          <span>
            <span className="block font-semibold">{PAYROLL_PAUSED_LABEL}</span>
            The day is tracked as usual; its paid time is not calculated.
          </span>
        </div>
      )}
      {wfhText(s) && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-2xl border border-brand/25 bg-brand/5 px-4 py-3 text-sm text-strong"
        >
          <Home className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            <span className="font-semibold">{wfhText(s)}.</span>{" "}
            {typeof s.wfhSec === "number" && s.wfhSec > 0
              ? `${formatDuration(s.wfhSec)} remote counted${(s.wfhOverSec ?? 0) > 0 ? `; ${formatDuration(s.wfhOverSec ?? 0)} over the day's cap was not` : ""}.`
              : "Tracked by the desktop app as usual."}
          </span>
        </div>
      )}
      {(compOffEarnedText(s) || s.noCheckout) && (
        <div
          role="note"
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${s.noCheckout ? "border-attention-edge bg-attention-wash text-attention-ink" : "border-working-edge bg-working-wash text-working-ink"}`}
        >
          <Fingerprint
            className={`mt-0.5 h-4 w-4 shrink-0 ${s.noCheckout ? "text-attention" : "text-working"}`}
            aria-hidden
          />
          <span>
            {compOffEarnedText(s) && (
              <span className="font-semibold">{compOffEarnedText(s)}. </span>
            )}
            {s.noCheckout
              ? "No check-out was recorded: the day was closed at the last punch. The organisation admin can add the missing punch in Attendance."
              : ""}
          </span>
        </div>
      )}
      {punches.length > 0 && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-2xl border border-card bg-fill px-4 py-3 text-sm text-body"
        >
          <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-quiet" aria-hidden />
          <span className="min-w-0">
            <span className="font-semibold">Punches: </span>
            <span className="inline-flex flex-wrap gap-1.5 align-middle">
              {punches.map((p, i) => (
                <span
                  key={`${p.at}-${i}`}
                  className={`rounded-md border px-1.5 py-0.5 font-mono text-xs ${p.voided ? "border-card text-quiet line-through" : "border-card bg-card text-strong"}`}
                  title={`${p.deviceId} · ${p.source.toLowerCase()}${p.voided ? " · voided" : ""}`}
                >
                  {formatTime12(p.at)}
                  {p.direction === "IN" ? " in" : p.direction === "OUT" ? " out" : ""}
                </span>
              ))}
            </span>
          </span>
        </div>
      )}
      {offText && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-2xl border border-brand-edge bg-brand-wash px-4 py-3 text-sm text-brand-ink"
        >
          <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            <span className="font-semibold">{offText}.</span>{" "}
            {s.startedAt
              ? "They started the day anyway: the usual shift rules applied and the hours count."
              : "Nothing was expected on this day."}
          </span>
        </div>
      )}
      {s.pending > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-2xl border border-attention-edge bg-attention-wash px-4 py-3 text-sm text-attention-ink sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            <span className="font-semibold">
              {s.pending} {s.pending === 1 ? "approval is" : "approvals are"} still open.
            </span>{" "}
            {[
              s.pendingPlusSec >= 60
                ? `${formatSignedAmount(s.pendingPlusSec)} could go back into focus time`
                : null,
              s.pendingMinusSec >= 60
                ? `${formatSignedAmount(-s.pendingMinusSec)} could come off`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
            {s.pendingPlusSec >= 60 || s.pendingMinusSec >= 60 ? "." : ""}
          </p>
          <Link
            href={approvalsHref}
            className="shrink-0 font-semibold text-attention-ink underline underline-offset-2 print:hidden"
          >
            Review approvals
          </Link>
        </div>
      ) : report.approvals.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-working-edge bg-working-wash px-4 py-3 text-sm text-working-ink"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-working" aria-hidden />
          <span>
            <span className="font-semibold">
              {report.approvals.length === 1
                ? "Everything is decided."
                : `All ${report.approvals.length} decisions made.`}
            </span>{" "}
            These hours go into the {formatMonth(monthOfDate(date))} report.
          </span>
        </div>
      ) : null}

      <TimeFigures figures={dayFigures(s, idleOfInput(input))} showIdle={canSeeActivity} />

      <KpiGrid wide>
        <Kpi
          label="Focus time"
          value={formatDuration(s.focusSec)}
          meter={expected ? Math.min(100, pct) : undefined}
          sub={[
            expected
              ? `${pct}% of the ${formatDuration(expected)} target`
              : s.label
                ? `${s.label}: no target`
                : "Not a working day: no target",
            unverifiedNote(s.unverifiedSec) && `${unverifiedNote(s.unverifiedSec)}, not counted`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        {/* 3.6: a paused day's payroll (its paid time) is not calculated. */}
        <Kpi
          label={s.payrollPaused ? "Paid time" : "Paid time, for payroll"}
          value={s.payrollPaused ? "Paused" : formatDuration(s.paidSec)}
          sub={s.payrollPaused ? PAYROLL_PAUSED_LABEL : paidTimeSub(s.paidBreakSec)}
        />
        <Kpi
          label="Attendance"
          value={look.label}
          tone={s.dayClass === "ABSENT" ? "danger" : s.dayClass === "HALF" ? "warning" : "default"}
          sub={
            expected
              ? `A full day needs ${formatDuration((expected * fullPct) / 100)} of focus time`
              : undefined
          }
        />
        <Kpi
          label="Start to end of day"
          value={spanText}
          sub={
            [
              late
                ? `${formatMinutesShort(late)} late start${reason ? `. Reason: ${reason}` : ", no reason given"}`
                : s.startedAt
                  ? "Started on time"
                  : null,
              s.autoClosed ? "closed automatically, End Day was not pressed" : null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          tone={late ? "warning" : "default"}
        />
        <Kpi
          label="Meetings"
          value={formatDuration(s.meetingSec)}
          sub={`${s.meetings} logged · ${meetingsNote}`}
        />
        <Kpi
          label="Breaks"
          value={`${formatDuration(s.paidBreakSec)} paid`}
          tone={s.unpaidBreakSec > 0 ? "warning" : "default"}
          sub={`${formatDuration(s.unpaidBreakSec)} unpaid · ${formatDuration(s.breakSec)} in all · ${s.breaksTaken} taken · ${s.skipped + s.autoSkipped} skipped${s.overruns ? ` · ${s.overruns} ran over` : ""}`}
        />
        <Kpi
          label="Away with a reason"
          value={`${formatDuration(s.awayApprovedSec)} approved`}
          tone={s.awayPendingSec > 0 ? "warning" : "default"}
          sub={
            [
              s.awayPendingSec > 0
                ? `${formatDuration(s.awayPendingSec)} waiting for a decision`
                : null,
              s.awayRejectedSec > 0 ? `${formatDuration(s.awayRejectedSec)} rejected` : null,
              s.awayUnexplainedSec > 0
                ? `${formatDuration(s.awayUnexplainedSec)} not explained`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Approved time away counts as focus"
          }
        />
        <Kpi
          label="Activity"
          managersOnly
          value={`${formatDuration(activeSec)} active`}
          tone={s.quietHours ? "warning" : "default"}
          sub={`${
            input && input.availableSec > 0
              ? `${Math.round((input.activeSec / input.availableSec) * 100)}% of ${formatDuration(input.availableSec)} available · `
              : ""
          }${s.quietHours} quiet ${s.quietHours === 1 ? "hour" : "hours"} · never changes focus time`}
        />
      </KpiGrid>

      <ReportSection
        title="The day, start to end"
        subtitle={`Focus time: ${focusSum(s)}. ${s.payrollPaused ? `${PAYROLL_PAUSED_LABEL}: no paid time.` : `Paid time adds the paid breaks: ${formatDuration(s.paidSec)}.`} Meetings are ${meetingsNote}.`}
      >
        {/* The work and break spans are the timeline grant's (SPEC 1.2). */}
        <TimelineGate>
          <TimelineBar timeline={report.timeline} skips={report.skips} />
        </TimelineGate>
      </ReportSection>

      <ReportSection
        title="Breaks and skips"
        subtitle={`${s.breaksTaken} taken, ${s.skipped} skipped, ${s.autoSkipped} auto-skipped${s.overruns ? `, ${s.overruns} ran over` : ""}`}
        flush
      >
        <BreaksTable rows={rows} />
      </ReportSection>

      <ReportSection
        title="Meetings"
        subtitle={`${report.meetings.length} logged · ${formatDuration(s.meetingSec)} · ${meetingsNote}`}
      >
        <MeetingsList meetings={report.meetings} approvals={report.approvals} />
      </ReportSection>

      <ReportSection
        title="Approvals"
        subtitle={`${report.approvals.length} on this day · ${pendingApprovals.length} pending`}
        aside={
          pendingApprovals.length > 0 ? (
            <Link
              href={approvalsHref}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-2 hover:underline print:hidden"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              Open Approvals
            </Link>
          ) : null
        }
      >
        <ApprovalsList items={report.approvals} fetchedAt={query.dataUpdatedAt} />
      </ReportSection>

      {(canAdjust || adjustments.length > 0) && (
        <ReportSection
          title="Adjusted by hand"
          subtitle={
            liveAdjustments.length
              ? `${liveAdjustments.length} in force: ${formatSignedAmount(
                  liveAdjustments.reduce((sum, a) => sum + a.deltaSec, 0),
                )} on this day's focus time, paid time and reports.`
              : "Nothing changed by hand on this day."
          }
          aside={
            canAdjust ? (
              <Button
                variant="small"
                type="button"
                onClick={() => setAdjusting(true)}
                className="print:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Adjust focus time
              </Button>
            ) : canAccess(role, adjustmentsHref) ? (
              <Link
                href={adjustmentsHref}
                className="text-sm font-semibold text-brand underline-offset-2 hover:underline print:hidden"
              >
                All adjustments
              </Link>
            ) : null
          }
          flush={adjustments.length > 0}
        >
          {adjustments.length > 0 ? (
            <AdjustmentsList
              items={adjustments}
              canVoid={canAdjust}
              showOrg={false}
              showPerson={false}
              embedded
            />
          ) : (
            <p className="text-sm text-quiet">
              When an agent missed something and the day&apos;s focus time is wrong, add or take off
              minutes here. {name} is told, with the reason, and every report follows.
            </p>
          )}
        </ReportSection>
      )}

      {input !== undefined && (
        <ReportSection
          title="Active and idle time"
          subtitle="Keyboard and mouse input while working, not on a break or in a meeting."
          aside={<ManagersOnly />}
        >
          {input === null ? (
            <p className="text-sm text-quiet">
              The input for this day could not be read. Try again later.
            </p>
          ) : (
            <InputBreakdown input={input} />
          )}
        </ReportSection>
      )}

      <ReportSection
        title="Keyboard and mouse activity, by hour"
        subtitle="Active minutes in each hour. It never changes focus time."
        aside={<ManagersOnly />}
      >
        <ActivityGate>
          <HourlyActivityChart
            hours={report.hourly}
            name={name}
            startedAt={s.startedAt}
            // A day still running ends now: a night shift past midnight wraps.
            endedAt={s.endedAt ?? (s.startedAt && date === today ? new Date().toISOString() : null)}
            quietBelow={quietBelow}
          />
        </ActivityGate>
      </ReportSection>

      {canAdjust && (
        <AdjustFocusDialog
          open={adjusting}
          onClose={() => setAdjusting(false)}
          person={{ id: report.person.id, name: report.person.name }}
          date={date}
        />
      )}
    </div>,
  );
}
