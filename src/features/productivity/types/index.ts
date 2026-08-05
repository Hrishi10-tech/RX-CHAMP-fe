export interface DailyProductivity {
  date: string;
  score: number;
  focusSec: number;
  meetingSec: number;
  idleSec: number;
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
  date: string;
  buckets: TimelineBucket[];
}
