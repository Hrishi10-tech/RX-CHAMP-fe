"use client";

import { format, parseISO } from "date-fns";
import { Activity, Coffee, Moon, Users, Utensils, type LucideIcon } from "lucide-react";

import { formatDuration } from "@/features/activity/lib/format";
import { ActivityTimelineChart } from "@/features/analytics/components/ActivityTimelineChart";
import { DailyFlowHeatmap } from "@/features/analytics/components/DailyFlowHeatmap";
import { FocusSessionsDonut } from "@/features/analytics/components/FocusSessionsDonut";
import { OnlineHoursChart } from "@/features/analytics/components/OnlineHoursChart";
import { TopAppsWidget } from "@/features/analytics/components/TopAppsWidget";
import { WorkVsBreakDonut } from "@/features/analytics/components/WorkVsBreakDonut";
import { C } from "@/features/analytics/lib/palette";
import type { DashboardAnalytics, KpiStat } from "@/features/analytics/types";

const KPI_META: Record<string, { icon: LucideIcon; color: string }> = {
  idle: { icon: Moon, color: C.amber },
  active: { icon: Activity, color: C.indigo },
  break: { icon: Coffee, color: C.teal },
  lunch: { icon: Utensils, color: C.violet },
  meeting: { icon: Users, color: "#0ea5e9" },
};

/** Monday-based weekday index, matching how `dailyFlow` cells are keyed. */
function weekdayIndex(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7;
}

function longDate(iso: string): string {
  try {
    return format(parseISO(iso), "EEEE, d MMMM yyyy");
  } catch {
    return iso;
  }
}

/** No sparkline: it spans the whole week, and every page here is a single day. */
function ReportKpi({
  stat,
  icon: Icon,
  color,
}: {
  stat: KpiStat;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {stat.label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * One printed page: a single day of the report.
 *
 * Everything shown is scoped to `date` alone. The API answers with a trailing 7-day
 * window for the trend charts, so `dailyFlow` and `onlineHours` are narrowed to this
 * date here, and the focus trend — a line needs more than one point — is printed as a
 * figure rather than a chart.
 */
export function ReportPage({
  date,
  userName,
  data,
  pageNumber,
  pageCount,
}: {
  date: string;
  userName?: string;
  data: DashboardAnalytics | null;
  pageNumber: number;
  pageCount: number;
}) {
  const header = (
    <header className="mb-4 flex items-end justify-between border-b border-slate-200 pb-3">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          {userName ? `${userName} — Productivity Report` : "Productivity Report"}
        </h1>
        <p className="mt-0.5 text-sm font-semibold text-slate-600">{longDate(date)}</p>
      </div>
      <span className="text-[10px] font-medium text-slate-400">
        Page {pageNumber} of {pageCount}
      </span>
    </header>
  );

  if (!data) {
    return (
      <article className="report-page">
        {header}
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
          No data could be loaded for this day.
        </div>
      </article>
    );
  }

  const today = weekdayIndex(date);
  const dailyFlow = data.dailyFlow.filter((c) => c.day === today);
  const onlineHours = data.onlineHours.filter((p) => p.date === date);
  const focusSec = data.focusTrend.find((p) => p.date === date)?.seconds ?? 0;
  const hasActivity = data.kpis.some((k) => k.value !== "0s");

  return (
    <article className="report-page">
      {header}

      {!hasActivity && (
        <p className="mb-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          No tracked activity was recorded on this day.
        </p>
      )}

      <div className="grid grid-cols-5 gap-3">
        {data.kpis.map((k) => {
          const meta = KPI_META[k.key] ?? { icon: Activity, color: C.indigo };
          return <ReportKpi key={k.key} stat={k} icon={meta.icon} color={meta.color} />;
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Panel title="Activity Timeline" className="col-span-2">
          <ActivityTimelineChart data={data.timeline} />
        </Panel>

        <Panel title="Focus Time">
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {formatDuration(focusSec)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Uninterrupted stretches of 25 minutes or more.
          </p>
          <p className="mt-3 text-[11px] font-medium text-slate-400">{longDate(date)}</p>
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Panel title="Top Apps &amp; Websites">
          <TopAppsWidget data={data.topApps} />
        </Panel>
        <Panel title="Focus Sessions">
          <FocusSessionsDonut
            total={data.focusSessions.total}
            buckets={data.focusSessions.buckets}
          />
        </Panel>
        <Panel title="Work vs Break">
          <WorkVsBreakDonut data={data.workBreak} />
        </Panel>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Panel title="Daily Flow" className="col-span-2">
          <DailyFlowHeatmap data={dailyFlow} days={[today]} />
        </Panel>
        <Panel title="Online Hours">
          <OnlineHoursChart data={onlineHours} />
        </Panel>
      </div>
    </article>
  );
}
