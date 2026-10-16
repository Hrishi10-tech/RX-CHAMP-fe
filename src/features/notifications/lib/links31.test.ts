import { notificationHref } from "./links";

/** SPEC 3.10: approvals types to Approvals, report types to Reports, auto-close to Team today. */
describe("notificationHref for 3.1 types", () => {
  it.each([
    "SKIP_REQUESTED",
    "AUTO_SKIP_REQUESTED",
    "SKIP_COMMENT_ADDED",
    "MEETING_REQUESTED",
    "APPROVALS_DUE_SOON",
    "APPROVALS_OVERDUE",
    "APPROVALS_ESCALATED",
  ])("%s opens Approvals", (type) => {
    expect(notificationHref(type)).toBe("/dashboard/approvals");
  });

  it("opens Reports when the monthly report is ready", () => {
    expect(notificationHref("MONTHLY_REPORT_READY")).toBe("/dashboard/reports");
  });

  it("opens Team today when a day was closed automatically", () => {
    expect(notificationHref("DAY_AUTO_CLOSED")).toBe("/dashboard/team-today");
  });

  it("opens the person's own home for a decision on their meeting", () => {
    expect(notificationHref("MEETING_DECIDED")).toBe("/dashboard/me");
  });

  it("sends the 3.0 types the API still uses to the 3.1 pages", () => {
    // SPEC 3.10: approvals types open /dashboard/approvals (the old page only redirects).
    expect(notificationHref("BREAK_APPROVAL_REQUESTED")).toBe("/dashboard/approvals");
    expect(notificationHref("BREAK_APPROVALS_DIGEST")).toBe("/dashboard/approvals");
    expect(notificationHref("BREAK_DECIDED")).toBe("/dashboard/me?tab=breaks");
  });

  it("is case sensitive and has nowhere to go for unknown types", () => {
    expect(notificationHref("skip_requested")).toBeNull();
    expect(notificationHref("SOMETHING_NEW")).toBeNull();
  });
});
