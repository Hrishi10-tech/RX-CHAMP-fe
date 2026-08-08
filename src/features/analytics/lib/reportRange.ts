import { format, parseISO } from "date-fns";

import { getDashboardAnalytics } from "@/features/analytics/api/getDashboardAnalytics";
import type { DashboardAnalytics } from "@/features/analytics/types";

/** How many days are fetched at once. Small enough to stay polite to the API. */
const BATCH_SIZE = 5;

/** Hard ceiling on a single export, so a mistyped year can't ask for 30 years of pages. */
export const MAX_REPORT_DAYS = 120;

/** Every `YYYY-MM-DD` from `from` to `to` inclusive, oldest first. */
export function datesBetween(from: string, to: string): string[] {
  const start = parseISO(from);
  const end = parseISO(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const out: string[] = [];
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(format(d, "yyyy-MM-dd"));
  }
  return out;
}

/** One day of the report: the day's analytics, or null when the fetch failed. */
export interface ReportDay {
  date: string;
  data: DashboardAnalytics | null;
}

/**
 * Loads every day in the range. The analytics endpoint is per-day, so this walks the
 * range in small concurrent batches and reports progress — a two-month export is a
 * few dozen requests and takes a couple of seconds.
 *
 * A day that fails resolves to `null` rather than aborting the whole export; the page
 * for it renders an explicit "couldn't load" note instead of silently going missing.
 */
export async function fetchReportRange(
  userId: string,
  dates: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<ReportDay[]> {
  const days: ReportDay[] = [];

  for (let i = 0; i < dates.length; i += BATCH_SIZE) {
    const batch = dates.slice(i, i + BATCH_SIZE);
    const loaded = await Promise.all(
      batch.map((date) =>
        getDashboardAnalytics(userId, date)
          .then((data) => ({ date, data }))
          .catch(() => ({ date, data: null })),
      ),
    );
    days.push(...loaded);
    onProgress?.(days.length, dates.length);
  }

  return days;
}
