/** SPEC 3.1 sections 1.10 and 3.8: the organisation settings (one JSON value, key `org`). */
export interface AppSettingsView {
  approvalSlaHours: number;
  blockManagerEndDayWhenOverdue: boolean;
  fullDayPct: number;
  halfDayPct: number;
  lateStartGraceMin: number;
  quietHourActiveMin: number;
  quietHoursFlag: number;
  autoCloseAfterShiftEndMin: number;
}

export type NumericSettingKey = Exclude<keyof AppSettingsView, "blockManagerEndDayWhenOverdue">;

/** `PATCH /settings` takes any subset. */
export type AppSettingsPatch = Partial<AppSettingsView>;
