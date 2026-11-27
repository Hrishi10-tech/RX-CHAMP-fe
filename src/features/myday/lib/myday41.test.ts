import { monthPace } from "@/features/myday/lib/pace";
import { lateReasonProblem, needsLateReason } from "@/features/myday/lib/lateReason";
import { dayMarks } from "@/features/myday/lib/calendarMarks";
import { notificationHref } from "@/features/notifications/lib/links";
import type { MonthTotals, PersonDaySummary } from "@/features/reports/types";

const H = 3600;

function day(date: string, over: Partial<PersonDaySummary> = {}): PersonDaySummary {
  return {
    date,
    workday: true,
    expectedSec: 8 * H,
    plannedSec: 8 * H,
    endedAt: "2026-11-02T13:00:00.000Z",
    ...over,
  } as PersonDaySummary;
}

function totals(over: Partial<MonthTotals>): MonthTotals {
  return { focusSec: 0, expectedSec: 0, ...over } as MonthTotals;
}

describe("4.1 Staff: the month's pace (as the phone app)", () => {
  const days = [
    day("2026-11-02"),
    day("2026-11-03"),
    day("2026-11-04", { endedAt: null }),
    day("2026-11-05", { endedAt: null }),
    day("2026-11-07", { workday: false, expectedSec: 0, plannedSec: 0, endedAt: null }),
  ];

  it("is on track when the days before today are covered, and counts the days left", () => {
    const pace = monthPace(
      { month: "2026-11", totals: totals({ focusSec: 16 * H, plannedSec: 32 * H }), days },
      "2026-11-04",
    );
    expect(pace).toMatchObject({
      target: 32 * H,
      targetText: "of 32h 00m target",
      track: "On track",
      trackTone: "success",
      // Today (not ended) and tomorrow; the weekly day off does not count.
      left: "16h 00m to go · 2 working days left",
      mark: 0.5,
    });
  });

  it("says how far behind, and a past month whether the target was met", () => {
    expect(
      monthPace(
        { month: "2026-11", totals: totals({ focusSec: 14 * H, plannedSec: 32 * H }), days },
        "2026-11-04",
      ),
    ).toMatchObject({ track: "Behind by 2h 00m", trackTone: "warning" });
    expect(
      monthPace(
        { month: "2026-10", totals: totals({ focusSec: 150 * H, plannedSec: 160 * H }), days: [] },
        "2026-11-04",
      ),
    ).toMatchObject({ track: "Short by 10h 00m", left: null, mark: null });
  });

  it("reads an older server's target so far, and says when there is none", () => {
    expect(
      monthPace(
        { month: "2026-11", totals: totals({ focusSec: 16 * H, expectedSec: 16 * H }), days },
        "2026-11-04",
      ),
    ).toMatchObject({ targetText: "of 16h 00m due so far", left: "Month's target reached" });
    expect(
      monthPace({ month: "2026-11", totals: totals({}), days: [] }, "2026-11-04"),
    ).toMatchObject({ target: 0, targetText: "No target this month", track: null });
  });
});

describe("4.1 Staff: the late-start reason", () => {
  it("is asked once the day has started, until one is given", () => {
    const late = { minutes: 20, needsReason: true, reason: null };
    expect(needsLateReason({ state: "OPEN", lateStart: late })).toBe(true);
    expect(needsLateReason({ state: "ENDED", lateStart: late })).toBe(true);
    expect(needsLateReason({ state: "NOT_STARTED", lateStart: late })).toBe(false);
    expect(needsLateReason({ state: "OPEN", lateStart: { ...late, reason: "Traffic" } })).toBe(
      false,
    );
    expect(needsLateReason({ state: "OPEN", lateStart: null })).toBe(false);
    expect(needsLateReason(null)).toBe(false);
  });

  it("needs the organisation's minimum, unless a preset answer was picked", () => {
    expect(lateReasonProblem("  ", 10)).toBe("Say why the day started late.");
    expect(lateReasonProblem("Traffic", 10)).toBe("Write at least 10 characters.");
    expect(lateReasonProblem("Traffic", 10, ["Traffic"])).toBeNull();
    expect(lateReasonProblem("Traffic on the bridge", 10)).toBeNull();
    expect(lateReasonProblem("x".repeat(2001), 10)).toBe("Keep it under 2000 characters.");
  });
});

describe("4.1 Staff: leave and work from home on the year", () => {
  it("marks waiting and approved days, leave over work from home, and the schedule's next days", () => {
    const marks = dayMarks(
      [
        {
          status: "APPROVED",
          categoryLabel: "CL/SL",
          dates: [{ date: "2026-11-10", label: "Full day", days: 1 }],
        },
        {
          status: "PENDING",
          categoryLabel: "EL/PL",
          dates: [{ date: "2026-11-12", label: "Half day (first half)", days: 0.5 }],
        },
        {
          status: "REJECTED",
          categoryLabel: "EL/PL",
          dates: [{ date: "2026-11-13", label: "Full day", days: 1 }],
        },
      ],
      [
        { status: "APPROVED", dates: [{ date: "2026-11-10", label: "Full day", days: 1 }] },
        { status: "PENDING", dates: [{ date: "2026-11-11", label: "Full day", days: 1 }] },
      ],
      [{ state: "ACTIVE", next: [{ date: "2026-11-16", label: "Mon 16 Nov" }] }],
    );
    expect(marks.get("2026-11-10")).toEqual({
      kind: "LEAVE",
      label: "CL/SL leave",
      pending: false,
    });
    expect(marks.get("2026-11-11")).toEqual({
      kind: "WFH",
      label: "Remote",
      pending: true,
    });
    expect(marks.get("2026-11-12")).toEqual({
      kind: "LEAVE",
      label: "EL/PL leave, half day (first half)",
      pending: true,
    });
    expect(marks.has("2026-11-13")).toBe(false);
    expect(marks.get("2026-11-16")).toMatchObject({ kind: "WFH", pending: false });
  });
});

describe("4.1 Staff: where a notice opens", () => {
  it("opens their own pages, and never a page Staff cannot open", () => {
    expect(notificationHref("BIOMETRIC_NO_CHECKOUT", "USER")).toBe("/dashboard/today");
    expect(notificationHref("DAY_AUTO_CLOSED", "USER")).toBe("/dashboard/today");
    expect(notificationHref("BREAK_DECIDED", "USER")).toBe("/dashboard/today");
    expect(notificationHref("CALENDAR_CHANGED", "USER")).toBe("/dashboard/my-calendar");
    expect(notificationHref("CHAT_MESSAGE", "USER")).toBe("/dashboard/chat");
    expect(notificationHref("MONTHLY_REPORT_READY", "USER")).toBeNull();
    expect(notificationHref("SKIP_REQUESTED", "USER")).toBeNull();
  });

  it("leaves everyone else's links as they were", () => {
    expect(notificationHref("DAY_AUTO_CLOSED", "MANAGER")).toBe("/dashboard/team");
    expect(notificationHref("BIOMETRIC_NO_CHECKOUT", "ADMIN")).toBeNull();
    expect(notificationHref("CALENDAR_CHANGED")).toBe("/dashboard/calendar");
  });
});
