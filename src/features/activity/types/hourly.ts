/**
 * SPEC 3.1 section 3.5 / 3.6: keyboard and mouse minutes in each hour of a day,
 * for managers and Super Admins only. Never part of focus time.
 */
export interface HourActivity {
  /** 0..23, business time. */
  hour: number;
  activeMin: number;
  /** Minutes inside a work session, not on a break and not in a meeting. */
  availableMin: number;
  breakMin: number;
  meetingMin: number;
  quiet: boolean;
}

/** `GET /activity/user/:userId/hourly?date=`. */
export interface UserHourlyView {
  date: string;
  hours: HourActivity[];
  activeMin: number;
  quietHours: number;
}
