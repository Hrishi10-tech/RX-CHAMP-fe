import { parseISO } from "date-fns";

import { formatDuration } from "@/features/activity/lib/format";
import type {
  CategoryUsage,
  DashboardAnalytics,
  FocusSessionBucket,
  KpiStat,
  RawDashboardAnalytics,
  RawFocusSession,
} from "@/features/analytics/types";

const KPI_ORDER = ["idle", "active", "break", "lunch", "meeting"] as const;
const KPI_LABEL: Record<string, string> = {
  idle: "Idle Time",
  active: "Active Time",
  break: "Break",
  lunch: "Lunch",
  meeting: "Meeting",
};

function mapKpis(kpis: RawDashboardAnalytics["kpis"]): KpiStat[] {
  return KPI_ORDER.map((key) => {
    const raw = kpis?.[key] ?? { value: 0, deltaPct: null, spark: [] };
    return {
      key,
      label: KPI_LABEL[key] ?? key,
      value: formatDuration(raw.value),
      deltaPct: raw.deltaPct ?? null,
      spark: raw.spark ?? [],
    };
  });
}

function mapFocusSessions(sessions: RawFocusSession[] = []): {
  total: number;
  buckets: FocusSessionBucket[];
} {
  let over60 = 0;
  let mid = 0;
  let short = 0;
  for (const s of sessions) {
    if (s.durationSec > 3600) over60 += 1;
    else if (s.durationSec >= 1800) mid += 1;
    else short += 1;
  }
  return {
    total: sessions.length,
    buckets: [
      { name: "> 60 min", count: over60 },
      { name: "30–60 min", count: mid },
      { name: "15–30 min", count: short },
    ],
  };
}

function deriveOnlineHours(
  dailyFlow: RawDashboardAnalytics["dailyFlow"] = [],
): { date: string; seconds: number }[] {
  const byDate = new Map<string, number>();
  for (const c of dailyFlow) {
    byDate.set(c.date, (byDate.get(c.date) ?? 0) + c.activeSec + c.idleSec);
  }
  return [...byDate.entries()]
    .map(([date, seconds]) => ({ date, seconds }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function mapDailyFlow(dailyFlow: RawDashboardAnalytics["dailyFlow"] = []) {
  const max = Math.max(1, ...dailyFlow.map((c) => c.activeSec + c.idleSec));
  return dailyFlow.map((c) => {
    const js = parseISO(c.date).getDay();
    return {
      day: (js + 6) % 7,
      hour: c.hour,
      value: +((c.activeSec + c.idleSec) / max).toFixed(2),
    };
  });
}

export function mapDashboard(raw: RawDashboardAnalytics): DashboardAnalytics {
  return {
    date: raw.date ?? "",
    kpis: mapKpis(raw.kpis),
    timeline: (raw.timeline ?? []).map((t) => ({
      hour: `${String(t.hour).padStart(2, "0")}:00`,
      activeSec: t.activeSec,
      idleSec: t.idleSec,
    })),
    distribution: {
      totalSec: (raw.distribution?.deepSec ?? 0) + (raw.distribution?.shallowSec ?? 0),
      slices: [
        { name: "Deep Work", seconds: raw.distribution?.deepSec ?? 0 },
        { name: "Shallow Work", seconds: raw.distribution?.shallowSec ?? 0 },
      ],
    },
    categories: (raw.categories ?? []) as CategoryUsage[],
    focusSessions: mapFocusSessions(raw.focusSessions),
    workBreak: {
      workSec: raw.workVsBreak?.workSec ?? 0,
      breakSec: raw.workVsBreak?.breakSec ?? 0,
    },
    dailyFlow: mapDailyFlow(raw.dailyFlow),
    focusTrend: (raw.focusTrend ?? []).map((p) => ({
      date: p.date,
      seconds: p.value,
    })),
    onlineHours: deriveOnlineHours(raw.dailyFlow),
    topApps: raw.topApps ?? [],
    achievements: raw.achievements ?? [],
    goals: raw.goals ?? [],
  };
}
