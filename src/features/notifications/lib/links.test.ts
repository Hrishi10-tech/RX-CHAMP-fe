import { notificationHref } from "./links";

describe("notificationHref", () => {
  it("opens Approvals for requests and the daily digest", () => {
    expect(notificationHref("BREAK_APPROVAL_REQUESTED")).toBe("/dashboard/approvals");
    expect(notificationHref("BREAK_APPROVALS_DIGEST")).toBe("/dashboard/approvals");
  });

  it("opens My breaks for a decision", () => {
    expect(notificationHref("BREAK_DECIDED")).toBe("/dashboard/me?tab=breaks");
  });

  it("has nowhere to go for other types", () => {
    expect(notificationHref("COMPANY_ASSIGNED")).toBeNull();
    expect(notificationHref("")).toBeNull();
  });
});
