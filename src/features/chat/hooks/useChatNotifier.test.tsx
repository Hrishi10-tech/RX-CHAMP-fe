import * as React from "react";
import * as ReactRedux from "react-redux";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * The rules worth pinning down: a popup for a message you can't see, silence for
 * one you can, and one socket no matter how many holders — the messages page
 * takes the same connection, and a bare `off()` from either would mute the other.
 */

interface Harness {
  render: (enabled?: boolean) => { unmount: () => void };
  waitFor: (fn: () => void) => Promise<unknown>;
  setActiveConversation: (userId: string | null) => void;
  /** Fires a `chat:message` at every listener currently attached. */
  emit: (message: Record<string, unknown>) => void;
  toasts: { title: string; description?: string; onClick?: () => void }[];
  listenerCount: () => number;
  acquires: number;
  releases: number;
  contactCalls: number;
  setServerUnread: (n: number) => void;
  unreadCalls: number;
  unreadTotal: () => number;
  fireVisibility: (state: "visible" | "hidden") => void;
  fireConnect: () => void;
  pushed: string[];
}

/**
 * Fresh module registry per test, because the hook caches the contact directory
 * in module state.
 *
 * React is pinned back to the top-level copy: an isolated registry would hand the
 * hook its own React, and a hook holding one copy while the renderer drives
 * another finds no dispatcher and throws on the first `useEffect`. Importing the
 * renderer in here instead is not an option — it registers lifecycle hooks at
 * import time, which Jest refuses inside a test.
 *
 * react-redux is pinned for the same reason as React: a Provider from one copy
 * puts the store on a context the hook from another copy cannot read.
 */
async function loadHarness(opts: { unreadFails?: boolean } = {}): Promise<Harness> {
  let harness: Harness | undefined;

  await jest.isolateModulesAsync(async () => {
    jest.doMock("react", () => React);
    jest.doMock("react-redux", () => ReactRedux);

    const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
    const toasts: Harness["toasts"] = [];
    const pushed: string[] = [];
    const counts = { acquires: 0, releases: 0, contactCalls: 0, unreadCalls: 0 };
    const serverUnread = { value: 0 };

    const socket = {
      on: (event: string, fn: (...args: unknown[]) => void) => {
        handlers.set(event, [...(handlers.get(event) ?? []), fn]);
      },
      off: (event: string, fn: (...args: unknown[]) => void) => {
        handlers.set(
          event,
          (handlers.get(event) ?? []).filter((h) => h !== fn),
        );
      },
    };

    jest.doMock("@/features/chat/socket", () => ({
      acquireChatSocket: () => {
        counts.acquires += 1;
        return socket;
      },
      releaseChatSocket: () => {
        counts.releases += 1;
      },
    }));

    jest.doMock("@/features/chat/api/getChatUnread", () => ({
      getChatUnread: async () => {
        counts.unreadCalls += 1;
        if (opts.unreadFails) throw new Error("offline");
        return serverUnread.value;
      },
    }));

    jest.doMock("@/features/chat/api/getContacts", () => ({
      getContacts: async () => {
        counts.contactCalls += 1;
        return [{ userId: "u-ravi", name: "Ravi", email: "", role: "USER", department: null }];
      },
    }));

    jest.doMock("sonner", () => ({
      toast: (title: string, opts?: { description?: string; action?: { onClick: () => void } }) => {
        toasts.push({ title, description: opts?.description, onClick: opts?.action?.onClick });
      },
    }));

    jest.doMock("next/navigation", () => ({
      useRouter: () => ({ push: (href: string) => pushed.push(href) }),
    }));

    const { useChatNotifier } = await import("./useChatNotifier");
    const { setActiveConversation } = await import("@/features/chat/lib/activeConversation");
    const { makeStore } = await import("@/store");

    const store = makeStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ReactRedux.Provider store={store}>{children}</ReactRedux.Provider>
    );

    harness = {
      render: (enabled = true) => renderHook(() => useChatNotifier(enabled), { wrapper }),
      waitFor,
      setServerUnread: (n: number) => {
        serverUnread.value = n;
      },
      unreadTotal: () => store.getState().chat.unreadTotal,
      fireVisibility: (state: "visible" | "hidden") => {
        Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      },
      fireConnect: () => {
        for (const fn of handlers.get("connect") ?? []) fn();
      },
      setActiveConversation,
      emit: (message) => {
        for (const fn of handlers.get("chat:message") ?? []) fn(message);
      },
      toasts,
      listenerCount: () => (handlers.get("chat:message") ?? []).length,
      get acquires() {
        return counts.acquires;
      },
      get releases() {
        return counts.releases;
      },
      get contactCalls() {
        return counts.contactCalls;
      },
      get unreadCalls() {
        return counts.unreadCalls;
      },
      pushed,
    };
  });

  if (!harness) throw new Error("harness failed to load");
  return harness;
}

const incoming = (over: Record<string, unknown> = {}) => ({
  id: "m1",
  fromUserId: "u-ravi",
  toUserId: "me",
  body: "standup in 5",
  mine: false,
  read: false,
  createdAt: "2026-08-25T10:00:00.000Z",
  ...over,
});

