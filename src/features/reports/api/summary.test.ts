import { daySummaryOf } from "@/features/reports/api/reports";
import { runFigures, runFiguresText } from "@/features/reports/lib/runs";
import { unverifiedNote } from "@/features/reports/components/ReportParts";
import type { PersonDaySummary } from "@/features/reports/types";

jest.mock("@/lib/api", () => ({ apiClient: { get: jest.fn() } }));

/** A 3.1-shaped day summary: none of the 4.0 fields. */
function day31(): PersonDaySummary {
  return {
    date: "2026-10-20",
    weekday: 2,
    workday: true,
    dayClass: "FULL",
    startedAt: "2026-10-20T04:00:00.000Z",
    endedAt: "2026-10-20T13:00:00.000Z",
    autoClosed: false,
    lateStart: null,
    focusSec: 27000,
    expectedSec: 28800,
    breakSec: 3600,
    meetingSec: 0,
    approvedPlusSec: 0,
    rejectedMinusSec: 0,
    pendingPlusSec: 0,
    pendingMinusSec: 0,
    breaksTaken: 3,
    skipped: 0,
    autoSkipped: 0,
    overruns: 0,
    meetings: 0,
    pending: 0,
    quietHours: 0,
    activeMin: 400,
  } as unknown as PersonDaySummary;
}

describe("day summaries", () => {
  it("fills the 4.0 fields an older server leaves out (target from expected)", () => {
    const d = daySummaryOf(day31());
    expect(d).toMatchObject({
      targetSec: 28800,
      paidBreakSec: 0,
      unpaidBreakSec: 0,
      awayApprovedSec: 0,
      awayPendingSec: 0,
      unverifiedSec: 0,
      label: null,
    });
    // No paid time from a 3.x server: focus time plus paid breaks (none).
    expect(d.paidSec).toBe(27000);
  });

  it("keeps the server's paid time, and works it out when a 4.0 day leaves it out", () => {
    expect(daySummaryOf({ ...day31(), paidBreakSec: 5400, paidSec: 32000 }).paidSec).toBe(32000);
    expect(daySummaryOf({ ...day31(), paidBreakSec: 5400 } as PersonDaySummary).paidSec).toBe(
      27000 + 5400,
    );
  });

  it("keeps what a 4.0 server sends", () => {
    const d = daySummaryOf({
      ...day31(),
      targetSec: 25800,
      paidBreakSec: 5400,
      unpaidBreakSec: 300,
      awayApprovedSec: 1200,
      awayPendingSec: 60,
      unverifiedSec: 1500,
      label: "Diwali",
    });
    expect(d).toMatchObject({
      targetSec: 25800,
      paidBreakSec: 5400,
      unverifiedSec: 1500,
      label: "Diwali",
    });
  });

  it("reads activity figures redacted to null (no activity grant) as zero", () => {
    const d = daySummaryOf({
      ...day31(),
      activeMin: null,
      quietHours: null,
    } as unknown as PersonDaySummary);
    expect(d.activeMin).toBe(0);
    expect(d.quietHours).toBe(0);
  });

  it("names offline time without activity data only when there is some to show", () => {
    expect(unverifiedNote(1500)).toBe("25m offline, no activity data");
    // Under half a minute would read "0m": not shown.
    expect(unverifiedNote(29)).toBeNull();
    expect(unverifiedNote(30)).toBe("1m offline, no activity data");
    expect(unverifiedNote(0)).toBeNull();
    expect(unverifiedNote(undefined)).toBeNull();
  });
});

describe("report run summaries", () => {
  it("reads a summary without the activity figures (no activity grant)", () => {
    const summary = { people: 4, focusSec: 36000, paidSec: 39600, unverifiedSec: 0, pending: 0 };
    expect(runFigures(summary)).toEqual({
      people: 4,
      focusSec: 36000,
      paidSec: 39600,
      unverifiedSec: 0,
      quietHours: null,
      needsALook: null,
    });
    expect(runFiguresText({ summary })).toBe("Focus 10h 00m · paid time 11h 00m");
  });

  it("adds offline time when there is some, and leaves out what an older run lacks", () => {
    expect(
      runFiguresText({ summary: { focusSec: 3600, paidSec: 4200, unverifiedSec: 1500 } }),
    ).toBe("Focus 1h 00m · paid time 1h 10m · 25m offline, no activity data");
    expect(runFiguresText({ summary: { people: 3, focusSec: 3600, quietHours: 2 } })).toBe(
      "Focus 1h 00m",
    );
    expect(runFiguresText({ summary: {} })).toBe("");
    expect(runFigures(null).people).toBeNull();
  });
});
