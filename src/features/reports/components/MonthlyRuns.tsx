"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarCheck, Lock, Printer } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { btnSmall, cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { dateKeyOf, formatDay, hmOf } from "@/lib/time/businessTime";
import { formatMonth } from "@/lib/time/months";
import { downloadTeamMonthXlsx } from "@/features/reports/api/reports";
import { useMonthLocks, useReportRuns } from "@/features/reports/hooks/useReports";
import { ExcelButton } from "@/features/reports/components/ReportShell";
import type { MonthLockView, ReportRun } from "@/features/reports/types";

function scopeText(run: ReportRun): string {
  const people = run.summary?.people;
  const count =
    typeof people === "number" ? ` · ${people} ${people === 1 ? "person" : "people"}` : "";
  return `${run.scope === "ALL" ? "Everyone" : "My team"}${count}`;
}

function builtText(run: ReportRun): string {
  const at = new Date(run.generatedAt);
  if (Number.isNaN(at.getTime())) return "";
  return `Built ${formatDay(dateKeyOf(at))}, ${hmOf(run.generatedAt)}`;
}

function LockStatus({ lock }: { lock: MonthLockView | undefined }) {
  if (!lock) return <Chip tone="neutral">Checking…</Chip>;
  if (lock.locked) {
    return (
      <Chip tone="success" icon={Lock}>
        Locked for payroll
      </Chip>
    );
  }
  return lock.pending > 0 ? (
    <Chip tone="warning" dot>
      {lock.pending} {lock.pending === 1 ? "approval" : "approvals"} open
    </Chip>
  ) : (
    <Chip tone="info">Ready to lock</Chip>
  );
}

/**
 * The monthly reports built at 00:30 on the 1st, newest first, each with the
 * month's lock state and its PDF and Excel. Opening one shows the live
 * team-month report for that month and scope.
 */
export function MonthlyRuns({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const runs = useReportRuns();
  const sorted = useMemo(
    () => [...(runs.data ?? [])].sort((a, b) => b.month.localeCompare(a.month)),
    [runs.data],
  );
  const months = useMemo(() => Array.from(new Set(sorted.map((r) => r.month))), [sorted]);
  const locks = useMonthLocks(months);
  const lockOf = new Map(months.map((m, i) => [m, locks[i]?.data]));

  return (
    <section aria-labelledby="monthly-reports" className={`${cardBase} overflow-hidden`}>
      <div className="px-4 pb-3 pt-4 sm:px-6">
        <h2 id="monthly-reports" className="text-base font-bold text-slate-900">
          Monthly reports
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {isSuperAdmin
            ? "Built at 00:30 on the 1st for everyone, managers included."
            : "Built at 00:30 on the 1st for everyone in your team."}
        </p>
      </div>
      {runs.isError && runs.data && (
        <div className="px-4 pb-3 sm:px-6">
          <RefreshFailedNotice
            what="monthly reports"
            updatedAt={runs.dataUpdatedAt}
            onRetry={() => runs.refetch()}
            retrying={runs.isFetching}
          />
        </div>
      )}
      {runs.isLoading ? (
        <LoadingState label="Loading monthly reports…" />
      ) : runs.isError && !runs.data ? (
        <ErrorState
          title="Couldn't load monthly reports"
          message={errorMessage(runs.error)}
          onRetry={() => runs.refetch()}
          retrying={runs.isFetching}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No monthly reports yet"
          message="The first one arrives at 00:30 on the 1st of next month. You can create any report above meanwhile."
        />
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {sorted.map((run) => {
            const href = `/dashboard/reports/team?month=${run.month}`;
            return (
              <li
                key={run.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{formatMonth(run.month)}</p>
                  <p className="text-xs text-slate-500">
                    {[scopeText(run), builtText(run)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <LockStatus lock={lockOf.get(run.month)} />
                  <Link href={href} className={btnSmall}>
                    Open
                    <span className="sr-only"> the {formatMonth(run.month)} report</span>
                  </Link>
                  <Link href={`${href}&print=1`} className={btnSmall}>
                    <Printer className="h-3.5 w-3.5" aria-hidden />
                    PDF
                    <span className="sr-only"> of {formatMonth(run.month)}</span>
                  </Link>
                  <ExcelButton
                    small
                    label="Excel"
                    download={() => downloadTeamMonthXlsx({ month: run.month })}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
