import {
  APPROVAL_LABEL,
  CELL_STATUS,
  isQuickBreak,
  overrunLabel,
  recordLabel,
  timingLabel,
  timingTone,
  tookLabel,
  unscheduledHeading,
} from "./labels";

describe("quick breaks (4.0, GET /breaks/team unscheduled)", () => {
  const quick = { kind: "QUICK" as const, label: "Quick break", plannedMin: 10 };

  it("names a quick break with its planned length", () => {
    expect(recordLabel(quick)).toBe("Quick break (10 min)");
    expect(recordLabel({ ...quick, plannedMin: null })).toBe("Quick break");
    expect(recordLabel({ kind: null, label: "Break (unscheduled)", plannedMin: null })).toBe(
      "Break (unscheduled)",
    );
    expect(recordLabel({ kind: "LUNCH", label: "Lunch" })).toBe("Lunch");
  });

  it("measures a quick break against its planned length", () => {
    const base = { tookSec: 12 * 60, durationMin: null, inProgress: false };
    expect(tookLabel({ ...base, ...quick })).toBe("Took 12 min of 10");
    expect(tookLabel({ ...base, kind: null })).toBe("Took 12 min");
    expect(tookLabel({ ...base, ...quick, inProgress: true })).toBe("12 min so far");
  });

  it("says how far a quick break ran past its planned length (the API sends overrunSec 0)", () => {
    const done = { ...quick, overrunSec: 0, inProgress: false };
    expect(overrunLabel({ ...done, tookSec: 15 * 60 })).toBe("5 min over");
    expect(overrunLabel({ ...done, tookSec: 10 * 60 + 20 })).toBeNull();
    expect(overrunLabel({ ...done, tookSec: 9 * 60 })).toBeNull();
    // Still running: not over yet, whatever the clock says.
    expect(overrunLabel({ ...done, tookSec: 15 * 60, inProgress: true })).toBeNull();
    // A shift's break keeps the server's figure.
    expect(overrunLabel({ kind: "LUNCH", overrunSec: 240, tookSec: 0 })).toBe("4 min over");
  });

  it("heads the list by what is in it", () => {
    expect(unscheduledHeading([{ kind: "QUICK" }, { kind: "QUICK" }])).toBe("Quick breaks");
    expect(unscheduledHeading([{ kind: "QUICK" }, { kind: null }])).toBe(
      "Quick and unscheduled breaks",
    );
    expect(unscheduledHeading([{ kind: null }])).toBe("Outside the schedule");
    expect(isQuickBreak({ kind: "MORNING" })).toBe(false);
  });
});

describe("timingLabel", () => {
  it.each([
    [{ timing: "ON_TIME", minutesOff: 0 }, "On time"],
    [{ timing: "EARLY", minutesOff: 18 }, "18 min early"],
    [{ timing: "LATE", minutesOff: 42 }, "42 min late"],
    [{ timing: "LATE", minutesOff: 0 }, "1 min late"],
    [{ timing: "OUTSIDE_WINDOW", minutesOff: 95 }, "Outside window"],
    [{ timing: "UNSCHEDULED", minutesOff: 0 }, "Unscheduled"],
  ] as const)("%p", (record, text) => {
    expect(timingLabel(record)).toBe(text);
  });

  it("colours early and late as warnings, outside the window as a problem", () => {
    expect(timingTone("ON_TIME")).toBe("success");
    expect(timingTone("EARLY")).toBe("warning");
    expect(timingTone("LATE")).toBe("warning");
    expect(timingTone("OUTSIDE_WINDOW")).toBe("danger");
    expect(timingTone("UNSCHEDULED")).toBe("neutral");
  });
});

describe("took and overrun", () => {
  it("compares with the break's length", () => {
    expect(tookLabel({ tookSec: 19 * 60, durationMin: 15, inProgress: false })).toBe(
      "Took 19 min of 15",
    );
    expect(tookLabel({ tookSec: 8 * 60, durationMin: null, inProgress: false })).toBe("Took 8 min");
    expect(tookLabel({ tookSec: 12 * 60, durationMin: 15, inProgress: true })).toBe(
      "12 min so far",
    );
  });

  it("only mentions an overrun when there is one", () => {
    expect(overrunLabel({ overrunSec: 0 })).toBeNull();
    expect(overrunLabel({ overrunSec: 4 * 60 })).toBe("4 min over");
    expect(overrunLabel({ overrunSec: 20 })).toBe("under 1 min over");
  });

  it("keeps the time taken and the overrun consistent, to the nearest minute", () => {
    // 2 min 20 s on a 2 min break: "Took 2 min of 2", "under 1 min over".
    expect(tookLabel({ tookSec: 140, durationMin: 2, inProgress: false })).toBe("Took 2 min of 2");
    expect(overrunLabel({ overrunSec: 20 })).toBe("under 1 min over");
    // 2 min 30 s on 2: "Took 3 min of 2", "1 min over".
    expect(tookLabel({ tookSec: 150, durationMin: 2, inProgress: false })).toBe("Took 3 min of 2");
    expect(overrunLabel({ overrunSec: 30 })).toBe("1 min over");
    // 29 min 50 s on 15 (a 14m 50s overrun): "Took 30 min of 15", "15 min over",
    // as the API's "+15 min if approved" beside it.
    expect(tookLabel({ tookSec: 29 * 60 + 50, durationMin: 15, inProgress: false })).toBe(
      "Took 30 min of 15",
    );
    expect(overrunLabel({ overrunSec: 890 })).toBe("15 min over");
  });
});

describe("status words", () => {
  it("shows a missed break as Not taken, in neutral grey: Skipped is a 3.1 skip record", () => {
    expect(CELL_STATUS.MISSED).toEqual({ label: "Not taken", tone: "neutral" });
    expect(CELL_STATUS.SKIPPED.label).toBe("Skipped");
    expect(CELL_STATUS.IN_PROGRESS.label).toBe("In progress");
  });

  it("names the approval states", () => {
    expect(APPROVAL_LABEL.PENDING).toBe("Pending");
    expect(APPROVAL_LABEL.REJECTED).toBe("Rejected");
  });
});
