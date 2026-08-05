"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Activity, ArrowLeft, Clock, Coffee, Moon, Users, Utensils } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getUserHistory } from "@/features/presence/api/getUserHistory";
import type {
  PresenceDay,
  PresenceDayTotals,
  UserPresenceHistory,
} from "@/features/presence/types";
import { getDailyProductivity } from "@/features/productivity/api/getDailyProductivity";
import { getActivityTimeline } from "@/features/productivity/api/getActivityTimeline";
import { ProductivityGauge } from "@/features/productivity/components/ProductivityGauge";
import type { ActivityTimeline, DailyProductivity } from "@/features/productivity/types";
import { getUserCurrent } from "@/features/activity/api/getUserCurrent";
import { getUserDaily } from "@/features/activity/api/getUserDaily";
import type { CurrentActivity, DailyActivity, LiveActivityUpdate } from "@/features/activity/types";
import { useReportActivityLive } from "@/features/activity/hooks/useReportActivityLive";
import { useRecentApps } from "@/features/activity/hooks/useRecentApps";
import { CurrentlyUsingPanel } from "@/features/activity/components/CurrentlyUsingPanel";
import { TopAppsList } from "@/features/activity/components/TopAppsList";
import { ActiveIdleDonut } from "@/features/activity/components/ActiveIdleDonut";
import { ActivityStatusBadge } from "@/features/activity/components/ActivityStatusBadge";
import { Avatar } from "@/app/dashboard/admin/team-management/companies";
import { LoadingOverlay } from "@/components/ui/Loader";
import { UserScreenshots } from "@/features/screenshots/components/UserScreenshots";

const BRAND = "rgb(34 34 204)";
const BRAND_MUTED = "rgba(34,34,204,0.28)";
const TEAL = "#2dd4bf";
const AMBER = "#f59e0b";

const CAT = {
  work: BRAND,
  break: "#cbd5e1",
  lunch: TEAL,
  meeting: "#a855f7",
  idle: AMBER,
};

const toHours = (sec: number) => +(sec / 3600).toFixed(2);
const toMinutes = (sec: number) => Math.round(sec / 60);

const focusSecOf = (t: PresenceDayTotals) => Math.max(0, t.onlineSec - t.meetingSec);

function formatDayLabel(date: string): string {
  try {
    return format(parseISO(date), "EEE d");
  } catch {
    return date;
  }
}

function formatDayLong(date: string): string {
  try {
    return format(parseISO(date), "EEEE, MMM d");
  } catch {
    return date;
  }
}

function heuristicProductivity(date: string, t: PresenceDayTotals): DailyProductivity {
  const focusSec = focusSecOf(t);
  const meetingSec = t.meetingSec;
  const idleSec = t.breakSec + t.lunchSec;
  const total = focusSec + meetingSec + idleSec;
  const score = total > 0 ? +((10 * focusSec) / total).toFixed(1) : 0;
  return { date, score, focusSec, meetingSec, idleSec };
}

function StatTile({
  icon: Icon,
  label,
  minutes,
}: {
  icon: typeof Coffee;
  label: string;
  minutes: number;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
        {minutes}
        <span className="ml-1 text-sm font-medium text-slate-400">min</span>
      </p>
    </div>
  );
}

