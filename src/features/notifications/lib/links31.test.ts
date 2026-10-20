import { notificationHref } from "./links";

/** The 3.1 types under the 4.0 pages, plus the 4.0 away and calendar types. */
describe("notificationHref for 3.1 and 4.0 types", () => {
  it.each([
    "SKIP_REQUESTED",
    "AUTO_SKIP_REQUESTED",
    "SKIP_COMMENT_ADDED",
    "MEETING_REQUESTED",
    "APPROVALS_DUE_SOON",
    "APPROVALS_OVERDUE",
    "APPROVALS_ESCALATED",
    "AWAY_REQUESTED",
  ])("%s opens Approvals", (type) => {
    expect(notificationHref(type)).toBe("/dashboard/approvals");
  });

  it("opens Reports when the monthly report is ready", () => {
    expect(notificationHref("MONTHLY_REPORT_READY")).toBe("/dashboard/reports");
  });

  it("opens Team when a day was closed automatically (Team today is gone)", () => {
    expect(notificationHref("DAY_AUTO_CLOSED")).toBe("/dashboard/team");
  });

  it("opens the Calendar when it changed", () => {
    expect(notificationHref("CALENDAR_CHANGED")).toBe("/dashboard/calendar");
  });

  it("is case sensitive and has nowhere to go for unknown types", () => {
    expect(notificationHref("skip_requested")).toBeNull();
    expect(notificationHref("SOMETHING_NEW")).toBeNull();
  });
});
