export interface DailyProductivity {
  date: string;
  score: number;
  focusSec: number;
  meetingSec: number;
  idleSec: number;
  onlineSec?: number;
}

export interface TimelineBucket {
  start: string;
  breakSec: number;
  lunchSec: number;
  meetingSec: number;
  workSec: number;
  idleSec?: number;
}

export interface ActivityTimeline {
  userId?: string;
  date: string;
  buckets: TimelineBucket[];
}
