import type { IconType } from "react-icons";

import type { ActivityStatus } from "@/features/activity/types";

export interface AppIconDef {
  keywords: string[];
  Icon: IconType;
  color: string;
}

export interface KpiStat {
  key: string;
  label: string;
  value: string;
  deltaPct: number | null;
  spark: number[];
}

export interface HourActivity {
  hour: string;
  activeSec: number;
  idleSec: number;
}

export interface DistributionSlice {
  name: string;
  seconds: number;
}

export interface OnlineHoursPoint {
  date: string;
  seconds: number;
}

export interface CategoryUsage {
  name: string;
  seconds: number;
}

export interface FocusSessionBucket {
  name: string;
  count: number;
}

export interface WorkBreakSplit {
  workSec: number;
  breakSec: number;
}

export interface DailyFlowCell {
  day: number;
  hour: number;
  value: number;
}

export interface FocusTrendPoint {
  date: string;
  seconds: number;
}

export interface AppUsageRow {
  name: string;
  seconds: number;
}

export interface Achievement {
  key: string;
  title: string;
  subtitle: string;
  when: string;
  icon: "focus" | "tasks" | "streak";
  tone: "violet" | "teal" | "amber";
}

export interface Goal {
  name: string;
  current: number;
  target: number;
  unit?: "seconds" | "count";
}

export interface DashboardAnalytics {
  date: string;
  kpis: KpiStat[];
  timeline: HourActivity[];
  distribution: { totalSec: number; slices: DistributionSlice[] };
  categories: CategoryUsage[];
  focusSessions: { total: number; buckets: FocusSessionBucket[] };
  workBreak: WorkBreakSplit;
  dailyFlow: DailyFlowCell[];
  focusTrend: FocusTrendPoint[];
  onlineHours: OnlineHoursPoint[];
  topApps: AppUsageRow[];
  achievements: Achievement[];
  goals: Goal[];
}

export type PresenceStatus = "WORKING" | "BREAK" | "LUNCH" | "MEETING";

export type LiveStatus = ActivityStatus | "BREAK" | "LUNCH" | "MEETING";

export interface CurrentAppFields {
  app?: string | null;
  title?: string | null;
  url?: string | null;
}

export interface ActivityUpdate extends CurrentAppFields {
  userId: string;
  status: ActivityStatus;
  activeSec?: number;
  idleSec?: number;
  topApps?: AppUsageRow[];
}

export interface ActivityMe {
  current?: { status?: ActivityStatus } & CurrentAppFields;
  activeSec?: number;
  idleSec?: number;
  topApps?: AppUsageRow[];
}

export interface PresenceUpdate {
  userId: string;
  status: PresenceStatus;
}

export interface CurrentApp {
  app: string | null;
  title: string | null;
  url: string | null;
}

export interface LiveActivityData {
  activeSec: number | null;
  idleSec: number | null;
  topApps: AppUsageRow[] | null;
}

export interface CurrentAppInfo {
  app: string | null;
  title: string | null;
  url: string | null;
}

export interface RawKpi {
  value: number;
  deltaPct: number | null;
  spark: number[];
}

export interface RawFocusSession {
  start: string;
  end: string;
  durationSec: number;
}

export interface RawDashboardAnalytics {
  userId?: string;
  date?: string;
  generatedAt?: string;
  kpis?: Record<string, RawKpi>;
  workVsBreak?: { workSec: number; breakSec: number };
  topApps?: { name: string; seconds: number }[];
  timeline?: { hour: number; activeSec: number; idleSec: number }[];
  weeklyScore?: { date: string; value: number }[];
  focusTrend?: { date: string; value: number }[];
  dailyFlow?: { date: string; hour: number; activeSec: number; idleSec: number }[];
  focusSessions?: RawFocusSession[];
  distribution?: { deepSec: number; shallowSec: number };
  categories?: { name: string; seconds: number }[];
  taskCompletion?: unknown;
  achievements?: Achievement[];
  goals?: Goal[];
}
