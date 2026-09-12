import { format, parseISO } from "date-fns";

import { getUserDaily } from "@/features/activity/api/getUserDaily";
import { getUser } from "@/features/users/api/getUser";

/** How many days are fetched at once. Small enough to stay polite to the API. */
const BATCH_SIZE = 5;

/** Hard ceiling on a single export, so a mistyped year can't ask for years of rows. */
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

/**
 * Who the timesheet is for. Identical on every row, so it is fetched once and printed
 * in the header / repeated down the name column rather than re-requested per day.
 */
export interface TimesheetEmployee {
  name: string;
  /** No team concept exists server-side — the column prints blank, as in the spec. */
  team: string;
  department: string;
  company: string;
}

/**
 * One line of the timesheet. Every field is null when the day's fetch failed, which
 * prints as a dash instead of dropping the row — a missing date in a date range reads
 * as a bug, an empty row reads as "nothing tracked".
 */
export interface TimesheetRow {
  date: string;
  /** Local `HH:mm`, or null when the user never clocked in. */
  inTime: string | null;
  outTime: string | null;
  /** Active seconds. Printed as both Working Time and Productive Time. */
  workingSec: number | null;
  /** Idle seconds, printed as Away Time. */
  awaySec: number | null;
}

export interface TimesheetReport {
  employee: TimesheetEmployee;
  rows: TimesheetRow[];
}

/** ISO timestamp → local `09:47`, or null if absent/unparseable. */
function clockTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? null : format(d, "HH:mm");
  } catch {
    return null;
  }
}

/**
 * Loads the employee once, then every day in the range.
 *
 * Only the daily activity rollup is needed: it carries the clock-in/out times *and*
 * the raw active/idle seconds, and per `docs/analytics-dashboard-api.md` the dashboard's
 * Active KPI is that same `activeSec` merely formatted — so the printed figures match
 * the screen without a second request per day.
 *
 * A day that fails resolves to an empty row rather than aborting the whole export.
 */
export async function fetchTimesheet(
  userId: string,
  dates: string[],
  fallbackName?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<TimesheetReport> {
  // Best-effort: a report with blank employee details still beats no report at all.
  const user = await getUser(userId).catch(() => null);
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  const employee: TimesheetEmployee = {
    name: user?.name || fullName || fallbackName || "—",
    team: "",
    // `designation` is the fallback because some records carry the discipline there
    // instead — the column means the same thing to whoever reads the sheet.
    department: user?.department || user?.designation || "",
    company: user?.company || "",
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const rows: TimesheetRow[] = [];

  for (let i = 0; i < dates.length; i += BATCH_SIZE) {
    const batch = dates.slice(i, i + BATCH_SIZE);
    const loaded = await Promise.all(
      batch.map((date) =>
        getUserDaily(userId, date)
          .then((d): TimesheetRow => {
            // `clockOutAt` is only a real sign-off once the day has ended; before that
            // it is just the latest sample. On a past day that sample *is* effectively
            // when they stopped, so it is shown — on today it is still moving, so it
            // is not.
            const settled = d.dayEnded || date < today;
            return {
              date,
              inTime: clockTime(d.loginAt ?? d.clockInAt),
              outTime: settled ? clockTime(d.clockOutAt) : null,
              workingSec: d.activeSec ?? 0,
              awaySec: d.idleSec ?? 0,
            };
          })
          .catch(
            (): TimesheetRow => ({
              date,
              inTime: null,
              outTime: null,
              workingSec: null,
              awaySec: null,
            }),
          ),
      ),
    );
    rows.push(...loaded);
    onProgress?.(rows.length, dates.length);
  }

  return { employee, rows };
}
