import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getApprovals } from "@/features/approvals/api/approvals";
import { approvalKeys } from "@/features/approvals/api/keys";
import { useApprovalsList } from "@/features/approvals/hooks/useApprovals";
import {
  APPROVALS_REFRESH_GAP_MS,
  APPROVALS_REFRESH_WAIT_MS,
} from "@/features/approvals/lib/notificationEffects";
import { getCompOffClaims } from "@/features/leave/api/compoff";
import { getLeaveRequests } from "@/features/leave/api/leave";
import { leaveKeys } from "@/features/leave/api/keys";
import { useCompOffClaims, useLeaveRequests } from "@/features/leave/hooks/useLeave";
import { teamTodayKeys } from "@/features/teamToday/api/keys";
import { getWfhRequests } from "@/features/wfh/api/wfh";
import { wfhKeys } from "@/features/wfh/api/keys";
import { useWfhRequests } from "@/features/wfh/hooks/useWfh";

import { useNotifications } from "./useNotifications";

type Handler = (payload?: unknown) => void;

/** The /notifications socket, driven by hand. */
const handlers = new Map<string, Handler>();
const managerHandlers = new Map<string, Handler>();
const socket = {
  on(event: string, handler: Handler): void {
    handlers.set(event, handler);
  },
  off: jest.fn(() => handlers.clear()),
  connect: jest.fn(),
  disconnect: jest.fn(),
  io: {
    on(event: string, handler: Handler): void {
      managerHandlers.set(event, handler);
    },
    off: jest.fn(),
  },
};

jest.mock("@/features/notifications/socket", () => ({
  createNotificationsSocket: () => socket,
}));
jest.mock("@/lib/socket/reauth", () => ({ attachSocketReauth: jest.fn() }));
jest.mock("@/features/notifications/api/getNotifications", () => ({
  getNotifications: jest.fn(async () => ({ notifications: [], meta: { unread: 0 } })),
}));
jest.mock("@/features/notifications/api/getUnreadCount", () => ({
  getUnreadCount: jest.fn(async () => 0),
}));
jest.mock("@/features/notifications/api/markNotificationRead", () => ({
  markNotificationRead: jest.fn(async () => undefined),
  markAllNotificationsRead: jest.fn(async () => undefined),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: jest.fn() }));
jest.mock("@/features/approvals/api/approvals", () => ({
  ...jest.requireActual("@/features/approvals/api/approvals"),
  getApprovals: jest.fn(async () => ({ items: [], meta: { total: 0, page: 1, totalPages: 1 } })),
}));
jest.mock("@/features/leave/api/leave", () => ({
  ...jest.requireActual("@/features/leave/api/leave"),
  getLeaveRequests: jest.fn(async () => ({ items: [], summary: { pending: 0, needsMe: 0 } })),
}));
jest.mock("@/features/leave/api/compoff", () => ({
  ...jest.requireActual("@/features/leave/api/compoff"),
  getCompOffClaims: jest.fn(async () => ({ items: [], summary: { pending: 0, needsMe: 0 } })),
}));
jest.mock("@/features/wfh/api/wfh", () => ({
  ...jest.requireActual("@/features/wfh/api/wfh"),
  getWfhRequests: jest.fn(async () => ({ items: [], summary: { pending: 0, needsMe: 0 } })),
}));

const LISTS = {
  approvals: getApprovals as jest.Mock,
  leave: getLeaveRequests as jest.Mock,
  compOff: getCompOffClaims as jest.Mock,
  wfh: getWfhRequests as jest.Mock,
};

/**
 * The real list of each kind on screen, through its real hook and query key, with its API
 * function mocked: what re-reads is what would really re-read.
 */
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidated = jest.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () => {
      useApprovalsList({ status: "PENDING" }, false);
      useLeaveRequests({ status: "PENDING", needsMe: true });
      useCompOffClaims({ status: "PENDING", needsMe: true });
      useWfhRequests({ status: "PENDING", needsMe: true });
      return useNotifications(true);
    },
    { wrapper },
  );
  const keys = () => invalidated.mock.calls.map(([f]) => JSON.stringify(f?.queryKey));
  return { client, invalidated, keys, ...view };
}

const key = (k: readonly unknown[]) => JSON.stringify(k);

