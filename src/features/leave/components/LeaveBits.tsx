"use client";

import { CalendarDays, Clock } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { CATEGORY_TEXT, STATUS_LOOK, daysNumber, daysText } from "@/features/leave/lib/format";
import type {
  CategoryBalanceView,
  LeaveCategory,
  LeaveStatus,
  LedgerLine,
} from "@/features/leave/types";
import { Card } from "@/components/ui/Card";

export function CategoryChip({ category }: { category: LeaveCategory }) {
  const look = CATEGORY_TEXT[category];
  return (
    <Chip tone={look.tone} title={look.name}>
      {look.label}
    </Chip>
  );
}

export function LeaveStatusChip({ status }: { status: LeaveStatus }) {
  const look = STATUS_LOOK[status];
  return (
    <Chip tone={look.tone} dot={status === "PENDING"}>
      {look.label}
    </Chip>
  );
}

/**
 * One pool's balance: what is left in big numbers, what made it, and what
 * happens on 31 December. Phone first: two of these sit side by side from 360 px.
 */
export function BalanceCard({ b, compact = false }: { b: CategoryBalanceView; compact?: boolean }) {
  const look = CATEGORY_TEXT[b.category];
  const total = Math.max(0, b.grantedDays + b.carriedDays + b.adjustedDays);
  const used = Math.max(0, b.takenDays + b.pendingDays);
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const low = b.availableDays <= 0;
  const bar = b.category === "CLSL" ? "bg-brand" : "bg-meeting";
  const track = b.category === "CLSL" ? "bg-brand-wash-strong" : "bg-meeting-wash-strong";
  return (
    <Card as="section" className="flex flex-col p-4 sm:p-5" aria-label={`${look.label} balance`}>
      <div className="flex items-center justify-between gap-2">
        <CategoryChip category={b.category} />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
          {b.year}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-soft">{look.name}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-3xl font-bold tabular-nums tracking-tight ${low ? "text-attention" : "text-primary"}`}
        >
          {daysNumber(b.availableDays)}
        </span>
        <span className="text-sm font-semibold text-quiet">
          {Math.abs(b.availableDays) !== 0 && Math.abs(b.availableDays) <= 1
            ? "day left"
            : "days left"}
        </span>
      </p>
      <span aria-hidden className={`mt-3 block h-2 w-full overflow-hidden rounded-full ${track}`}>
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      {!compact && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-quiet">
          <dt>Given for {b.year}</dt>
          <dd className="text-right font-semibold tabular-nums text-body">
            {daysText(b.grantedDays)}
            {b.prorated ? " (pro rata)" : ""}
          </dd>
          {b.category === "ELPL" && b.carriedDays !== 0 && (
            <>
              <dt>Carried over</dt>
              <dd className="text-right font-semibold tabular-nums text-body">
                {daysText(b.carriedDays, { signed: true })}
              </dd>
            </>
          )}
          {b.adjustedDays !== 0 && (
            <>
              <dt>Adjusted</dt>
              <dd className="text-right font-semibold tabular-nums text-body">
                {daysText(b.adjustedDays, { signed: true })}
              </dd>
            </>
          )}
          <dt>Taken</dt>
          <dd className="text-right font-semibold tabular-nums text-body">
            {daysText(b.takenDays)}
          </dd>
          {b.pendingDays > 0 && (
            <>
              <dt>Waiting for approval</dt>
              <dd className="text-right font-semibold tabular-nums text-attention">
                {daysText(b.pendingDays)}
              </dd>
            </>
          )}
        </dl>
      )}
      <p className="mt-3 text-xs text-quiet">
        {b.yearEnd === "LAPSES"
          ? "What is left lapses on 31 December."
          : b.carryCapDays === null
            ? `What is left carries over to ${b.year + 1}.`
            : `Up to ${daysText(b.carryCapDays)} carry over to ${b.year + 1}.`}
      </p>
    </Card>
  );
}

const LEDGER_KIND: Record<LedgerLine["kind"], string> = {
  GRANT: "Given",
  CARRY: "Carried over",
  ADJUSTMENT: "Adjusted",
  QUOTA: "Yearly days",
  LEAVE: "Leave",
  PENDING: "Waiting",
};

/** The year's ledger: every line that moved a balance, oldest first. */
export function LedgerList({ lines }: { lines: LedgerLine[] }) {
  if (!lines.length) {
    return <p className="px-4 py-6 text-center text-sm text-quiet">Nothing yet this year.</p>;
  }
  return (
    <ul className="divide-y divide-divider">
      {lines.map((l, i) => (
        <li key={`${l.kind}-${l.date}-${i}`} className="flex items-start gap-3 px-4 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill text-quiet ring-1 ring-panel">
            {l.kind === "LEAVE" || l.kind === "PENDING" ? (
              <CalendarDays className="h-4 w-4" aria-hidden />
            ) : (
              <Clock className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-strong">
              <span>{LEDGER_KIND[l.kind]}</span>
              <CategoryChip category={l.category} />
            </p>
            <p className="mt-0.5 text-sm text-soft">{l.text}</p>
            <p className="mt-0.5 text-xs text-quiet">
              {formatDayWithWeekday(l.date)}
              {l.byName ? `, by ${l.byName}` : ""}
            </p>
          </div>
          {l.kind !== "QUOTA" && (
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                l.kind === "PENDING"
                  ? "text-attention"
                  : l.days < 0
                    ? "text-attention"
                    : "text-working"
              }`}
            >
              {daysText(l.days, { signed: true })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
