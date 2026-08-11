"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  Coffee,
  Download,
  LogIn,
  Moon,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { getDashboardAnalytics } from "@/features/analytics/api/getDashboardAnalytics";
import { getUserDaily } from "@/features/activity/api/getUserDaily";
import type { DashboardAnalytics } from "@/features/analytics/types";
import { C } from "@/features/analytics/lib/palette";
import { formatDuration } from "@/features/activity/lib/format";
import { LoadingOverlay } from "@/components/ui/Loader";
import { DashboardCard, LegendDot } from "@/features/analytics/components/DashboardCard";
import { StatTile } from "@/features/analytics/components/StatTile";
import {
  ActivityTimelineChart,
  TIMELINE_LEGEND,
} from "@/features/analytics/components/ActivityTimelineChart";
import { ScreenshotsWidget } from "@/features/analytics/components/ScreenshotsWidget";
import { FocusSessionsDonut } from "@/features/analytics/components/FocusSessionsDonut";
import { WorkVsBreakDonut } from "@/features/analytics/components/WorkVsBreakDonut";
import { DailyFlowHeatmap } from "@/features/analytics/components/DailyFlowHeatmap";
import { FocusTimeTrend } from "@/features/analytics/components/FocusTimeTrend";
import { OnlineHoursChart } from "@/features/analytics/components/OnlineHoursChart";
import { TopAppsWidget } from "@/features/analytics/components/TopAppsWidget";
import { LiveStatusBadge } from "@/features/analytics/components/LiveStatusBadge";
import { useLiveStatus } from "@/features/analytics/hooks/useLiveStatus";
import { ExportReportModal } from "@/features/analytics/components/ExportReportModal";
import { ReportPdfBuilder } from "@/features/analytics/components/ReportPdfBuilder";
import {
  MAX_REPORT_DAYS,
  datesBetween,
  fetchReportRange,
  type ReportDay,
} from "@/features/analytics/lib/reportRange";

const KPI_META: Record<string, { icon: LucideIcon; color: string }> = {
  idle: { icon: Moon, color: C.amber },
  active: { icon: Activity, color: C.indigo },
  break: { icon: Coffee, color: C.teal },
  lunch: { icon: Utensils, color: C.violet },
  meeting: { icon: Users, color: "#0ea5e9" },
};

function greetingFor(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function longDate(iso: string): string {
  try {
    return format(parseISO(iso), "EEEE, d MMMM yyyy");
  } catch {
    return iso;
  }
}

/** ISO timestamp → local "9:10 AM", or null if unparseable. */
function shortTime(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return null;
  }
}

