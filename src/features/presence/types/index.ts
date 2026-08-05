import type { PresenceStatus } from "@/features/analytics/types";

/** One row of `GET /presence/team/live` — a report's current presence status. */
export interface TeamLiveMember {
  userId: string;
  name: string;
  email: string;
  department: string | null;
  status: PresenceStatus;
  note: string | null;
  since: string | null;
  /** Seconds elapsed in the current status (0 when WORKING). */
  elapsedSec: number;
}

export interface PresenceDayTotals {
  onlineSec: number;
  breakSec: number;
  lunchSec: number;
  meetingSec: number;
  idleSec?: number;
}

export interface PresenceDay {
  date: string;
  totals: PresenceDayTotals;
}

export interface UserPresenceHistory {
  userId: string;
  name: string;
  email: string;
  department: string;
  days: PresenceDay[];
}
