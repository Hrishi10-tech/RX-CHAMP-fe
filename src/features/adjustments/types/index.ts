/**
 * Manual focus adjustments (3.3). The Super Manager, and nobody else, adds
 * minutes to or takes minutes off one person's day with a reason, while the
 * person's organisation allows it (Settings, per organisation in 4.0). The
 * person is told; the day's focus time, paid time and reports carry it; a
 * mistake is undone (voided), never edited.
 */
export interface FocusAdjustmentView {
  id: string;
  userId: string;
  userName: string;
  companyName: string | null;
  /** "YYYY-MM-DD", the business day adjusted. */
  date: string;
  /** Signed seconds added to the day's focus time. */
  deltaSec: number;
  /** "+30 min" / "−15 min". */
  label: string;
  reason: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  voidedAt: string | null;
  voidedByName: string | null;
}

export interface AdjustFocusInput {
  userId: string;
  date: string;
  /** Whole minutes, never 0, at most ±720. */
  minutes: number;
  reason: string;
}

export interface ListAdjustmentsParams {
  userId?: string;
  /** "YYYY-MM". */
  month?: string;
  /** Super Admin or Super Manager with no organisation picked: one organisation. */
  companyId?: string;
  includeVoided?: boolean;
  limit?: number;
}

/** The server's limits, mirrored for the form (the server still decides). */
export const ADJUSTMENT_MAX_MIN = 720;
export const ADJUSTMENT_REASON_MIN_CHARS = 5;
export const ADJUSTMENT_REASON_MAX_CHARS = 300;
export const ADJUSTMENT_MAX_AGE_DAYS = 62;
