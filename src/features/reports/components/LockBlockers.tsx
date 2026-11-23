"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, UserX } from "lucide-react";

import { roleLabel } from "@/constants/roles";
import { formatDay } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { formatMonth } from "@/lib/time/months";
import { CATEGORY_FILTER_LABEL } from "@/features/approvals/lib/labels";
import { blockingApprovalsHref } from "@/features/approvals/lib/query";
import type { ApprovalCategory } from "@/features/approvals/types";
import type { MonthLockBlockers, PendingBlocker } from "@/features/reports/types";

/** "Maya Reddy (Manager)", "a Super Admin", or that the approver has left. */
function waitingFor(b: PendingBlocker): { text: string; left: boolean } {
  if (!b.approverActive && b.approverId) {
    return {
      text: `${b.approverName ?? "The approver"} has left: a Super Admin decides it`,
      left: true,
    };
  }
  if (b.approverRole === "SUPER_ADMIN" || !b.approverId) {
    return { text: b.escalated ? "a Super Admin (escalated)" : "a Super Admin", left: false };
  }
  const role = b.approverRole ? ` (${roleLabel(b.approverRole)})` : "";
  return {
    text: `${b.approverName ?? "their manager"}${role}${b.escalated ? ", escalated" : ""}`,
    left: false,
  };
}

/**
 * Exactly what keeps a month from being locked for payroll (3.2, fix 4): every
 * pending item dated in it, by person, with whose decision it waits for, and any
 * working day still open. The link opens Approvals on precisely these items.
 */
export function LockBlockers({
  month,
  pending,
  blockers,
  isSuperAdmin,
}: {
  month: string;
  pending: number;
  blockers: MonthLockBlockers | undefined;
  isSuperAdmin: boolean;
}) {
  const items = blockers?.items ?? [];
  const open = blockers?.openSessions ?? [];
  const leave = blockers?.leave ?? [];
  const pendingLeave = blockers?.pendingLeave ?? leave.length;
  if (pending <= 0 && open.length === 0 && pendingLeave <= 0) return null;
  const label = formatMonth(month);
  return (
    <div className="w-full space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-3 text-sm text-amber-950 sm:basis-full">
      {pending > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {pending} {pending === 1 ? "approval" : "approvals"} in {label} still{" "}
              {pending === 1 ? "waits" : "wait"} for a decision
            </p>
            <Link
              href={blockingApprovalsHref(month, isSuperAdmin)}
              className="inline-flex items-center gap-1 font-semibold text-amber-900 underline underline-offset-2"
            >
              Open exactly these in Approvals
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {items.length > 0 && (
            <ul className="divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200 bg-white">
              {items.map((b) => {
                const who = waitingFor(b);
                return (
                  <li
                    key={`${b.type}:${b.id}`}
                    className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="min-w-0 font-semibold text-slate-900 sm:w-44 sm:shrink-0 sm:truncate">
                      {b.userName}
                    </span>
                    <span className="min-w-0 flex-1 text-slate-700">
                      {CATEGORY_FILTER_LABEL[b.category as ApprovalCategory] ?? "Approval"} ·{" "}
                      {formatDay(b.date)}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs ${who.left ? "font-semibold text-rose-700" : "text-slate-500"}`}
                    >
                      {who.left && <UserX className="h-3.5 w-3.5" aria-hidden />}
                      Waiting for {who.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {blockers?.moreItems && (
            <p className="text-xs text-amber-900">
              And more: open them in Approvals to see every one.
            </p>
          )}
        </>
      )}
      {pendingLeave > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {pendingLeave} leave {pendingLeave === 1 ? "request" : "requests"} with days in{" "}
              {label} {pendingLeave === 1 ? "waits" : "wait"} for a decision
            </p>
            <Link
              href="/dashboard/leave?tab=requests"
              className="inline-flex items-center gap-1 font-semibold text-amber-900 underline underline-offset-2"
            >
              Open Leave requests
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {leave.length > 0 && (
            <ul className="divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200 bg-white">
              {leave.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
                >
                  <span className="min-w-0 font-semibold text-slate-900 sm:w-44 sm:shrink-0 sm:truncate">
                    {l.userName}
                  </span>
                  <span className="min-w-0 flex-1 text-slate-700">
                    {l.category === "CLSL" ? "CL/SL" : "EL/PL"} · {formatDay(l.startDate)}
                    {l.endDate !== l.startDate ? ` to ${formatDay(l.endDate)}` : ""} · {l.days}{" "}
                    {l.days === 1 || l.days < 1 ? "day" : "days"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {open.length > 0 && (
        <div className="space-y-1">
          <p className="font-semibold">
            {open.length === 1 ? "A working day is" : `${open.length} working days are`} still open
          </p>
          <ul className="space-y-0.5 text-amber-900">
            {open.map((o) => (
              <li key={`${o.userId}:${o.date}`} className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {o.userName}, {formatDay(o.date)} (started {formatTime12(o.startedAt)}). It closes
                on its own once the forgotten End Day rule applies.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
