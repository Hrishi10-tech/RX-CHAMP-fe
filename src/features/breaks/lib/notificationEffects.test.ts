import type { QueryClient } from "@tanstack/react-query";

import { refreshForNotification } from "./notificationEffects";

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

describe("refreshForNotification", () => {
  it.each(["BREAK_APPROVAL_REQUESTED", "BREAK_APPROVALS_DIGEST"])(
    "%s refreshes the approvals badge, list and team day",
    (type) => {
      const { client, calls } = fakeClient();
      refreshForNotification(client, type);
      expect(calls).toEqual([
        ["breaks", "approvals"],
        ["breaks", "team"],
      ]);
    },
  );

  it("a decision refreshes the person's own breaks", () => {
    const { client, calls } = fakeClient();
    refreshForNotification(client, "BREAK_DECIDED");
    expect(calls).toEqual([["breaks", "me"]]);
  });

  it("leaves everything else alone", () => {
    const { client, calls } = fakeClient();
    refreshForNotification(client, "CHAT_MESSAGE");
    expect(calls).toEqual([]);
  });
});
