import type { QueryClient } from "@tanstack/react-query";

import {
  APPROVAL_KINDS,
  APPROVALS_REFRESH_GAP_MS,
  APPROVALS_REFRESH_WAIT_MS,
  createApprovalsRefresher,
  isApproverNotice,
  refreshFor31Notification,
  refreshForApprovalChange,
} from "./notificationEffects";

function fakeClient() {
  const calls: unknown[][] = [];
  const filters: { queryKey: unknown[]; refetchType?: string }[] = [];
  const client = {
    invalidateQueries: (f: { queryKey: unknown[]; refetchType?: string }) => {
      calls.push(f.queryKey);
      filters.push(f);
      return Promise.resolve();
    },
  } as unknown as QueryClient;
  return { client, calls, filters };
}

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, "hidden", { configurable: true, value: hidden });
}

describe("refreshFor31Notification", () => {
  // These re-read through the refresher, with the event that comes with them: see
  // useNotifications.test.tsx, which checks each of them re-reads approvals and Team today.
  it.each([
    "BREAK_APPROVAL_REQUESTED",
    "BREAK_APPROVALS_DIGEST",
    "SKIP_REQUESTED",
    "AUTO_SKIP_REQUESTED",
    "SKIP_COMMENT_ADDED",
    "MEETING_REQUESTED",
    "APPROVALS_DUE_SOON",
    "APPROVALS_OVERDUE",
    "APPROVALS_ESCALATED",
  ])("%s is an approver's notice, left to the refresher", (type) => {
    expect(isApproverNotice(type)).toBe(true);
    const { client, calls } = fakeClient();
    refreshFor31Notification(client, type);
    expect(calls).toEqual([]);
  });

  it.each(["MEETING_DECIDED", "BREAK_DECIDED", "CHAT_MESSAGE", "DAY_AUTO_CLOSED"])(
    "%s is not an approver's notice",
    (type) => {
      expect(isApproverNotice(type)).toBe(false);
    },
  );

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

/** 4.0 adds the Team page and the Overview to what a decision moves. */
const MOVES = [["team-today"], ["workday"], ["reports"], ["team"], ["overview"]];

describe("refreshForApprovalChange (3.6)", () => {
  it.each(["BREAK", "MEETING", "AWAY"])("%s re-reads approvals and the break views", (kind) => {
    const { client, calls } = fakeClient();
    refreshForApprovalChange(client, [kind]);
    expect(calls).toEqual([["approvals"], ["breaks"], ...MOVES]);
  });

  it.each(["LEAVE", "COMPOFF"])("%s re-reads leave, which holds comp off too", (kind) => {
    const { client, calls } = fakeClient();
    refreshForApprovalChange(client, [kind]);
    expect(calls).toEqual([["leave"], ...MOVES]);
  });

  it("WFH re-reads work from home", () => {
    const { client, calls } = fakeClient();
    refreshForApprovalChange(client, ["WFH"]);
    expect(calls).toEqual([["wfh"], ...MOVES]);
  });

  it("every kind at once re-reads each list once", () => {
    const { client, calls } = fakeClient();
    refreshForApprovalChange(client, APPROVAL_KINDS);
    expect(calls).toEqual([["approvals"], ["breaks"], ["leave"], ["wfh"], ...MOVES]);
  });

  it("a kind the portal does not know yet still refreshes what decisions move", () => {
    const { client, calls } = fakeClient();
    refreshForApprovalChange(client, ["EXPENSE"]);
    expect(calls).toEqual(MOVES);
  });

  it("nothing changed, nothing re-read", () => {
    const { client, calls } = fakeClient();
    refreshForApprovalChange(client, []);
    expect(calls).toEqual([]);
  });

  describe("in a tab nobody is looking at", () => {
    afterEach(() => setHidden(false));

    it("only marks everything out of date, so it re-reads on focus and costs nothing now", () => {
      setHidden(true);
      const { client, filters } = fakeClient();
      refreshForApprovalChange(client, APPROVAL_KINDS);
      expect(filters.length).toBeGreaterThan(0);
      expect(filters.every((f) => f.refetchType === "none")).toBe(true);
    });

    it("a tab in view re-reads at once", () => {
      setHidden(false);
      const { client, filters } = fakeClient();
      refreshForApprovalChange(client, APPROVAL_KINDS);
      expect(filters.every((f) => f.refetchType === "active")).toBe(true);
    });
  });
});

describe("createApprovalsRefresher (3.6)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("gathers a burst of changes into one refresh", () => {
    const { client, calls } = fakeClient();
    const refresher = createApprovalsRefresher(() => client);
    for (let i = 0; i < 50; i++) refresher.add("BREAK");
    refresher.add("LEAVE");
    expect(calls).toEqual([]);
    jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
    expect(calls).toEqual([["approvals"], ["breaks"], ["leave"], ...MOVES]);
  });

  it("refreshes again for a change after that, once the gap has passed, losing nothing", () => {
    const { client, calls } = fakeClient();
    const refresher = createApprovalsRefresher(() => client);
    refresher.add("WFH");
    jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
    calls.length = 0;
    refresher.add("BREAK");
    jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
    expect(calls).toEqual([]);
    refresher.add("LEAVE");
    jest.advanceTimersByTime(APPROVALS_REFRESH_GAP_MS - APPROVALS_REFRESH_WAIT_MS);
    expect(calls).toEqual([["approvals"], ["breaks"], ["leave"], ...MOVES]);
  });

  it("after a quiet spell the first change is quick again", () => {
    const { client, calls } = fakeClient();
    const refresher = createApprovalsRefresher(() => client);
    refresher.add("WFH");
    jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
    jest.advanceTimersByTime(APPROVALS_REFRESH_GAP_MS * 2);
    calls.length = 0;
    refresher.add("BREAK");
    jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
    expect(calls).toEqual([["approvals"], ["breaks"], ...MOVES]);
  });

  it("a steady stream re-reads well under what the API allows", () => {
    const { client, calls } = fakeClient();
    let refreshes = 0;
    const counting = {
      invalidateQueries: (f: { queryKey: unknown[] }) => {
        if (JSON.stringify(f.queryKey) === '["approvals"]') refreshes += 1;
        return client.invalidateQueries(f as never);
      },
    } as unknown as QueryClient;
    const refresher = createApprovalsRefresher(() => counting);
    // One change every second for a minute, on the portal's busiest screen.
    for (let second = 0; second < 60; second++) {
      refresher.add("BREAK");
      jest.advanceTimersByTime(1000);
    }
    expect(calls.length).toBeGreaterThan(0);
    expect(refreshes).toBeLessThanOrEqual(13);
    // Four reads of the summary per refresh, against a limit of 120 a minute.
    expect(refreshes * 4).toBeLessThan(120);
  });

  it("does nothing once cancelled", () => {
    const { client, calls } = fakeClient();
    const refresher = createApprovalsRefresher(() => client);
    refresher.add("BREAK");
    refresher.cancel();
    jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS * 2);
    expect(calls).toEqual([]);
  });
});
