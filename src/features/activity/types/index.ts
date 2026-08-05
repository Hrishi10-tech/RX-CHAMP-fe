export type ActivityStatus = "ACTIVE" | "IDLE" | "OFFLINE";

export interface CurrentActivity {
  status: ActivityStatus;
  app: string | null;
  title: string | null;
  url: string | null;
  idle: boolean;
  lastSampleAt: string | null;
  staleSec: number;
}

export interface AppUsage {
  name: string;
  seconds: number;
}

export interface RecentApp {
  app: string;
  title: string | null;
  url: string | null;
  lastUsedAt: string | null;
}

export interface HourlyActivity {
  hour: number;
  activeSec: number;
  idleSec: number;
}

export interface LiveActivityUpdate {
  userId: string;
  name: string;
  email: string;
  department: string;
  status: ActivityStatus;
  app: string | null;
  title: string | null;
  url: string | null;
  lastSampleAt: string | null;
  activeSec: number;
  idleSec: number;
}

export interface MyActivityUpdate {
  current: {
    status: ActivityStatus;
    app: string | null;
    title: string | null;
    url: string | null;
    idle: boolean;
  };
  date: string;
  activeSec: number;
  idleSec: number;
  workingBasisSec: number;
  remainingSec: number;
  clockedOut: boolean;
}

export interface DailyActivity {
  date: string;
  activeSec: number;
  idleSec: number;
  workingBasisSec: number;
  extraSec: number;
  remainingSec: number;
  clockedOut: boolean;
  clockInAt: string | null;
  clockOutAt: string | null;
  topApps: AppUsage[];
  topWebsites: AppUsage[];
  hourly: HourlyActivity[];
}
