"use client";

import { useState } from "react";
import { CalendarRange, Home, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { daysText } from "@/features/leave/lib/format";
import { useCancelWfh, useMyWfh } from "@/features/wfh/hooks/useWfh";
import { myRuleText } from "@/features/wfh/lib/format";
import type { WfhRequestView, WfhScheduleView } from "@/features/wfh/types";

import { AskWfhDialog } from "./AskWfhDialog";
import { WfhRequestRow } from "./WfhBits";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** One of the person's schedules, read-only (whoever oversees them sets and ends it). */
export function ScheduleSummary({ s }: { s: WfhScheduleView }) {
  return (
    <li className="px-4 py-3 sm:px-5">
      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-primary">
        <CalendarRange className="h-4 w-4 text-brand" aria-hidden />
        {s.label}
        {s.state === "UPCOMING" && (
          <span className="text-xs font-normal text-quiet">
            from {formatDayWithWeekday(s.fromDate)}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-quiet">
        {s.toDate ? `Until ${formatDayWithWeekday(s.toDate)}` : "Until it is ended"}
        {s.createdByName ? ` · set by ${s.createdByName}` : ""}
        {s.next.length ? ` · next: ${s.next.map((n) => n.label).join(", ")}` : ""}
        {s.note ? ` · ${s.note}` : ""}
      </p>
    </li>
  );
}

/**
 * The signed-in person's own work from home (3.5 on 4.0): today, this month, what
 * is coming up, every request with where it stands, and the schedules set for
 * them. In 4.0 that is a Manager, an Admin or above asking for themselves (Staff
 * use the RX Vision app): a Manager's request goes to the organisation admin, an
 * admin's to the Super Admins, as `waitingFor` says.
 */
export function MyWfhPanel({ compact = false }: { compact?: boolean }) {
  const me = useMyWfh();
  const cancel = useCancelWfh();
  const [asking, setAsking] = useState(false);
  const [cancelling, setCancelling] = useState<WfhRequestView | null>(null);

  if (me.isLoading) return <LoadingState label="Loading your work from home…" />;
  if (me.isError || !me.data) {
    return (
      <ErrorState
        message={errorMessage(me.error)}
        onRetry={() => void me.refetch()}
        retrying={me.isFetching}
      />
    );
  }
  const d = me.data;
  const upcomingIds = new Set(d.upcoming.map((u) => u.id));
  const past = d.requests.filter((r) => !upcomingIds.has(r.id));
  const biometric = d.attendanceSource === "BIOMETRIC";

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      const saved = await cancel.mutateAsync(cancelling.id);
      toast.success(`Cancelled: ${saved.span}`);
      setCancelling(null);
    } catch (err) {
      toast.error("Couldn't cancel it", { description: errorMessage(err) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-primary">Work from home</h2>
          <p className="text-sm text-quiet">{myRuleText(d.policy, d.waitingFor)}</p>
        </div>
        <Button
          variant="primary"
          type="button"
          onClick={() => setAsking(true)}
          disabled={!d.policy.enabled}
        >
          <Home className="h-4 w-4" aria-hidden />
          Ask for work from home
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Card as="section" className="p-4 sm:p-5" aria-label="Today">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">Today</p>
          {d.todayWfh ? (
            <>
              <p className="mt-1 text-xl font-bold text-primary">
                Remote, {d.todayWfh.label.toLowerCase()}
              </p>
              <p className="mt-0.5 text-xs text-quiet">
                {d.todayWfh.source}
                {biometric ? ` · up to ${formatDuration(d.todayWfh.capSec)} counts` : ""}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xl font-bold text-primary">At the office</p>
          )}
          <p className="mt-2 flex items-start gap-1.5 text-xs text-quiet">
            <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {biometric
              ? "On a remote day, start and end your day on Today or in the RX Vision phone app."
              : "Your desktop app tracks the day at home as at the office."}
          </p>
        </Card>
        <Card as="section" className="p-4 sm:p-5" aria-label="This month">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
            This month
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-primary">
            {daysText(d.thisMonth.days)}
            {d.thisMonth.capDays !== null && (
              <span className="text-sm font-semibold text-quiet"> of {d.thisMonth.capDays}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-quiet">
            {d.thisMonth.capDays === null
              ? "No monthly cap."
              : `At most ${d.thisMonth.capDays} days a month, approved and waiting together.`}
            {d.thisMonth.waitingDays > 0 ? ` ${daysText(d.thisMonth.waitingDays)} waiting.` : ""}
          </p>
        </Card>
      </div>

      {d.schedules.length > 0 && (
        <Card as="section" aria-labelledby="wfh-schedules-mine">
          <h3
            id="wfh-schedules-mine"
            className="border-b border-divider px-4 py-3 text-sm font-bold text-primary sm:px-5"
          >
            Your schedule
          </h3>
          <ul className="divide-y divide-divider">
            {d.schedules.map((s) => (
              <ScheduleSummary key={s.id} s={s} />
            ))}
          </ul>
          <p className="border-t border-divider px-4 py-2.5 text-xs text-quiet sm:px-5">
            Scheduled days count as approved work from home; no request is needed. Whoever set it
            changes or ends it.
          </p>
        </Card>
      )}

      <Card as="section" aria-labelledby="wfh-upcoming">
        <h3
          id="wfh-upcoming"
          className="border-b border-divider px-4 py-3 text-sm font-bold text-primary sm:px-5"
        >
          Coming up
        </h3>
        {d.upcoming.length ? (
          <ul className="divide-y divide-divider">
            {d.upcoming.map((r) => (
              <WfhRequestRow key={r.id} r={r} onCancel={setCancelling} busy={cancel.isPending} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-quiet">No work from home coming up.</p>
        )}
      </Card>

      {!compact && (
        <Card as="section" aria-labelledby="wfh-history">
          <h3
            id="wfh-history"
            className="border-b border-divider px-4 py-3 text-sm font-bold text-primary sm:px-5"
          >
            Earlier requests
          </h3>
          {past.length ? (
            <ul className="divide-y divide-divider">
              {past.map((r) => (
                <WfhRequestRow key={r.id} r={r} onCancel={setCancelling} busy={cancel.isPending} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-quiet">Nothing earlier.</p>
          )}
        </Card>
      )}

      <AskWfhDialog open={asking} onClose={() => setAsking(false)} />
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() => void confirmCancel()}
        title="Cancel this work from home?"
        description={
          cancelling
            ? `${cancelling.span}, ${cancelling.daysLabel}.${cancelling.status === "APPROVED" ? " Your approver is told." : ""}`
            : undefined
        }
        confirmLabel={cancel.isPending ? "Cancelling…" : "Cancel it"}
        cancelLabel="Keep it"
        destructive
        loading={cancel.isPending}
      />
    </div>
  );
}
