"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { formatDuration } from "@/lib/format/duration";
import { offlineText } from "@/lib/format/payroll";
import { useSession } from "@/features/auth/hooks/useSession";
import { dayClassLook } from "@/features/reports/lib/labels";
import { Card } from "@/components/ui/Card";

/**
 * Small grey tag on anything built from keyboard and mouse activity: only Admins
 * and managers with the activity grant see it (SPEC 2.2); staff never do.
 */
export function ManagersOnly() {
  return (
    <span
      title="Admins and managers with activity access see this; staff never do."
      className="inline-flex items-center gap-1 rounded-md bg-panel px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-soft"
    >
      <Lock className="h-2.5 w-2.5" aria-hidden />
      Not shown to staff
    </span>
  );
}

/**
 * The 4.0 rules behind focus, target and paid breaks (SPEC 2.4), as list items
 * for a report's "How the numbers work". Settings fill in when known.
 */
export function BreakRulesItems({
  bufferMin,
  fullDayPct,
  halfDayPct,
}: {
  bufferMin?: number;
  fullDayPct?: number;
  halfDayPct?: number;
}) {
  return (
    <>
      <li>
        Focus time runs from Start Day to End Day, minus every break and any time away that was not
        approved. Approved time away counts as focus.
      </li>
      <li>
        Paid breaks are the shift&apos;s scheduled breaks plus a {bufferMin ?? 10} min buffer a day.
        Quick breaks and minutes over a break use the buffer first; the rest is unpaid. Payroll pays
        focus time plus paid breaks.
      </li>
      <li>
        The target is the shift minus that paid allowance, on the calendar&apos;s working days. A
        full day needs {fullDayPct ?? 80}% of it, a half day {halfDayPct ?? 40}%.
      </li>
      <li>
        Meetings and skipped breaks count until they are rejected. Time marked In a meeting needs no
        approval and always counts. Away time with a reason counts once it is approved.
      </li>
    </>
  );
}

/**
 * "25m offline, no activity data": time worked offline that the agent replayed
 * without activity samples. It is left out of focus; shown only when there is some.
 */
export function unverifiedNote(sec: number | null | undefined): string | null {
  return offlineText(sec);
}

/** Under a paid time figure: what it is made of. */
export function paidTimeSub(paidBreakSec: number): string {
  return `Focus time plus ${formatDuration(paidBreakSec)} of paid breaks`;
}

export interface KpiProps {
  label: string;
  value: string;
  sub?: ReactNode;
  /** 0..100: draws a meter under the value. */
  meter?: number;
  managersOnly?: boolean;
  tone?: "default" | "warning" | "danger" | "success";
}

const VALUE_TONE: Record<NonNullable<KpiProps["tone"]>, string> = {
  default: "text-primary",
  warning: "text-attention",
  danger: "text-attention",
  success: "text-working",
};

/**
 * Whether the viewer sees keyboard and mouse activity in reports: Admins always,
 * a Manager with the activity grant (SPEC 2.2). The server leaves the figures
 * out (or zero) for everyone else, so they are hidden rather than shown empty.
 */
export function useCanSeeActivity(): boolean {
  return useSession().grants.activity;
}

const NO_ACTIVITY = "Ask your Admin for access to keyboard and mouse activity.";
const NO_TIMELINE = "Ask your Admin for access to timelines.";

/**
 * Whether the viewer sees a person's presence timeline (work and break spans):
 * Admins always, a Manager with the timeline grant (SPEC 1.2). Without it the
 * server sends the day report's `timeline` empty, so it is hidden, not drawn bare.
 */
export function useCanSeeTimeline(): boolean {
  return useSession().grants.timeline;
}

/** Timeline content, or one line saying who can share it. */
export function TimelineGate({ children }: { children: ReactNode }) {
  const allowed = useCanSeeTimeline();
  if (allowed) return <>{children}</>;
  return (
    <p className="flex items-center gap-2 text-sm text-quiet">
      <Lock className="h-4 w-4 shrink-0 text-neutral" aria-hidden />
      {NO_TIMELINE}
    </p>
  );
}

/** Activity content, or one line saying who can share it. */
export function ActivityGate({ children }: { children: ReactNode }) {
  const allowed = useCanSeeActivity();
  if (allowed) return <>{children}</>;
  return (
    <p className="flex items-center gap-2 text-sm text-quiet">
      <Lock className="h-4 w-4 shrink-0 text-neutral" aria-hidden />
      {NO_ACTIVITY}
    </p>
  );
}

export function Kpi({ label, value, sub, meter, managersOnly, tone = "default" }: KpiProps) {
  const allowed = useCanSeeActivity();
  if (managersOnly && !allowed) {
    return (
      <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-dashed border-card bg-card/70 p-4 print:hidden">
        <span className="text-[0.8125rem] font-semibold text-soft">{label}</span>
        <span className="flex items-start gap-1.5 text-xs leading-relaxed text-quiet">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral" aria-hidden />
          {NO_ACTIVITY}
        </span>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-card bg-card p-4 shadow-sm print:break-inside-avoid print:shadow-none">
      <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] font-semibold text-soft">
        {label}
        {managersOnly && <ManagersOnly />}
      </span>
      <span
        className={`break-words text-xl font-bold tabular-nums leading-tight tracking-tight sm:text-2xl ${VALUE_TONE[tone]}`}
      >
        {value}
      </span>
      {typeof meter === "number" && (
        <span
          aria-hidden
          className="block h-1.5 w-full overflow-hidden rounded-full bg-brand-wash-strong"
        >
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
          />
        </span>
      )}
      {sub && <span className="text-xs leading-relaxed text-quiet">{sub}</span>}
    </div>
  );
}

export function KpiGrid({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 lg:grid-cols-3 ${
        wide ? "2xl:grid-cols-4 print:grid-cols-4" : "print:grid-cols-3"
      }`}
    >
      {children}
    </div>
  );
}

export function ReportSection({
  title,
  subtitle,
  aside,
  children,
  flush = false,
}: {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  /** No padding around the body (tables and lists that run edge to edge). */
  flush?: boolean;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <Card as="section" aria-labelledby={id} className="overflow-hidden print:shadow-none">
      <div className="flex flex-col gap-1.5 px-4 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-bold text-primary">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-quiet">{subtitle}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className={flush ? "" : "px-4 pb-5 sm:px-6"}>{children}</div>
    </Card>
  );
}

export function DayClassChip({ dayClass }: { dayClass: string }) {
  const look = dayClassLook(dayClass);
  return <Chip tone={look.tone}>{look.label}</Chip>;
}

/** A labelled value inside a table cell that becomes a card on phones. */
export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet lg:sr-only">
      {children}
    </span>
  );
}
