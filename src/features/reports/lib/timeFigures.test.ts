import {
  PAYROLL_PAUSED_LABEL,
  dayFigures,
  figureText,
  idleOfInput,
  monthFigures,
  monthIdleSec,
  pausedDaysText,
  workingSec,
} from "./timeFigures";
import { meetingsCountNote, statusMeetingLine } from "./dayNotes";
import type { MonthTotals } from "@/features/reports/types";

const H = 3600;

describe("time figures (3.6)", () => {
  it("the label reads exactly as the brief says", () => {
    expect(PAYROLL_PAUSED_LABEL).toBe("Payroll paused · biometric integration pending");
  });

  it("working time keeps meetings in and breaks out", () => {
    expect(workingSec({ availableSec: 6 * H, meetingSec: 2 * H })).toBe(8 * H);
    // All of the day in a meeting: there is no time left over, and all of it is working time.
    expect(workingSec({ availableSec: 0, meetingSec: 2 * H })).toBe(2 * H);
  });

  it("a month locked before working time was kept has no figure, not its meetings alone", () => {
    expect(workingSec({ meetingSec: 2 * H })).toBeNull();
    expect(workingSec({})).toBeNull();
  });

  it("a day reads working, focus, idle, break, meeting, in that order", () => {
    const figures = dayFigures(
      { focusSec: 8 * H, breakSec: 45 * 60, meetingSec: H, availableSec: 7 * H },
      600,
    );
    expect(figures).toEqual([
      { label: "Working", sec: 8 * H },
      { label: "Focus", sec: 8 * H },
      { label: "Idle", sec: 600 },
      { label: "Break", sec: 45 * 60 },
      { label: "Meeting", sec: H },
    ]);
  });

  it("idle that could not be read says so, and never reads as zero", () => {
    const figures = dayFigures({ focusSec: 0, breakSec: 0, meetingSec: 0, availableSec: 0 }, null);
    expect(figures[2]).toEqual({ label: "Idle", sec: null });
    expect(figureText(null)).toBe("No data");
    expect(figureText(0)).toBe("0m");
    expect(figureText(3900)).toBe("1h 05m");
  });

  it("a month's idle is the server's sum of its days, with no sums of its own", () => {
    expect(monthIdleSec({ idleSec: H })).toBe(H);
    expect(monthIdleSec({ idleSec: 0 })).toBe(0);
    expect(monthIdleSec({ idleSec: null })).toBeNull();
    // Input typed in a meeting no longer cancels idle: only the server's figure is read.
    expect(monthIdleSec({ activeSec: 8 * H, availableSec: 7 * H, idleSec: H } as MonthTotals)).toBe(
      H,
    );
    expect(monthIdleSec({ activeSec: 6 * H, availableSec: 7 * H } as MonthTotals)).toBeNull();
    expect(monthIdleSec({})).toBeNull();
  });

  it("an older server's month with no meeting or break total reads them as zero", () => {
    const totals = { focusSec: 8 * H, availableSec: 7 * H, activeSec: 6 * H } as MonthTotals;
    const figures = monthFigures(totals);
    expect(figures.map((f) => f.sec)).toEqual([7 * H, 8 * H, null, 0, 0]);
  });

  it("a day's idle from its input: no agent reporting is no figure, not a clean zero", () => {
    const input = (activeSec: number, idleSec: number, noDataSec: number) => ({
      activeSec,
      idleSec,
      noDataSec,
      availableSec: activeSec + idleSec + noDataSec,
    });
    expect(idleOfInput(input(0, 0, 32400))).toBeNull();
    expect(idleOfInput(input(3600, 600, 0))).toBe(600);
    expect(idleOfInput(input(3600, 0, 600))).toBe(0);
    // All of it in meetings or on breaks: no time to read.
    expect(idleOfInput(input(0, 0, 0))).toBe(0);
    expect(idleOfInput(null)).toBeNull();
    expect(idleOfInput(undefined)).toBeNull();
  });

  it("counts days in words", () => {
    expect(pausedDaysText(1)).toBe("1 day");
    expect(pausedDaysText(12)).toBe("12 days");
  });
});

describe("meetingsCountNote (3.6)", () => {
  it("a day with none marked In a meeting reads as it always did", () => {
    expect(meetingsCountNote([{ kind: "DECLARED" }, {}])).toBe(
      "counted as focus time unless rejected",
    );
    expect(meetingsCountNote([])).toBe("counted as focus time unless rejected");
  });

  it("does not promise a rejection the server refuses", () => {
    expect(meetingsCountNote([{ kind: "STATUS" }, { kind: "STATUS" }])).toBe(
      "counted as focus time, no approval needed",
    );
    expect(meetingsCountNote([{ kind: "STATUS" }, { kind: "DECLARED" }])).toBe(
      "counted as focus time unless rejected; time marked In a meeting always counts",
    );
  });
});

describe("statusMeetingLine (3.6)", () => {
  it("says how a status meeting began and ended", () => {
    expect(statusMeetingLine({ kind: "STATUS", startSource: "BUTTON", endReason: null })).toBe(
      "Started with the button",
    );
    expect(
      statusMeetingLine({ kind: "STATUS", startSource: "SUGGESTION", endReason: "USER" }),
    ).toBe("Started from a suggestion, ended by them");
    expect(
      statusMeetingLine({ kind: "STATUS", startSource: "BUTTON", endReason: "NO_ANSWER" }),
    ).toBe("Started with the button, ended with no answer to the 2 hour check");
  });

  it("has nothing to say of any other meeting", () => {
    expect(statusMeetingLine({ kind: "DECLARED" })).toBeNull();
    expect(statusMeetingLine({})).toBeNull();
  });
});
