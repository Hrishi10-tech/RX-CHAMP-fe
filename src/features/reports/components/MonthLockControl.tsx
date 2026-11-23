"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Loader2, Lock, LockOpen, X } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { errorCode, errorDetails, errorMessage, errorStatus } from "@/lib/api";
import { formatDayLong, formatMonth, monthOfDate } from "@/lib/time/months";
import { dateKeyOf, todayKey } from "@/lib/time/businessTime";
import { useMonthLock, useMonthLockMutation } from "@/features/reports/hooks/useReports";
import { blockingApprovalsHref } from "@/features/approvals/lib/query";
import { LockBlockers } from "@/features/reports/components/LockBlockers";
import type { MonthLockBlockers } from "@/features/reports/types";
import { REPORT_NOTICES_ID } from "@/features/reports/components/ReportShell";
import { Button } from "@/components/ui/Button";

/** 3.6 (W-08): under the report header when there is one, else in place. */
function Notices({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById(REPORT_NOTICES_ID)), []);
  return target ? createPortal(children, target) : <>{children}</>;
}

/** "Locked for payroll by Neha Iyer on 2 Oct 2026". */
function lockedLine(lockedByName: string | null, lockedAt: string | null): string {
  const by = lockedByName ? ` by ${lockedByName}` : "";
  if (!lockedAt) return `Locked for payroll${by}`;
  const at = new Date(lockedAt);
  return Number.isNaN(at.getTime())
    ? `Locked for payroll${by}`
    : `Locked for payroll${by} on ${formatDayLong(dateKeyOf(at))}`;
}

/**
 * The month's lock state as a chip, for every reader of a month report.
 *
 * `pending` is the report's own count of open approvals (the person's, or the
 * people's in the report), so the chip agrees with the page beside it. Without
 * it the chip counts the whole month, and says so.
 */
export function MonthLockChip({ month, pending }: { month: string; pending?: number }) {
  const lock = useMonthLock(month);
  if (!lock.data) return null;
  if (lock.data.locked) {
    return (
      <Chip
        tone="success"
        icon={Lock}
        title={lockedLine(lock.data.lockedByName, lock.data.lockedAt)}
      >
        Locked for payroll
      </Chip>
    );
  }
  const open = pending ?? lock.data.pending;
  if (open <= 0) return <Chip tone="neutral">Not locked</Chip>;
  const monthName = formatMonth(month);
  return (
    <Chip
      tone="warning"
      dot
      title={
        pending === undefined
          ? undefined
          : `${lock.data.pending} open in ${monthName} in all. It can be locked for payroll once every one is decided.`
      }
    >
      {open} {open === 1 ? "approval" : "approvals"} open
      {pending === undefined ? ` in ${monthName}` : ""}
    </Chip>
  );
}

/**
 * Super Admin: Lock month for payroll, or Unlock. Locking is refused while
 * anything dated in the month is pending (409 PENDING_APPROVALS): the refusal
 * says how many and links to Approvals. A month still running cannot be locked.
 */
