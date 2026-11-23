import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { avatarKeys, getAvatarManifest } from "@/features/avatars/api/avatars";
import { PEOPLE_LIST_KEYS, clearLiveAvatars } from "@/features/avatars/lib/liveAvatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";
import { createNotificationsSocket } from "@/features/notifications/socket";

import { useNotifications } from "./useNotifications";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("sonner", () => ({ toast: jest.fn() }));
jest.mock("@/store/hooks", () => ({
  useAppSelector: (select: (s: unknown) => unknown) => select({ auth: { user: { id: "me" } } }),
}));
jest.mock("@/features/notifications/api/getNotifications", () => ({
  getNotifications: jest.fn().mockResolvedValue({ notifications: [], meta: { unread: 0 } }),
}));
jest.mock("@/features/notifications/api/getUnreadCount", () => ({
  getUnreadCount: jest.fn().mockResolvedValue(0),
}));
jest.mock("@/features/notifications/api/markNotificationRead", () => ({
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));
jest.mock("@/features/notifications/socket", () => ({ createNotificationsSocket: jest.fn() }));
jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn(),
}));

type Listener = (...args: unknown[]) => void;

function fakeSocket() {
  const on = new Map<string, Listener[]>();
  const manager = new Map<string, Listener[]>();
  const add = (map: Map<string, Listener[]>, event: string, listener: Listener) =>
    map.set(event, [...(map.get(event) ?? []), listener]);
  return {
    on: (event: string, listener: Listener) => add(on, event, listener),
    off: () => undefined,
    connect: jest.fn(),
    disconnect: jest.fn(),
    io: {
      on: (event: string, listener: Listener) => add(manager, event, listener),
      off: () => undefined,
    },
    emit: (event: string, ...args: unknown[]) => on.get(event)?.forEach((l) => l(...args)),
    reconnects: () => manager.get("reconnect")?.forEach((l) => l()),
  };
}

function Layout({ children }: { children: ReactNode }) {
  useNotifications(true);
  return <>{children}</>;
}

// The real listener, the real store, a real PersonAvatar: the portal's half of "a change on
// any platform shows on the other two within seconds".
describe("avatar:changed on the notifications socket", () => {
  let socket: ReturnType<typeof fakeSocket>;
  let client: QueryClient;
  let invalidate: jest.SpyInstance;
  let realNow: () => number;
  let elapsed = 0;

  beforeEach(() => {
    clearLiveAvatars();
    socket = fakeSocket();
    (createNotificationsSocket as jest.Mock).mockReturnValue(socket);
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidate = jest.spyOn(client, "invalidateQueries");
    // Each test starts past the store's cooldown from the one before.
    elapsed += 60_000;
    realNow = Date.now;
    const start = realNow();
    jest.spyOn(Date, "now").mockImplementation(() => start + elapsed);
  });

  afterEach(() => jest.restoreAllMocks());

  async function mount(userId: string) {
    const view = render(
      <QueryClientProvider client={client}>
        <Layout>
          <PersonAvatar name="Arjun Mehta" avatarId="M12" userId={userId} />
        </Layout>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(view.container.querySelector("img")).not.toBeNull());
    return () => view.container.querySelector("img")?.getAttribute("src");
  }

  it("updates a person on screen at once", async () => {
    const src = await mount("u-1");
    expect(src()).toContain("/M12.webp");
    act(() => socket.emit("avatar:changed", { userId: "u-1", avatarId: "M40" }));
    expect(src()).toContain("/M40.webp");
  });

  it("leaves everyone else as they are", async () => {
    const src = await mount("u-1");
    act(() => socket.emit("avatar:changed", { userId: "u-2", avatarId: "M40" }));
    expect(src()).toContain("/M12.webp");
  });

  it("re-reads your own record when the change is yours", async () => {
    await mount("me");
    invalidate.mockClear();
    act(() => socket.emit("avatar:changed", { userId: "me", avatarId: "M40" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: avatarKeys.mine() });
  });

  it("does not re-read it for a colleague's", async () => {
    await mount("u-1");
    invalidate.mockClear();
    act(() => socket.emit("avatar:changed", { userId: "u-1", avatarId: "M40" }));
    expect(invalidate).not.toHaveBeenCalled();
  });

  /** How many calls re-read this query: the key itself, or a tree that holds it. */
  function rereads(queryKey: readonly unknown[]): number {
    return invalidate.mock.calls.filter(([f]) =>
      (f?.queryKey as unknown[] | undefined)?.every((part, i) => queryKey[i] === part),
    ).length;
  }

  describe("a reconnect", () => {
    it("drops what was pushed and re-reads the lists that show people", async () => {
      const src = await mount("u-1");
      act(() => socket.emit("avatar:changed", { userId: "u-1", avatarId: "M40" }));
      invalidate.mockClear();
      act(() => socket.reconnects());
      expect(src()).toContain("/M12.webp");
      expect(invalidate).toHaveBeenCalledWith({ queryKey: avatarKeys.mine() });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
      expect(rereads(["reports", "people"])).toBe(1);
    });

    it("4.0: re-reads every screen of its own that shows people too", async () => {
      await mount("u-1");
      invalidate.mockClear();
      act(() => socket.reconnects());
      for (const queryKey of PEOPLE_LIST_KEYS) {
        // Once each: by itself, or within a tree the approvals catch-up re-reads.
        expect(rereads(queryKey)).toBe(1);
      }
      for (const root of ["team", "departments", "organisations", "signout-keys", "leave", "wfh"]) {
        expect(PEOPLE_LIST_KEYS).toContainEqual([root]);
      }
    });

    it("a flapping socket does not re-read them over and over", async () => {
      const src = await mount("u-1");
      act(() => socket.reconnects());
      act(() => socket.emit("avatar:changed", { userId: "u-1", avatarId: "M40" }));
      invalidate.mockClear();
      act(() => socket.reconnects());
      expect(invalidate).toHaveBeenCalledWith({ queryKey: avatarKeys.mine() });
      expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["users"] });
      expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["reports", "people"] });
      expect(src()).toContain("/M40.webp");
    });
  });
});
