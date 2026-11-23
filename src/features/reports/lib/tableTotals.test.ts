import type { MonthTotals } from "@/features/reports/types";

import { dayTableTotals, monthTableTotals, totalsLabel } from "./tableTotals";

const t = (over: Partial<MonthTotals>) => ({
  totals: {
    focusSec: 0,
    expectedSec: 0,
    full: 0,
    half: 0,
    absent: 0,
    lateStarts: 0,
    skipped: 0,
    autoSkipped: 0,
    quietHours: 0,
    pending: 0,
    ...over,
  } as MonthTotals,
});

// W-23: report tables carry a totals row.
describe("monthTableTotals", () => {
  it("adds up the people shown", () => {
    const out = monthTableTotals([
      t({
        focusSec: 3600,
        expectedSec: 7200,
        full: 20,
        half: 1,
        absent: 1,
        lateStarts: 2,
        skipped: 1,
        autoSkipped: 1,
        quietHours: 5,
        pending: 1,
      }),
      t({ focusSec: 1800, expectedSec: 7200, full: 21, lateStarts: 1, pending: 2 }),
    ]);
    expect(out).toEqual({
      people: 2,
      paused: 0,
      partlyPaused: 0,
      focusSec: 5400,
      expectedSec: 14400,
      full: 41,
      half: 1,
      absent: 1,
      lateStarts: 3,
      skipped: 1,
      autoSkipped: 1,
      quietHours: 5,
      pending: 3,
    });
  });

  it("an empty table totals to nothing", () => {
    expect(monthTableTotals([]).people).toBe(0);
    expect(monthTableTotals([]).focusSec).toBe(0);
  });
});

describe("dayTableTotals", () => {
  it("adds up the day, and keeps idle unread when no agent reported", () => {
    const out = dayTableTotals([
      {
        focusSec: 100,
        expectedSec: 200,
        breakSec: 10,
        meetingSec: 5,
        pending: 1,
        idleSec: null,
        working: 120,
      },
      {
        focusSec: 50,
        expectedSec: 200,
        breakSec: 0,
        meetingSec: 0,
        pending: 0,
        idleSec: null,
        working: null,
      },
    ]);
    expect(out).toEqual({
      people: 2,
      paused: 0,
      working: 120,
      focusSec: 150,
      expectedSec: 400,
      idleSec: null,
      breakSec: 10,
      meetingSec: 5,
      pending: 1,
    });
  });
});

// B-1: the Total row is what payroll counts, exactly as the API's report.totals.
describe("payroll-paused people in the totals row", () => {
  const mk = (focusSec: number, expectedSec: number) =>
    t({ focusSec, expectedSec, full: 1, lateStarts: 1 }).totals;

  it("leaves a fully paused person out of focus and expected, never out of attendance", () => {
    const rows = [
      { totals: mk(3600, 7200) },
      { totals: mk(1800, 7200), payroll: { paused: true, totals: mk(0, 0) } },
    ];
    const out = monthTableTotals(rows);
    expect(out.focusSec).toBe(3600);
    expect(out.expectedSec).toBe(7200);
    expect(out.full).toBe(2);
    expect(out.lateStarts).toBe(2);
    expect(out.paused).toBe(1);
    expect(totalsLabel(out)).toBe("Total for payroll, 2 people (1 paused, left out of focus time)");
  });

  it("counts only the calculated days of someone paused for part of the month", () => {
    const out = monthTableTotals([
      { totals: mk(3600, 7200) },
      { totals: mk(5000, 9000), payroll: { paused: false, totals: mk(2000, 4000) } },
    ]);
    expect(out.focusSec).toBe(5600);
    expect(out.expectedSec).toBe(11200);
    expect(totalsLabel(out)).toBe(
      "Total for payroll, 2 people (paused days left out of focus time)",
    );
  });

  it("the day table leaves a paused person's focus out and says so", () => {
    const out = dayTableTotals([
      {
        focusSec: 100,
        expectedSec: 200,
        breakSec: 10,
        meetingSec: 5,
        pending: 1,
        idleSec: 3,
        working: 120,
      },
      {
        focusSec: 50,
        expectedSec: 200,
        breakSec: 4,
        meetingSec: 0,
        pending: 0,
        idleSec: 1,
        working: 60,
        payrollPaused: true,
      },
    ]);
    expect(out.focusSec).toBe(100);
    expect(out.expectedSec).toBe(200);
    expect(out.breakSec).toBe(14);
    expect(totalsLabel(out)).toBe("Total for payroll, 2 people (1 paused, left out of focus time)");
  });

  it("with nobody paused the label is the plain one", () => {
    expect(totalsLabel(monthTableTotals([{ totals: mk(1, 2) }, { totals: mk(1, 2) }]))).toBe(
      "Total, 2 people",
    );
  });
});