function Card({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function UserActivityView({
  userId,
  fallbackName,
  backHref = "/dashboard/manager",
  backLabel = "My Team",
}: {
  userId: string;
  fallbackName?: string;
  backHref?: string;
  backLabel?: string;
}) {
  const [history, setHistory] = useState<UserPresenceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [productivity, setProductivity] = useState<DailyProductivity | null>(null);
  const [timeline, setTimeline] = useState<ActivityTimeline | null>(null);

  const [daily, setDaily] = useState<DailyActivity | null>(null);
  const [current, setCurrent] = useState<CurrentActivity | null>(null);
  const [live, setLive] = useState<LiveActivityUpdate | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getUserHistory(userId)
      .then((data) => {
        if (!active) return;
        setHistory(data);
        setSelectedDate(data.days.at(-1)?.date ?? null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Couldn't load activity.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const days = useMemo(() => history?.days ?? [], [history]);
  const latestDate = days.at(-1)?.date ?? null;
  const earliestDate = days[0]?.date ?? null;

  const selectedDay: PresenceDay | undefined = useMemo(
    () => days.find((d) => d.date === selectedDate),
    [days, selectedDate],
  );

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;

    getDailyProductivity(userId, selectedDate)
      .then((p) => active && setProductivity(p))
      .catch(() => {
        if (active)
          setProductivity(
            selectedDay ? heuristicProductivity(selectedDate, selectedDay.totals) : null,
          );
      });

    getActivityTimeline(userId, selectedDate)
      .then((t) => active && setTimeline(t))
      .catch(() => active && setTimeline(null));

    setDaily(null);
    getUserDaily(userId, selectedDate)
      .then((d) => active && setDaily(d))
      .catch(() => active && setDaily(null));

    return () => {
      active = false;
    };
  }, [userId, selectedDate, selectedDay]);

  useEffect(() => {
    let active = true;

    const poll = () => {
      getUserCurrent(userId)
        .then((c) => active && setCurrent(c))
        .catch(() => active && setCurrent(null));
    };

    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [userId]);

  const handleLive = useCallback((u: LiveActivityUpdate) => {
    setLive(u);
    setCurrent({
      status: u.status,
      app: u.app,
      title: u.title,
      url: u.url,
      idle: u.status === "IDLE",
      lastSampleAt: u.lastSampleAt,
      staleSec: 0,
    });
  }, []);
  const liveConnected = useReportActivityLive(userId, handleLive);

  const recentApps = useRecentApps(current);

  const onlineChartData = useMemo(
    () =>
      days.map((d) => ({
        date: d.date,
        label: formatDayLabel(d.date),
        hours: toHours(d.totals.onlineSec),
      })),
    [days],
  );

  const focusTrendData = useMemo(
    () =>
      days.map((d) => ({
        label: formatDayLabel(d.date),
        hours: toHours(focusSecOf(d.totals)),
      })),
    [days],
  );

  const avgHours = useMemo(() => {
    if (onlineChartData.length === 0) return 0;
    const sum = onlineChartData.reduce((s, d) => s + d.hours, 0);
    return +(sum / onlineChartData.length).toFixed(2);
  }, [onlineChartData]);

  const timelineData = useMemo(
    () =>
      (timeline?.buckets ?? []).map((b) => ({
        label: b.start,
        Work: toMinutes(b.workSec),
        Break: toMinutes(b.breakSec),
        Lunch: toMinutes(b.lunchSec),
        Meeting: toMinutes(b.meetingSec),
        Idle: toMinutes(b.idleSec ?? 0),
      })),
    [timeline],
  );

  const liveTotals = selectedDate === latestDate ? live : null;
  const idleSec = liveTotals?.idleSec ?? daily?.idleSec ?? selectedDay?.totals.idleSec ?? 0;
  const activeSec =
    liveTotals?.activeSec ??
    daily?.activeSec ??
    (selectedDay ? Math.max(0, selectedDay.totals.onlineSec - idleSec) : 0);

  const displayName = history?.name ?? fallbackName ?? "Team member";
  const isToday = selectedDate === latestDate;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={displayName} className="h-12 w-12 text-base" />
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{displayName}</h1>
                {current && <ActivityStatusBadge status={current.status} />}
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {[history?.email, history?.department].filter(Boolean).join(" · ") ||
                  "Productivity overview"}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <span className="text-slate-400">Date</span>
            <input
              type="date"
              value={selectedDate ?? ""}
              min={earliestDate ?? undefined}
              max={latestDate ?? undefined}
              onChange={(e) => setSelectedDate(e.target.value || null)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none"
            />
          </label>
        </div>
      </div>

      <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
        {displayName} — Productivity Hub
      </h2>

      {loading ? (
        <LoadingOverlay label="Loading activity…" />
      ) : error ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 text-sm text-red-600">
          {error}
        </div>
      ) : !history || days.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
          No activity recorded yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <Card
                title="Currently Using"
                aside={
                  liveConnected ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Live
                    </span>
                  ) : undefined
                }
              >
                <CurrentlyUsingPanel current={current} recent={recentApps} />
              </Card>

              <Card title={isToday ? "Today" : formatDayLong(selectedDate!)}>
                {selectedDay ? (
                  <div className="space-y-5">
                    <div className="flex divide-x divide-slate-100">
                      <div className="pr-5">
                        <StatTile icon={Activity} label="Active" minutes={toMinutes(activeSec)} />
                      </div>
                      <div className="pl-5">
                        <StatTile icon={Moon} label="Idle" minutes={toMinutes(idleSec)} />
                      </div>
                    </div>
                    <div className="flex divide-x divide-slate-100 border-t border-slate-100 pt-5">
                      <div className="pr-5">
                        <StatTile
                          icon={Coffee}
                          label="Break"
                          minutes={toMinutes(selectedDay.totals.breakSec)}
                        />
                      </div>
                      <div className="px-5">
                        <StatTile
                          icon={Utensils}
                          label="Lunch"
                          minutes={toMinutes(selectedDay.totals.lunchSec)}
                        />
                      </div>
                      <div className="pl-5">
                        <StatTile
                          icon={Users}
                          label="Meeting"
                          minutes={toMinutes(selectedDay.totals.meetingSec)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No activity recorded for this day.</p>
                )}
              </Card>

              <Card title="Productivity Score (Daily)">
                {productivity ? (
                  <ProductivityGauge data={productivity} />
                ) : (
                  <p className="text-sm text-slate-400">No score for this day.</p>
                )}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Focus Trend (Weekly)
                  </h3>
                  <div className="mt-3 h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={focusTrendData}
                        margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={BRAND} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          unit="h"
                          width={36}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v} h`, "Focus"]}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 13,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="hours"
                          stroke={BRAND}
                          strokeWidth={2}
                          fill="url(#focusFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card title="Top Apps">
                <TopAppsList items={daily?.topApps ?? []} />
                {daily?.topWebsites && daily.topWebsites.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Top Websites
                    </h3>
                    <TopAppsList items={daily.topWebsites} />
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-5 lg:col-span-7">
              <Card
                title="Activity Timeline"
                aside={
                  <div className="flex flex-wrap items-center gap-3">
                    <LegendDot color={CAT.break} label="Break" />
                    <LegendDot color={CAT.lunch} label="Lunch" />
                    <LegendDot color={CAT.meeting} label="Meeting" />
                    <LegendDot color={CAT.idle} label="Idle" />
                    <LegendDot color={CAT.work} label="Work" />
                  </div>
                }
              >
                {timelineData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={timelineData}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e2e8f0" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                          unit="m"
                          width={40}
                        />
                        <Tooltip
                          formatter={(v: number, n) => [`${v} min`, n]}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 13,
                          }}
                        />
                        <Bar dataKey="Work" stackId="a" fill={CAT.work} />
                        <Bar dataKey="Break" stackId="a" fill={CAT.break} />
                        <Bar dataKey="Lunch" stackId="a" fill={CAT.lunch} />
                        <Bar dataKey="Idle" stackId="a" fill={CAT.idle} />
                        <Bar
                          dataKey="Meeting"
                          stackId="a"
                          fill={CAT.meeting}
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400">
                    <Clock className="h-6 w-6" />
                    <p>Intraday timeline appears once the backend</p>
                    <p className="text-xs">timeline endpoint is live for this day.</p>
                  </div>
                )}
              </Card>

              <Card title="Active / Idle Split">
                <ActiveIdleDonut activeSec={activeSec} idleSec={idleSec} />
              </Card>

              <Card
                title="Online Hours Per Day"
                aside={
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-0.5 w-4 rounded bg-[#2dd4bf]" />
                    Compare to average
                  </span>
                }
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={onlineChartData}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        unit="h"
                        width={40}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(34,34,204,0.06)" }}
                        formatter={(v: number) => [`${v} h`, "Online"]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      />
                      {avgHours > 0 && (
                        <ReferenceLine
                          y={avgHours}
                          stroke={TEAL}
                          strokeWidth={2}
                          strokeDasharray="5 4"
                        />
                      )}
                      <Bar
                        dataKey="hours"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        onClick={(entry: { date?: string }) => {
                          if (entry?.date) setSelectedDate(entry.date);
                        }}
                        className="cursor-pointer"
                      >
                        {onlineChartData.map((d) => (
                          <Cell key={d.date} fill={d.date === selectedDate ? BRAND : BRAND_MUTED} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          <UserScreenshots userId={userId} />
        </>
      )}
    </div>
  );
}
