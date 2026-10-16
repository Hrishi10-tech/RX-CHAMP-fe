import type { QueryClient } from "@tanstack/react-query";

import { refreshFor31Notification } from "./notificationEffects";

function fakeClient() {
  const calls: unknown[][] = [];
  const client = {
    invalidateQueries: (filters: { queryKey: unknown[] }) => {
      calls.push(filters.queryKey);
      return Promise.resolve();
    },
  } as unknown as QueryClient;
  return { client, calls };
}

describe("refreshFor31Notification", () => {
  it.each([
    "SKIP_REQUESTED",
    "AUTO_SKIP_REQUESTED",
    "SKIP_COMMENT_ADDED",
    "MEETING_REQUESTED",
    "APPROVALS_DUE_SOON",
    "APPROVALS_OVERDUE",
    "APPROVALS_ESCALATED",
    "BREAK_APPROVAL_REQUESTED",
  ])("%s refreshes approvals and Team today", (type) => {
    const { client, calls } = fakeClient();
    refreshFor31Notification(client, type);
    expect(calls).toEqual([["approvals"], ["team-today"]]);
  });

  it.each(["MEETING_DECIDED", "BREAK_DECIDED"])("%s refreshes the person's own day", (type) => {
    const { client, calls } = fakeClient();
    refreshFor31Notification(client, type);
    expect(calls).toEqual([["workday"], ["approvals", "me"]]);
  });

  it("refreshes the monthly reports list when one is ready", () => {
    const { client, calls } = fakeClient();
    refreshFor31Notification(client, "MONTHLY_REPORT_READY");
    expect(calls).toEqual([["reports", "runs"]]);
  });

  it("refreshes the day and Team today after an auto-close", () => {
    const { client, calls } = fakeClient();
    refreshFor31Notification(client, "DAY_AUTO_CLOSED");
    expect(calls).toEqual([["workday"], ["team-today"]]);
  });

  it("leaves everything else alone", () => {
    const { client, calls } = fakeClient();
    refreshFor31Notification(client, "CHAT_MESSAGE");
    expect(calls).toEqual([]);
  });
});