export function MonthLockControl({ month }: { month: string }) {
  const lock = useMonthLock(month);
  const mutation = useMonthLockMutation();
  const [refusal, setRefusal] = useState<{
    count: number | null;
    message: string;
    blockers: MonthLockBlockers | null;
  } | null>(null);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const current = month >= monthOfDate(todayKey());
  const label = formatMonth(month);

  async function doLock() {
    setRefusal(null);
    try {
      await mutation.mutateAsync({ month, locked: true });
      toast.success(`${label} locked for payroll`, {
        description: "Its reports are now fixed and its approvals can no longer change.",
      });
    } catch (err) {
      const code = errorCode(err);
      if (
        code === "PENDING_APPROVALS" ||
        code === "OPEN_SESSIONS" ||
        code === "PENDING_LEAVE" ||
        code === "PENDING_WFH"
      ) {
        const details = errorDetails(err) ?? {};
        const raw = details.count;
        const items = Array.isArray(details.items)
          ? (details.items as MonthLockBlockers["items"])
          : [];
        const sessions = Array.isArray(details.sessions)
          ? (details.sessions as MonthLockBlockers["openSessions"])
          : [];
        const leave = Array.isArray(details.leave)
          ? (details.leave as NonNullable<MonthLockBlockers["leave"]>)
          : [];
        const wfh = Array.isArray(details.wfh)
          ? (details.wfh as NonNullable<MonthLockBlockers["wfh"]>)
          : [];
        setRefusal({
          count: code === "PENDING_APPROVALS" && typeof raw === "number" ? raw : null,
          message:
            errorMessage(err) ??
            (code === "OPEN_SESSIONS"
              ? "Some working days in this month are still open."
              : "Some approvals in this month are still pending."),
          blockers: {
            items,
            moreItems: details.moreItems === true,
            openSessions: sessions,
            leave,
            pendingLeave: code === "PENDING_LEAVE" && typeof raw === "number" ? raw : leave.length,
            wfh,
            pendingWfh: code === "PENDING_WFH" && typeof raw === "number" ? raw : wfh.length,
          },
        });
        void lock.refetch();
      } else {
        toast.error(`Couldn't lock ${label}`, {
          description: errorMessage(err) ?? "Please try again.",
        });
      }
    }
  }

  async function doUnlock() {
    try {
      await mutation.mutateAsync({ month, locked: false });
      setConfirmUnlock(false);
      toast.success(`${label} unlocked`, {
        description: "Its reports are live again and its approvals can be decided.",
      });
    } catch (err) {
      toast.error(`Couldn't unlock ${label}`, {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  if (lock.isLoading) {
    return (
      <span className="inline-flex h-10 items-center gap-2 px-2 text-sm text-quiet">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking lock…
      </span>
    );
  }
  // 400: a month with no working time at all (before the first one, or still to
  // come). The report itself says so; there is nothing to lock.
  if (lock.isError && errorStatus(lock.error) === 400) return null;
  if (lock.isError || !lock.data) {
    return (
      <Button
        variant="secondary"
        type="button"
        onClick={() => lock.refetch()}
        disabled={lock.isFetching}
      >
        <Lock className="h-4 w-4" aria-hidden />
        Couldn't check the lock. Retry
      </Button>
    );
  }

  return (
    <>
      {lock.data.locked ? (
        <Button
          variant="secondary"
          type="button"
          onClick={() => setConfirmUnlock(true)}
          disabled={mutation.isPending}
        >
          <LockOpen className="h-4 w-4" aria-hidden />
          Unlock {label}
        </Button>
      ) : current ? (
        <span className="inline-flex min-h-10 items-center gap-2 px-1 text-sm text-quiet">
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          You can lock {label} for payroll once it has ended.
        </span>
      ) : (
        <Button variant="primary" type="button" onClick={doLock} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Lock className="h-4 w-4" aria-hidden />
          )}
          Lock for payroll
        </Button>
      )}

      <Notices>
        {!refusal &&
          !lock.data.locked &&
          !current &&
          (lock.data.pending > 0 ||
            (lock.data.blockers?.openSessions.length ?? 0) > 0 ||
            (lock.data.blockers?.pendingLeave ?? 0) > 0 ||
            (lock.data.blockers?.pendingWfh ?? 0) > 0) && (
            <LockBlockers
              month={month}
              pending={lock.data.pending}
              blockers={lock.data.blockers}
              isSuperAdmin
            />
          )}

        {refusal && (
          <div
            role="alert"
            className="flex w-full items-start gap-2.5 rounded-xl border border-attention-edge bg-attention-wash px-3.5 py-2.5 text-sm text-attention-ink sm:basis-full"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {label} can't be locked yet.{" "}
                {refusal.count !== null
                  ? `${refusal.count} ${refusal.count === 1 ? "approval is" : "approvals are"} still pending.`
                  : refusal.message}
              </p>
              <p className="mt-0.5">
                Decide them first, then lock the month.{" "}
                <Link
                  href={blockingApprovalsHref(month, true)}
                  className="font-semibold text-attention-ink underline underline-offset-2"
                >
                  Open them in Approvals
                </Link>
              </p>
              {refusal.blockers && (
                <div className="mt-2">
                  <LockBlockers
                    month={month}
                    pending={refusal.count ?? 0}
                    blockers={refusal.blockers}
                    isSuperAdmin
                  />
                </div>
              )}
            </div>
            <IconButton
              onClick={() => setRefusal(null)}
              label="Dismiss"
              className="h-8 w-8 text-attention hover:bg-attention-wash-strong hover:text-attention-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
        )}
      </Notices>

      <ConfirmDialog
        open={confirmUnlock}
        onClose={() => setConfirmUnlock(false)}
        onConfirm={doUnlock}
        loading={mutation.isPending}
        icon={LockOpen}
        title={`Unlock ${label}?`}
        description={`${lockedLine(lock.data.lockedByName, lock.data.lockedAt)}. Unlocking makes its reports live again and lets its approvals change, so payroll figures may move.`}
        confirmLabel="Unlock"
      />
    </>
  );
}

export { lockedLine };
