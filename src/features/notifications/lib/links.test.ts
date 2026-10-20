import { notificationHref } from "./links";

describe("notificationHref", () => {
  it("opens Approvals for requests and the daily digest", () => {
    expect(notificationHref("BREAK_APPROVAL_REQUESTED")).toBe("/dashboard/approvals");
    expect(notificationHref("BREAK_APPROVALS_DIGEST")).toBe("/dashboard/approvals");
  });

  it("has nowhere to go for a decision on your own item (it is in the app's History)", () => {
    expect(notificationHref("BREAK_DECIDED")).toBeNull();
    expect(notificationHref("MEETING_DECIDED")).toBeNull();
    expect(notificationHref("AWAY_DECIDED")).toBeNull();
  });

  it("never links to a removed page", () => {
    for (const type of [
      "BREAK_APPROVAL_REQUESTED",
      "SKIP_REQUESTED",
      "DAY_AUTO_CLOSED",
      "MONTHLY_REPORT_READY",
      "AWAY_REQUESTED",
      "CALENDAR_CHANGED",
    ]) {
      const href = notificationHref(type) ?? "";
      expect(href).not.toMatch(/\/dashboard\/(me|team-today|admin|manager)\b/);
    }
  });

  it("has nowhere to go for other types", () => {
    expect(notificationHref("COMPANY_ASSIGNED")).toBeNull();
    expect(notificationHref("")).toBeNull();
  });
});
