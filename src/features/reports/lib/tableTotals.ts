import type { MonthTotals, PersonPayroll } from "@/features/reports/types";

/**
 * A report table's totals row (W-23): the people shown, added up. Each sum is exact; the
 * percentage is the team's focus over the team's expected time, never an average of averages.
 *
 * Focus and expected time are what payroll counts (B-1), exactly as the API totals them
 * (be payroll-pause.ts): a person whose payroll is paused for the whole month is left out, and
 * one with some paused days gives only the days calculated. Attendance, late starts, skips,
 * quiet hours and open items are tracking: everyone shown.
 */
export type MonthTableTotals = Pick<
  MonthTotals,
  | "focusSec"
  | "expectedSec"
  | "full"
  | "half"
  | "absent"
  | "lateStarts"
  | "skipped"
  | "autoSkipped"
  | "quietHours"
  | "pending"
> & { people: number; paused: number; partlyPaused: number };

type MonthRow = { totals: MonthTotals; payroll?: Pick<PersonPayroll, "paused" | "totals"> };

export function monthTableTotals(rows: MonthRow[]): MonthTableTotals {
  const sum = (pick: (t: MonthTotals) => number) =>
    rows.reduce((n, r) => n + Math.max(0, pick(r.totals) || 0), 0);
  const forPayroll = (pick: (t: MonthTotals) => number) =>
    rows.reduce(
      (n, r) =>
        r.payroll?.paused ? n : n + Math.max(0, pick(r.payroll ? r.payroll.totals : r.totals) || 0),
      0,
    );
  return {
    people: rows.length,
    paused: rows.filter((r) => r.payroll?.paused).length,
    partlyPaused: rows.filter((r) => r.payroll && !r.payroll.paused).length,
    focusSec: forPayroll((t) => t.focusSec),
    expectedSec: forPayroll((t) => t.expectedSec),
    full: sum((t) => t.full),
    half: sum((t) => t.half),
    absent: sum((t) => t.absent),
    lateStarts: sum((t) => t.lateStarts),
    skipped: sum((t) => t.skipped),
    autoSkipped: sum((t) => t.autoSkipped),
    quietHours: sum((t) => t.quietHours),
    pending: sum((t) => t.pending),
  };
}

type DayRow = {
  focusSec: number;
  expectedSec: number;
  breakSec: number;
  meetingSec: number;
  pending: number;
  idleSec?: number | null;
  working: number | null;
  payrollPaused?: boolean;
};

/** The day table's totals row (W-23). A figure nobody reported (idle with no agent) stays unread. */
export function dayTableTotals(rows: DayRow[]) {
  const sum = (pick: (r: DayRow) => number) =>
    rows.reduce((n, r) => n + Math.max(0, pick(r) || 0), 0);
  const forPayroll = (pick: (r: DayRow) => number) =>
    rows.reduce((n, r) => (r.payrollPaused ? n : n + Math.max(0, pick(r) || 0)), 0);
  const known = (pick: (r: DayRow) => number | null | undefined) =>
    rows.some((r) => pick(r) != null)
      ? rows.reduce((n, r) => n + Math.max(0, pick(r) ?? 0), 0)
      : null;
  return {
    people: rows.length,
    paused: rows.filter((r) => r.payrollPaused).length,
    working: known((r) => r.working),
    focusSec: forPayroll((r) => r.focusSec),
    expectedSec: forPayroll((r) => r.expectedSec),
    idleSec: known((r) => r.idleSec),
    breakSec: sum((r) => r.breakSec),
    meetingSec: sum((r) => r.meetingSec),
    pending: sum((r) => r.pending),
  };
}

/** The totals row's label: it says when paused people are left out of focus time (owner, 19 Nov). */
export function totalsLabel(sum: {
  people: number;
  paused: number;
  partlyPaused?: number;
}): string {
  const people = `${sum.people} ${sum.people === 1 ? "person" : "people"}`;
  if (sum.paused > 0)
    return `Total for payroll, ${people} (${sum.paused} paused, left out of focus time)`;
  if (sum.partlyPaused) return `Total for payroll, ${people} (paused days left out of focus time)`;
  return `Total, ${people}`;
}
