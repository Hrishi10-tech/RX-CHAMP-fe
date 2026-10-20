"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Coffee,
  Download,
  Lock,
  LogIn,
  LogOut,
  Moon,
  Users,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { getDashboardAnalytics } from "@/features/analytics/api/getDashboardAnalytics";
import { C } from "@/features/analytics/lib/palette";
import { formatDuration } from "@/features/activity/lib/format";
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
import { usePresenceRefresh } from "@/features/presence/hooks/usePresenceRefresh";
import { getTimesheet } from "@/features/timesheet/api/timesheet";
import { getActivityTimeline } from "@/features/productivity/api/getActivityTimeline";
import {
  PRESENCE_SERIES,
  PresenceTimelineChart,
} from "@/features/productivity/components/PresenceTimelineChart";
import { ExportTimesheetDialog } from "@/features/timesheet/components/ExportTimesheetDialog";
import { FocusBar } from "@/features/team/components/TeamView";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/StatePanel";
import { btnPrimary, cardBase } from "@/components/ui/classes";
import { errorCode, errorMessage, errorStatus } from "@/lib/api";
import { formatDuration as formatMinutesDuration } from "@/lib/format/duration";
import { PAID_TIME_LABEL, offlineText } from "@/lib/format/payroll";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { ALL_GRANTS, type Grants } from "@/constants/roles";
import { presenceLook } from "@/features/teamToday/lib/labels";

const KPI_META: Record<string, { icon: LucideIcon; color: string }> = {
  idle: { icon: Moon, color: C.amber },
  active: { icon: Activity, color: C.indigo },
  break: { icon: Coffee, color: C.teal },
  lunch: { icon: Utensils, color: C.violet },
  meeting: { icon: Users, color: "#0ea5e9" },
};

/** Keyboard and mouse figures: the `activity` grant (SPEC 1.2). */
const ACTIVITY_KPIS = new Set(["active", "idle"]);
/** Breaks, lunch and meetings: the presence timeline, the `timeline` grant. */
const TIMELINE_KPIS = new Set(["break", "lunch", "meeting"]);

export const analyticsKeys = {
  day: (userId: string, date: string) => ["analytics", userId, date] as const,
  timesheetDay: (userId: string, date: string) => ["timesheet", userId, date, date] as const,
};

function NotGranted({ what }: { what: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-500">
      <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      Ask your Admin for access to {what}.
    </p>
  );
}

/** A 403 GRANT_REQUIRED: the section is not shared with this manager. */
function grantMissing(error: unknown): boolean {
  return errorStatus(error) === 403 && errorCode(error) === "GRANT_REQUIRED";
}

/**
 * One person's day (SPEC 7.2 Team member page), showing only what the viewer
 * may see: screenshots (grant `screenshots`), the timeline with apps and sites
 * (grant `timeline`), keyboard and mouse activity (grant `activity`). Admins and
 * Super Admins see every section.
 */