export function ProductivityDashboard({
  userId,
  userName,
  date,
  backHref,
  backLabel = "Back",
}: {
  userId: string;
  userName?: string;
  date?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const [selectedDate, setSelectedDate] = useState(date ?? todayIso());
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loginAt, setLoginAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export: the range is chosen in a dialog, then the report prints without ever
  // being shown on screen.
  const [exportOpen, setExportOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [report, setReport] = useState<ReportDay[] | null>(null);
  const [reportRange, setReportRange] = useState<{ from: string; to: string } | null>(null);

  const greeting = useMemo(() => greetingFor(new Date().getHours()), []);
  const isManagerView = Boolean(backHref);

  const {
    status: liveStatus,
    connected: liveConnected,
    live,
    current,
    presenceVersion,
  } = useLiveStatus(userId);

  const usingApp = liveStatus && liveStatus !== "OFFLINE" && current?.app ? current : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getDashboardAnalytics(userId, selectedDate)
      .then((d) => active && setData(d))
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Couldn't load dashboard.");
      })
      .finally(() => active && setLoading(false));
    // Login time lives on the daily activity rollup — best-effort, never blocks
    // or fails the dashboard.
    getUserDaily(userId, selectedDate)
      .then((d) => active && setLoginAt(d.loginAt))
      .catch(() => active && setLoginAt(null));
    return () => {
      active = false;
    };
  }, [userId, selectedDate]);

  // A break / lunch / meeting starting or ending changes the day's totals, but
  // those are only computed server-side — so refetch. Silent (no loading state)
  // to avoid flashing the overlay over an already-rendered dashboard.
  useEffect(() => {
    if (presenceVersion === 0) return; // initial mount is covered by the fetch above
    let active = true;
    getDashboardAnalytics(userId, selectedDate)
      .then((d) => active && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [presenceVersion, userId, selectedDate]);

  async function handleGenerate(from: string, to: string) {
    const dates = datesBetween(from, to);
    if (dates.length === 0 || dates.length > MAX_REPORT_DAYS) return; // dialog already guards this

    setExportProgress({ done: 0, total: dates.length });
    try {
      const days = await fetchReportRange(userId, dates, (done, total) =>
        setExportProgress({ done, total }),
      );
      setExportOpen(false);
      setReportRange({ from, to });
      setReport(days); // mounts the builder, which renders the PDF and downloads it
    } catch {
      toast.error("Couldn't build the report. Please try again.");
    } finally {
      setExportProgress(null);
    }
  }

  const back = backHref ? (
    <Link
      href={backHref}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </Link>
  ) : null;

  const header = (
    <div className="space-y-3">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!isManagerView && (
            <p className="text-sm font-medium text-slate-500">
              {greeting}
              {userName ? `, ${userName}` : ""}! 👋
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isManagerView && userName
                ? `${userName} — Productivity Dashboard`
                : "Productivity Dashboard"}
            </h1>
            {liveStatus && <LiveStatusBadge status={liveStatus} live={liveConnected} />}
            {shortTime(loginAt) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                <LogIn className="h-3.5 w-3.5 text-slate-400" />
                Login {shortTime(loginAt)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Productivity overview for {longDate(selectedDate)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <span className="text-slate-400">Date</span>
            <input
              type="date"
              value={selectedDate}
              max={todayIso()}
              onChange={(e) => setSelectedDate(e.target.value || todayIso())}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[rgb(34_34_204)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[rgb(28_28_180)]"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Lives with the button so it works from the loading and error states too. */}
      {exportOpen && (
        <ExportReportModal
          progress={exportProgress}
          onGenerate={handleGenerate}
          onClose={() => setExportOpen(false)}
        />
      )}

      {/* Renders nothing visible — the dashboard stays up while the PDF is built. */}
      {report && reportRange && (
        <ReportPdfBuilder
          days={report}
          userName={userName}
          from={reportRange.from}
          to={reportRange.to}
          onDone={() => {
            setReport(null);
            setReportRange(null);
          }}
        />
      )}
    </div>
  );

  if (loading)
    return (
      <div className="space-y-5">
        {header}
        <LoadingOverlay label="Loading dashboard…" />
      </div>
    );

  if (error || !data)
    return (
      <div className="space-y-5">
        {header}
        <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
          <p className="font-medium">Dashboard data isn&apos;t available yet.</p>
          <p className="text-xs text-slate-400">
            {error ?? "The analytics endpoint returned no data."}
          </p>
        </div>
      </div>
    );

  const timeline = data.timeline ?? [];
  const focusSessions = data.focusSessions ?? { total: 0, buckets: [] };
  const workBreak = data.workBreak ?? { workSec: 0, breakSec: 0 };
  const dailyFlow = data.dailyFlow ?? [];
  const focusTrend = data.focusTrend ?? [];
  const onlineHours = data.onlineHours ?? [];

  const topApps = live.topApps ?? data.topApps ?? [];
  const kpis = (data.kpis ?? []).map((k) => {
    if (k.key === "active" && live.activeSec != null)
      return { ...k, value: formatDuration(live.activeSec) };
    if (k.key === "idle" && live.idleSec != null)
      return { ...k, value: formatDuration(live.idleSec) };
    return k;
  });

  return (
    <div className="space-y-5">
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const meta = KPI_META[k.key] ?? { icon: Activity, color: C.indigo };
          return <StatTile key={k.key} stat={k} icon={meta.icon} color={meta.color} />;
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashboardCard
          title="Activity Timeline"
          aside={
            <div className="hidden flex-wrap items-center gap-3 sm:flex">
              {TIMELINE_LEGEND.map((s) => (
                <LegendDot key={s.key} color={s.color} label={s.key} />
              ))}
            </div>
          }
        >
          <ActivityTimelineChart data={timeline} />
        </DashboardCard>

        <DashboardCard title="Top Apps & Websites">
          <TopAppsWidget data={topApps} current={usingApp} />
        </DashboardCard>
      </div>

      <ScreenshotsWidget userId={userId} date={selectedDate} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
            <div className="sm:pr-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Focus Sessions
              </h2>
              <div className="mt-5">
                <FocusSessionsDonut total={focusSessions.total} buckets={focusSessions.buckets} />
              </div>
            </div>
            <div className="sm:pl-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Work vs Break
              </h2>
              <div className="mt-5">
                <WorkVsBreakDonut data={workBreak} />
              </div>
            </div>
          </div>
        </section>

        <DashboardCard title="Focus Time Trend">
          <FocusTimeTrend data={focusTrend} />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <DashboardCard title="Daily Flow" className="lg:col-span-2">
          <DailyFlowHeatmap data={dailyFlow} />
        </DashboardCard>

        <DashboardCard
          title="Online Hours per Day"
          aside={
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-0.5 w-4 rounded bg-[#2dd4bf]" />
              Compare to average
            </span>
          }
        >
          <OnlineHoursChart data={onlineHours} />
        </DashboardCard>
      </div>
    </div>
  );
}
