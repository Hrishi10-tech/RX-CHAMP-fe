"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { cardBase } from "@/components/ui/classes";
import { dayClassLook } from "@/features/reports/lib/labels";

/** Small grey tag on anything built from keyboard and mouse activity. */
export function ManagersOnly() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      <Lock className="h-2.5 w-2.5" aria-hidden />
      Managers only
    </span>
  );
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
  default: "text-slate-900",
  warning: "text-amber-700",
  danger: "text-rose-700",
  success: "text-emerald-700",
};

export function Kpi({ label, value, sub, meter, managersOnly, tone = "default" }: KpiProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none">
      <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-slate-600">
        {label}
        {managersOnly && <ManagersOnly />}
      </span>
      <span
        className={`break-words text-xl font-bold tabular-nums leading-tight tracking-tight sm:text-2xl ${VALUE_TONE[tone]}`}
      >
        {value}
      </span>
      {typeof meter === "number" && (
        <span aria-hidden className="block h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
          <span
            className="block h-full rounded-full bg-indigo-600"
            style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
          />
        </span>
      )}
      {sub && <span className="text-xs leading-relaxed text-slate-500">{sub}</span>}
    </div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 print:grid-cols-3">{children}</div>;
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
    <section aria-labelledby={id} className={`${cardBase} overflow-hidden print:shadow-none`}>
      <div className="flex flex-col gap-1.5 px-4 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-bold text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className={flush ? "" : "px-4 pb-5 sm:px-6"}>{children}</div>
    </section>
  );
}

export function DayClassChip({ dayClass }: { dayClass: string }) {
  const look = dayClassLook(dayClass);
  return <Chip tone={look.tone}>{look.label}</Chip>;
}

/** A labelled value inside a table cell that becomes a card on phones. */
export function CellLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:sr-only">
      {children}
    </span>
  );
}