export function ProductivityDashboard({
  userId,
  userName,
  date,
  backHref,
  backLabel = "Back",
  grants = ALL_GRANTS,
  canCapture = true,
}: {
  userId: string;
  userName?: string;
  date?: string;
  backHref?: string;
  backLabel?: string;
  grants?: Grants;
  /** Admins ask an agent for a screenshot now; a manager's grant is view-only. */
  canCapture?: boolean;
}) {
  const today = todayKey();
  const [selectedDate, setSelectedDate] = useState(date ?? today);
  const [exportOpen, setExportOpen] = useState(false);
  const queryClient = useQueryClient();
  const wantsAnalytics = grants.timeline || grants.activity;
  const isToday = selectedDate === today;

  const analytics = useQuery({
    queryKey: analyticsKeys.day(userId, selectedDate),
    queryFn: () => getDashboardAnalytics(userId, selectedDate),
    enabled: wantsAnalytics,
    staleTime: 30_000,
  });
  // The day's focus, target and in/out times: the same one-request timesheet.
  const day = useQuery({
    queryKey: analyticsKeys.timesheetDay(userId, selectedDate),
    queryFn: () => getTimesheet(userId, selectedDate, selectedDate, { fallbackName: userName }),
    staleTime: 30_000,
    refetchInterval: isToday ? 60_000 : false,
  });

  // SPEC 1.2: the active/idle chart is keyboard and mouse activity (grant
  // `activity`); the presence timeline (work, breaks, lunch, meetings) and the
  // apps and sites are the `timeline` grant. A viewer with the timeline but not
  // the activity grant (the API also answers /analytics with 403 GRANT_REQUIRED
  // for them) gets the presence timeline instead of the active/idle chart.
  const showPresenceTimeline = grants.timeline && (!grants.activity || analytics.isError);
  const presenceTimeline = useQuery({
    queryKey: ["presence-timeline", userId, selectedDate],
    queryFn: () => getActivityTimeline(userId, selectedDate),
    enabled: showPresenceTimeline,
    staleTime: 30_000,
  });

  // A partial grant: the live socket sends `app` null without the timeline grant
  // and `activeSec` 0 without the activity grant; neither is shown then, and the
  // current app (timeline data) is only asked for with the timeline grant.
  const { status, connected, live, current, presence } = useLiveStatus(userId, {
    activity: wantsAnalytics,
    current: grants.timeline,
  });

  // A break, meeting or End Day changes the totals, which only the server
  // computes: refetch, at most every 15 seconds (SPEC 7.5).
  usePresenceRefresh(
    () => {
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.day(userId, selectedDate) });
      void queryClient.invalidateQueries({
        queryKey: analyticsKeys.timesheetDay(userId, selectedDate),
      });
    },
    { userId, enabled: isToday },
  );

  const row = day.data?.rows[0];
  const person = day.data?.person;
  const name = userName || person?.name || "Team member";
  const usingApp = status && status !== "OFFLINE" && current?.app ? current : null;

  const kpis = useMemo(() => {
    const data = analytics.data;
    if (!data) return [];
    return (
      (data.kpis ?? [])
        .filter((k) =>
          ACTIVITY_KPIS.has(k.key)
            ? grants.activity
            : TIMELINE_KPIS.has(k.key)
              ? grants.timeline
              : grants.activity,
        )
        // A figure the server redacted (no grant for it) is left out, not shown empty.
        .filter((k) => k.value !== null && k.value !== undefined)
        .map((k) => {
          if (k.key === "active" && live.activeSec != null)
            return { ...k, value: formatDuration(live.activeSec) };
          if (k.key === "idle" && live.idleSec != null)
            return { ...k, value: formatDuration(live.idleSec) };
          return k;
        })
    );
  }, [analytics.data, grants.activity, grants.timeline, live.activeSec, live.idleSec]);

  const header = (
    <div className="space-y-4">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={name} className="h-12 w-12 text-sm" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{name}</h1>
            <p className="text-sm text-slate-500">
              {[person?.designation, person?.department].filter(Boolean).join(" · ") ||
                "Productivity"}
              {" · "}
              {isToday ? "Today" : formatDayWithWeekday(selectedDate)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {wantsAnalytics && status ? (
                <LiveStatusBadge status={status} live={connected} />
              ) : presence ? (
                <Chip tone={presenceLook(presence).tone} dot>
                  {presenceLook(presence).label}
                </Chip>
              ) : null}
              {row?.in && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  <LogIn className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  In {row.in.text}
                </span>
              )}
              {row?.out && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  <LogOut className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  Out {row.out.text}
                </span>
              )}
              {row?.label && <Chip tone="violet">{row.label}</Chip>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm">
            <span className="text-slate-400">Date</span>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value || today)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none"
            />
          </label>
          <button type="button" onClick={() => setExportOpen(true)} className={btnPrimary}>
            <Download className="h-4 w-4" aria-hidden />
            Export timesheet
          </button>
        </div>
      </div>

      <section
        className={`${cardBase} grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center`}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isToday ? "Focus today" : "Focus that day"}
          </p>
          {day.isPending ? (
            <p className="mt-1 text-sm text-slate-400">Loading…</p>
          ) : day.isError ? (
            <p className="mt-1 text-sm text-rose-600">
              {errorMessage(day.error) ?? "Couldn't load the day."}
            </p>
          ) : (
            <div className="mt-2 max-w-xl">
              <FocusBar focusSec={row?.focusSec ?? 0} targetSec={row?.targetSec ?? 0} />
              {row && offlineText(row.unverifiedSec) && (
                <p className="mt-1.5 text-xs text-slate-500">
                  {offlineText(row.unverifiedSec)}: not counted as focus.
                </p>
              )}
            </div>
          )}
        </div>
        {row && (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:flex sm:gap-6">
            <div>
              <dt className="text-xs text-slate-500">{PAID_TIME_LABEL}</dt>
              <dd
                className="font-semibold tabular-nums text-slate-900"
                title="Focus time plus paid breaks: what payroll uses"
              >
                {formatMinutesDuration(row.paidSec)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Paid breaks</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatMinutesDuration(row.paidBreakSec)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Unpaid</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatMinutesDuration(row.unpaidBreakSec)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Meetings</dt>
              <dd className="font-semibold tabular-nums text-slate-900">
                {formatMinutesDuration(row.meetingsSec)}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <ExportTimesheetDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        userId={userId}
        userName={name}
      />
    </div>
  );

  const data = analytics.data;

  // Outside the viewer's scope (another department, another organisation, or
  // gone): one clear line instead of a page of failed sections.
  if (day.isError && errorStatus(day.error) === 404) {
    return (
      <div className="space-y-4">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        )}
        <div className={cardBase}>
          <EmptyState
            icon={Users}
            title="Not in your team"
            message="This person is not in your departments or organisation, or has been removed."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {header}

      {wantsAnalytics && analytics.isPending && (
        <div className={cardBase}>
          <LoadingState label="Loading the day…" />
        </div>
      )}
      {/* Without the activity grant the line at the bottom already says so. */}
      {wantsAnalytics && analytics.isError && grantMissing(analytics.error) && grants.activity && (
        <NotGranted what="this person's activity" />
      )}
      {wantsAnalytics && analytics.isError && !grantMissing(analytics.error) && (
        <div className={cardBase}>
          <ErrorState
            title="Couldn't load activity"
            message={errorMessage(analytics.error)}
            onRetry={() => void analytics.refetch()}
            retrying={analytics.isFetching}
          />
        </div>
      )}

      {data && kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpis.map((k) => {
            const meta = KPI_META[k.key] ?? { icon: Activity, color: C.indigo };
            return <StatTile key={k.key} stat={k} icon={meta.icon} color={meta.color} />;
          })}
        </div>
      )}

      {(() => {
        const activityChart = data && grants.activity && !showPresenceTimeline && (
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
            <ActivityTimelineChart data={data.timeline ?? []} />
          </DashboardCard>
        );
        const presenceChart = showPresenceTimeline && presenceTimeline.data && (
          <DashboardCard
            title="Work, breaks and meetings by hour"
            aside={
              <div className="hidden flex-wrap items-center gap-3 sm:flex">
                {PRESENCE_SERIES.map((s) => (
                  <LegendDot key={s.key} color={s.color} label={s.key} />
                ))}
              </div>
            }
          >
            <PresenceTimelineChart buckets={presenceTimeline.data.buckets ?? []} />
          </DashboardCard>
        );
        const apps = data && grants.timeline && (
          <DashboardCard title="Top Apps & Websites">
            <TopAppsWidget data={live.topApps ?? data.topApps ?? []} current={usingApp} />
          </DashboardCard>
        );
        const cards = [activityChart || presenceChart, apps].filter(Boolean);
        return cards.length ? (
          <div className={`grid grid-cols-1 gap-5 ${cards.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {activityChart || presenceChart}
            {apps}
          </div>
        ) : null;
      })()}

      {grants.screenshots ? (
        <ScreenshotsWidget userId={userId} date={selectedDate} canCapture={canCapture} />
      ) : (
        <NotGranted what="screenshots" />
      )}

      {data && grants.activity && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
                <div className="sm:pr-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Focus Sessions
                  </h2>
                  <div className="mt-5">
                    <FocusSessionsDonut
                      total={data.focusSessions?.total ?? 0}
                      buckets={data.focusSessions?.buckets ?? []}
                    />
                  </div>
                </div>
                <div className="sm:pl-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Work vs Break
                  </h2>
                  <div className="mt-5">
                    <WorkVsBreakDonut data={data.workBreak ?? { workSec: 0, breakSec: 0 }} />
                  </div>
                </div>
              </div>
            </section>

            <DashboardCard title="Active Time Trend">
              <FocusTimeTrend data={data.focusTrend ?? []} />
            </DashboardCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <DashboardCard title="Daily Flow" className="lg:col-span-2">
              <DailyFlowHeatmap data={data.dailyFlow ?? []} />
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
              <OnlineHoursChart data={data.onlineHours ?? []} />
            </DashboardCard>
          </div>
        </>
      )}

      {!grants.timeline && <NotGranted what="timelines, apps and sites" />}
      {!grants.activity && <NotGranted what="keyboard and mouse activity" />}
    </div>
  );
}