describe("useChatNotifier", () => {
  it("raises a popup naming the sender", async () => {
    const h = await loadHarness();
    h.render();

    h.emit(incoming());

    await h.waitFor(() => expect(h.toasts).toHaveLength(1));
    expect(h.toasts[0].title).toBe("Ravi");
    expect(h.toasts[0].description).toBe("standup in 5");
  });

  it("stays quiet for the conversation already on screen", async () => {
    const h = await loadHarness();
    h.render();

    h.setActiveConversation("u-ravi");
    h.emit(incoming());

    // Nothing will arrive, so give a name lookup every chance to resolve first.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.toasts).toHaveLength(0);
  });

  it("still speaks up for a different conversation while one is open", async () => {
    const h = await loadHarness();
    h.render();

    h.setActiveConversation("u-someone-else");
    h.emit(incoming());

    await h.waitFor(() => expect(h.toasts).toHaveLength(1));
  });

  it("ignores the reader's own message echoed back", async () => {
    const h = await loadHarness();
    h.render();

    h.emit(incoming({ mine: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.toasts).toHaveLength(0);
  });

  it("resolves the directory once across many messages", async () => {
    const h = await loadHarness();
    h.render();

    h.emit(incoming({ id: "m1" }));
    h.emit(incoming({ id: "m2" }));
    h.emit(incoming({ id: "m3" }));

    await h.waitFor(() => expect(h.toasts).toHaveLength(3));
    expect(h.contactCalls).toBe(1);
  });

  it("falls back to a generic title for an unknown sender", async () => {
    const h = await loadHarness();
    h.render();

    h.emit(incoming({ fromUserId: "u-stranger" }));

    await h.waitFor(() => expect(h.toasts).toHaveLength(1));
    expect(h.toasts[0].title).toBe("New message");
  });

  it("truncates a long body", async () => {
    const h = await loadHarness();
    h.render();

    h.emit(incoming({ body: "x".repeat(200) }));

    await h.waitFor(() => expect(h.toasts).toHaveLength(1));
    expect(h.toasts[0].description).toHaveLength(120);
    expect(h.toasts[0].description?.endsWith("…")).toBe(true);
  });

  it("takes nothing and listens for nothing while disabled", async () => {
    const h = await loadHarness();
    h.render(false);

    expect(h.acquires).toBe(0);
    expect(h.listenerCount()).toBe(0);
  });

  it("releases its handler and its hold on unmount", async () => {
    const h = await loadHarness();
    const { unmount } = h.render();

    expect(h.listenerCount()).toBe(1);
    unmount();

    // Removed by reference, so a co-holder's listener would have survived.
    expect(h.listenerCount()).toBe(0);
    expect(h.releases).toBe(1);
  });

  it("opens the messages page from the popup", async () => {
    const h = await loadHarness();
    h.render();

    h.emit(incoming());
    await h.waitFor(() => expect(h.toasts).toHaveLength(1));

    h.toasts[0].onClick?.();
    expect(h.pushed).toEqual(["/dashboard/chat"]);
  });
});

describe("useChatNotifier unread badge", () => {
  it("seeds the count from the server on open", async () => {
    const h = await loadHarness();
    h.setServerUnread(7);
    h.render();

    await h.waitFor(() => expect(h.unreadTotal()).toBe(7));
  });

  it("counts a message that arrives out of sight", async () => {
    const h = await loadHarness();
    h.render();
    await h.waitFor(() => expect(h.unreadCalls).toBe(1));

    h.emit(incoming());

    expect(h.unreadTotal()).toBe(1);
  });

  it("does not count a message into the conversation on screen", async () => {
    const h = await loadHarness();
    h.render();
    await h.waitFor(() => expect(h.unreadCalls).toBe(1));

    h.setActiveConversation("u-ravi");
    h.emit(incoming());

    // Reading it is what marks it read, so the badge owes nothing.
    expect(h.unreadTotal()).toBe(0);
  });

  it("re-reads the count on every reconnect", async () => {
    const h = await loadHarness();
    h.render();
    await h.waitFor(() => expect(h.unreadCalls).toBe(1));

    h.setServerUnread(4);
    h.fireConnect();

    // The derived count knows nothing of what arrived while the socket was down.
    await h.waitFor(() => expect(h.unreadTotal()).toBe(4));
  });

  it("re-reads the count when a backgrounded tab comes back", async () => {
    const h = await loadHarness();
    h.render();
    await h.waitFor(() => expect(h.unreadCalls).toBe(1));

    h.fireVisibility("hidden");
    h.setServerUnread(3);
    h.fireVisibility("visible");

    await h.waitFor(() => expect(h.unreadTotal()).toBe(3));
  });

  it("keeps the derived count when the server cannot be reached", async () => {
    const h = await loadHarness({ unreadFails: true });
    h.render();

    h.emit(incoming());
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Zeroing a badge that might be right is worse than leaving it alone.
    expect(h.unreadTotal()).toBe(1);
  });
});
