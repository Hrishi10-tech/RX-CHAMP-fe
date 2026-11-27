import {
  attendanceAccess,
  csvParts,
  dayTime,
  localPunchText,
  localPunchTime,
  sinceText,
} from "@/features/attendance/lib/format";
import { compOffEarnedText, wfhText } from "@/features/reports/lib/dayNotes";
import { CATEGORY_TEXT } from "@/features/leave/lib/format";

describe("3.5 attendance: CSV parts and times", () => {
  it("splits a long CSV into parts that each keep the header", () => {
    const lines = [
      "code,time",
      ...Array.from({ length: 4500 }, (_, i) => `${i},2026-11-04 09:00`),
    ].join("\n");
    const parts = csvParts(lines);
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => p.startsWith("code,time\n"))).toBe(true);
    expect(parts[0].split("\n")).toHaveLength(2001);
    expect(parts[2].split("\n")).toHaveLength(501);
  });

  it("a file with only a header, or nothing, gives no parts to send", () => {
    expect(csvParts("code,time\n")).toHaveLength(1);
    expect(csvParts("")).toHaveLength(0);
  });

  it("drops a byte order mark before the header", () => {
    expect(csvParts("﻿code,time\nE1,2026-11-04 09:00")[0].startsWith("code,time")).toBe(true);
  });

  it("a datetime-local value becomes the API's business time", () => {
    expect(localPunchTime("2026-11-04T18:05")).toBe("2026-11-04 18:05");
    expect(localPunchTime("2026-11-04T18:05:30")).toBe("2026-11-04 18:05");
  });

  it("says how long ago, or never", () => {
    const now = Date.parse("2026-11-04T10:00:00Z");
    expect(sinceText(null)).toBe("Never");
    expect(sinceText("2026-11-04T09:59:40Z", now)).toBe("Just now");
    expect(sinceText("2026-11-04T09:45:00Z", now)).toBe("15 min ago");
    expect(sinceText("2026-11-04T07:00:00Z", now)).toBe("3 hours ago");
  });
});

describe("4.0 attendance: the 12 hour clock", () => {
  it("shows a punch with its business day and a 12 hour time", () => {
    // 18:05 in Kolkata (UTC+5:30) is 12:35 UTC.
    expect(dayTime("2026-11-04T12:35:00Z")).toBe("4 Nov 6:05 PM");
    // 01:00 in Kolkata on the 5th is still the 4th in UTC: the business day wins.
    expect(dayTime("2026-11-04T19:30:00Z")).toBe("5 Nov 1:00 AM");
    expect(dayTime(null)).toBe("");
    expect(dayTime("not a time")).toBe("");
  });

  it("a day older than a day reads as a day and a 12 hour time", () => {
    const now = Date.parse("2026-11-06T10:00:00Z");
    expect(sinceText("2026-11-04T12:35:00Z", now)).toBe("4 Nov 6:05 PM");
  });

  it("reads a datetime-local value back on the 12 hour clock", () => {
    expect(localPunchText("2026-11-04T18:05")).toBe("4 Nov 6:05 PM");
    expect(localPunchText("2026-11-04T00:30")).toBe("4 Nov 12:30 AM");
    expect(localPunchText("")).toBe("");
  });
});

describe("4.0 attendance: who may do what", () => {
  it("the organisation's admin and a Super Admin in it change everything", () => {
    expect(attendanceAccess("ADMIN")).toEqual({ canEdit: true, canWrite: true });
    expect(attendanceAccess("SUPER_ADMIN")).toEqual({ canEdit: true, canWrite: true });
  });

  it("the Super Manager reads, and adds or voids punches", () => {
    expect(attendanceAccess("SUPER_MANAGER")).toEqual({ canEdit: false, canWrite: true });
  });

  it("nobody else gets a control", () => {
    expect(attendanceAccess("MANAGER")).toEqual({ canEdit: false, canWrite: false });
    expect(attendanceAccess("USER")).toEqual({ canEdit: false, canWrite: false });
    expect(attendanceAccess(null)).toEqual({ canEdit: false, canWrite: false });
  });
});

describe("3.5 reports: day notes", () => {
  it("names work from home and comp off earned", () => {
    expect(wfhText({ wfhDays: 1, wfhSec: 32400, wfhOverSec: 0 })).toBe("Remote, full day");
    expect(wfhText({ wfhDays: 0.5, wfhSec: 16200, wfhOverSec: 5400 })).toBe(
      "Remote, half day, 90 min over the cap not counted",
    );
    expect(wfhText({ wfhDays: 0 })).toBeNull();
    expect(compOffEarnedText({ compOffEarnedDays: 0.5 })).toBe("Comp off earned: 0.5 day");
    expect(compOffEarnedText({ compOffEarnedDays: 0 })).toBeNull();
  });

  it("comp off is a third leave type", () => {
    expect(CATEGORY_TEXT.COMPOFF.label).toBe("Comp off");
  });
});