describe("useNotifications: approvals:changed (3.6)", () => {
  beforeEach(() => {
    handlers.clear();
    managerHandlers.clear();
    jest.clearAllMocks();
  });

  async function settled(view: ReturnType<typeof setup>) {
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    await waitFor(() => {
      for (const read of Object.values(LISTS)) expect(read).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => expect(view.client.isFetching()).toBe(0));
  }

  it("re-reads the approvals lists when a break is decided on the phone", async () => {
    const view = setup();
    await settled(view);
    expect(socket.connect).toHaveBeenCalled();
    jest.useFakeTimers();
    try {
      act(() => handlers.get("approvals:changed")!({ what: "BREAK", id: "b1" }));
      expect(view.keys()).not.toContain(key(approvalKeys.all));
      act(() => {
        jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
      });
    } finally {
      jest.useRealTimers();
    }
    expect(view.keys()).toContain(key(approvalKeys.all));
  });

  it.each([
    ["LEAVE", leaveKeys.all],
    ["COMPOFF", leaveKeys.all],
    ["WFH", wfhKeys.all],
    ["MEETING", approvalKeys.all],
    ["AWAY", approvalKeys.all],
    ["LEAVE", ["team"]],
    ["WFH", ["overview"]],
  ])("invalidates the tree that holds %s", async (what, list) => {
    const view = setup();
    await settled(view);
    jest.useFakeTimers();
    try {
      act(() => handlers.get("approvals:changed")!({ what, id: "x" }));
      act(() => {
        jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
      });
    } finally {
      jest.useRealTimers();
    }
    expect(view.keys()).toContain(key(list));
  });

  describe("the list on screen is read again", () => {
    it.each([
      ["BREAK", ["approvals"]],
      ["MEETING", ["approvals"]],
      ["AWAY", ["approvals"]],
      ["LEAVE", ["leave", "compOff"]],
      ["COMPOFF", ["leave", "compOff"]],
      ["WFH", ["wfh"]],
    ] as const)("%s, from the phone: %j", async (what, reread) => {
      const view = setup();
      await settled(view);
      act(() => handlers.get("approvals:changed")!({ what, id: "x" }));
      await waitFor(() => {
        for (const name of reread) expect(LISTS[name]).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => expect(view.client.isFetching()).toBe(0));
      // And nothing that shows another kind.
      for (const [name, read] of Object.entries(LISTS)) {
        expect(read).toHaveBeenCalledTimes((reread as readonly string[]).includes(name) ? 2 : 1);
      }
    });

    it("every kind, when the socket comes back", async () => {
      const view = setup();
      await settled(view);
      act(() => managerHandlers.get("reconnect")!());
      await waitFor(() => {
        for (const read of Object.values(LISTS)) expect(read).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("a stream of changes", () => {
    function atFake(view: ReturnType<typeof setup>) {
      jest.useFakeTimers();
      return async (ms: number) => {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(ms);
        });
        return view.keys().filter((k) => k === key(approvalKeys.all)).length;
      };
    }

    afterEach(() => jest.useRealTimers());

    it("is read at most once per gap, and the last change is never lost", async () => {
      const view = setup();
      await settled(view);
      const after = atFake(view);
      act(() => handlers.get("approvals:changed")!({ what: "BREAK", id: "b1" }));
      expect(await after(APPROVALS_REFRESH_WAIT_MS)).toBe(1);
      act(() => handlers.get("approvals:changed")!({ what: "BREAK", id: "b2" }));
      expect(await after(APPROVALS_REFRESH_WAIT_MS)).toBe(1);
      act(() => handlers.get("approvals:changed")!({ what: "BREAK", id: "b3" }));
      expect(await after(APPROVALS_REFRESH_GAP_MS)).toBe(2);
    });

    it("a notice and the event that comes with it are one refresh", async () => {
      const view = setup();
      await settled(view);
      const after = atFake(view);
      act(() => {
        handlers.get("notification")!({
          id: "n1",
          type: "SKIP_REQUESTED",
          title: "A skip",
          read: false,
        });
        handlers.get("approvals:changed")!({ what: "BREAK", id: "b1", action: "CREATED" });
      });
      expect(await after(APPROVALS_REFRESH_WAIT_MS)).toBe(1);
      expect(await after(APPROVALS_REFRESH_GAP_MS)).toBe(1);
    });
  });

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
  ])("%s re-reads approvals and Team today, with no event needed", async (type) => {
    const view = setup();
    await settled(view);
    act(() => handlers.get("notification")!({ id: "n1", type, title: "Something", read: false }));
    await waitFor(() => expect(LISTS.approvals).toHaveBeenCalledTimes(2));
    expect(view.keys()).toContain(key(teamTodayKeys.all));
  });

  it("a bulk approve refreshes once", async () => {
    const view = setup();
    await settled(view);
    jest.useFakeTimers();
    try {
      act(() => {
        for (let i = 0; i < 20; i++) {
          handlers.get("approvals:changed")!({ what: "BREAK", id: `b${i}` });
        }
        jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS);
      });
    } finally {
      jest.useRealTimers();
    }
    expect(view.keys().filter((k) => k === key(approvalKeys.all))).toHaveLength(1);
  });

  it("catches up on every kind after the socket was down", async () => {
    const view = setup();
    await settled(view);
    act(() => managerHandlers.get("reconnect")!());
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    for (const list of [approvalKeys.all, leaveKeys.all, wfhKeys.all]) {
      expect(view.keys()).toContain(key(list));
    }
  });

  it("stops listening when the page goes away", async () => {
    const view = setup();
    await settled(view);
    const handler = handlers.get("approvals:changed")!;
    jest.useFakeTimers();
    try {
      view.unmount();
      handler({ what: "BREAK", id: "b1" });
      jest.advanceTimersByTime(APPROVALS_REFRESH_WAIT_MS * 2);
    } finally {
      jest.useRealTimers();
    }
    expect(socket.disconnect).toHaveBeenCalled();
    expect(view.keys()).not.toContain(key(approvalKeys.all));
  });

  it("opens no socket while signed out", () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    renderHook(() => useNotifications(false), { wrapper });
    expect(socket.connect).not.toHaveBeenCalled();
  });
});
