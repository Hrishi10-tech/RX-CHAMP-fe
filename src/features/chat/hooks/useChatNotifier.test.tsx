import * as React from "react";
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
 */
async function loadHarness(): Promise<Harness> {
  let harness: Harness | undefined;

  await jest.isolateModulesAsync(async () => {
    jest.doMock("react", () => React);

    const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
    const toasts: Harness["toasts"] = [];
    const pushed: string[] = [];
    const counts = { acquires: 0, releases: 0, contactCalls: 0 };

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

    harness = {
      render: (enabled = true) => renderHook(() => useChatNotifier(enabled)),
      waitFor,
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
