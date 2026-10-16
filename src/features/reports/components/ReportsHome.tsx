"use client";

import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { cardBase } from "@/components/ui/classes";
import { todayKey } from "@/lib/time/businessTime";
import { addMonths, formatMonth, monthOfDate } from "@/lib/time/months";
import { useAppSettings } from "@/features/settings/hooks/useSettings";
import { useMonthLock, useReportRuns } from "@/features/reports/hooks/useReports";
import { CreateReport } from "@/features/reports/components/CreateReport";
import { MonthlyRuns } from "@/features/reports/components/MonthlyRuns";

/** "Your September report is ready", while last month is built and not yet locked. */
function ReadyBanner({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const lastMonth = addMonths(monthOfDate(todayKey()), -1);
  const runs = useReportRuns();
  const run = (runs.data ?? []).find((r) => r.month === lastMonth);
  const lock = useMonthLock(lastMonth, Boolean(run));
  if (!run || !lock.data || lock.data.locked) return null;
  const pending = lock.data.pending;
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
        <span>
          <span className="font-semibold">
            Your {formatMonth(lastMonth).split(" ")[0]} report is ready.
          </span>{" "}
          {pending > 0
            ? `${pending} ${pending === 1 ? "approval is" : "approvals are"} still open. ${
                isSuperAdmin
                  ? "Lock the month for payroll once they are decided."
                  : "Decide them so the month can be locked for payroll."
              }`
            : isSuperAdmin
              ? "Everything is decided: it can be locked for payroll."
              : "Everything is decided."}
        </span>
      </p>
      <span className="flex shrink-0 flex-wrap gap-3">
        <Link
          href={`/dashboard/reports/team?month=${lastMonth}`}
          className="font-semibold text-indigo-900 underline underline-offset-2"
        >
          Open report
        </Link>
        {pending > 0 && (
          <Link
            href="/dashboard/approvals"
            className="font-semibold text-indigo-900 underline underline-offset-2"
          >
            Review approvals
          </Link>
        )}
      </span>
    </div>
  );
}

function HowNumbersWork() {
  const { data: s } = useAppSettings();
  const rows: [string, string][] = [
    ["Focus time", "Start Day to End Day, minus breaks. Payroll uses it as is."],
    [
      "Approvals",
      "Meetings and skipped breaks count until rejected. Minutes over a break stay out until approved.",
    ],
    ["Expected", "Shift length minus scheduled breaks: 8h a day on a 9h shift with 1h of breaks."],
    [
      "Attendance",
      `Full day at ${s?.fullDayPct ?? 80}% of expected or more, half day at ${s?.halfDayPct ?? 40}% or more, otherwise absent. Days off are left out.`,
    ],
    [
      "Late start",
      `Start Day more than ${s?.lateStartGraceMin ?? 10} min after the shift starts. Reported only.`,
    ],
    [
      "Activity",
      "Keyboard and mouse minutes by hour, for managers and Super Admins only. It never changes focus time.",
    ],
  ];
  return (
    <aside aria-labelledby="numbers-work" className={`${cardBase} p-4 sm:p-6`}>
      <h2 id="numbers-work" className="text-base font-bold text-slate-900">
        How the numbers work
      </h2>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-1">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm font-semibold text-slate-800">{k}</dt>
            <dd className="text-sm leading-relaxed text-slate-600">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        Super Admins can change these rules in Settings. A Super Admin locks each month for payroll
        once its approvals are decided.
      </p>
    </aside>
  );
}

/** Reports: create any report, and the monthly reports built on the 1st. */
export function ReportsHome({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Attendance and focus hours, ready for payroll. Last month's report arrives on the 1st.
        </p>
      </header>
      <ReadyBanner isSuperAdmin={isSuperAdmin} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <CreateReport isSuperAdmin={isSuperAdmin} />
        <HowNumbersWork />
      </div>
      <MonthlyRuns isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
