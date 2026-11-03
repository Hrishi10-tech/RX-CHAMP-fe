/**
 * SPEC 3.1 sections 1.10 and 3.8, and 4.0 section 2.4: the organisation settings
 * (one JSON value per organisation, key `org:<id>`).
 */
export interface AppSettingsView {
  approvalSlaHours: number;
  blockManagerEndDayWhenOverdue: boolean;
  fullDayPct: number;
  halfDayPct: number;
  lateStartGraceMin: number;
  quietHourActiveMin: number;
  quietHoursFlag: number;
  autoCloseAfterShiftEndMin: number;
  /** 4.0: paid break minutes on top of the scheduled breaks, per day (SPEC 2.4). */
  breakBufferMin: number;
  /**
   * 3.3: the Super Manager may add minutes to or take minutes off a person's day
   * by hand. On by default; an older server leaves it out (read as on).
   */
  focusAdjustmentsEnabled: boolean;
}

export type NumericSettingKey = Exclude<
  keyof AppSettingsView,
  "blockManagerEndDayWhenOverdue" | "focusAdjustmentsEnabled"
>;

/** `PATCH /settings` takes any subset. */
export type AppSettingsPatch = Partial<AppSettingsView>;
