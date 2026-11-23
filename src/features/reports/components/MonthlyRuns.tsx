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
import { errorMessage } from "@/lib/api";
import { dateKeyOf, formatDay } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { formatMonth } from "@/lib/time/months";
import { downloadTeamMonthXlsx } from "@/features/reports/api/reports";
import { runFigures, runFiguresText } from "@/features/reports/lib/runs";
import { useMonthLocks, useReportRuns } from "@/features/reports/hooks/useReports";
import { ExcelButton } from "@/features/reports/components/ReportShell";
import type { MonthLockView, ReportRun } from "@/features/reports/types";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";

function scopeText(run: ReportRun): string {
  const { people, payrollPaused } = runFigures(run.summary);
  const count = people !== null ? ` · ${people} ${people === 1 ? "person" : "people"}` : "";
  // 3.6: biometric staff left out of the run while the integration is off.
  const left = payrollPaused ? ` · ${payrollPaused} payroll paused` : "";
  return `${run.scope === "ALL" ? "Everyone" : "My departments"}${count}${left}`;
}

function builtText(run: ReportRun): string {
  const at = new Date(run.generatedAt);
  if (Number.isNaN(at.getTime())) return "";
  return `Built ${formatDay(dateKeyOf(at))}, ${formatTime12(run.generatedAt)}`;
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
 * The monthly reports built at 12:30 AM on the 1st, newest first, each with the
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
    <Card as="section" aria-labelledby="monthly-reports" className="overflow-hidden">
      <div className="px-4 pb-3 pt-4 sm:px-6">
        <h2 id="monthly-reports" className="text-base font-bold text-primary">
          Monthly reports
        </h2>
        <p className="mt-0.5 text-sm text-quiet">
          {isSuperAdmin
            ? "Built at 12:30 AM on the 1st for everyone, managers included."
            : "Built at 12:30 AM on the 1st for everyone in your departments."}
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
          message="The first one arrives at 12:30 AM on the 1st of next month. You can create any report above meanwhile."
        />
      ) : (
        <ul className="divide-y divide-divider border-t border-divider">
          {sorted.map((run) => {
            const href = `/dashboard/reports/team?month=${run.month}`;
            return (
              <li
                key={run.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-primary">{formatMonth(run.month)}</p>
                  <p className="text-xs text-quiet">
                    {[scopeText(run), builtText(run)].filter(Boolean).join(" · ")}
                  </p>
                  {runFiguresText(run) && (
                    <p className="text-xs text-soft">{runFiguresText(run)}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <LockStatus lock={lockOf.get(run.month)} />
                  <Link href={href} className={buttonClass("small")}>
                    Open
                    <span className="sr-only"> the {formatMonth(run.month)} report</span>
                  </Link>
                  <Link href={`${href}&print=1`} className={buttonClass("small")}>
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
    </Card>
  );
}
