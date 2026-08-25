/**
 * What these guard against: four namespaces connect at once, and all four
 * reconnect together after a dropout. One ticket request per socket per attempt
 * would burn through the endpoint's 30/min cap in a couple of reconnect rounds.
 */

interface Harness {
  getSocketTicket: () => Promise<string>;
  clearSocketTicket: () => void;
  socketAuth: (cb: (payload: { token?: string }) => void) => void;
  /** One entry per actual HTTP call, so the cache is measurable. */
  calls: string[];
}

type Responder = (call: number) => { token: string; expiresIn?: number } | Error;

/**
 * Fresh copy per test — the module caches the ticket in module state, so tests
 * would otherwise leak into each other.
 */
async function loadHarness(responder: Responder): Promise<Harness> {
  let harness: Harness | undefined;

  await jest.isolateModulesAsync(async () => {
    const calls: string[] = [];

    jest.doMock("@/lib/api", () => ({
      apiClient: {
        get: async (url: string) => {
          calls.push(url);
          const result = responder(calls.length);
          if (result instanceof Error) throw result;
          return { data: { success: true, data: result } };
        },
      },
    }));

    const mod = await import("./ticket");
    harness = {
      getSocketTicket: mod.getSocketTicket,
      clearSocketTicket: mod.clearSocketTicket,
      socketAuth: mod.socketAuth,
      calls,
    };
  });

  if (!harness) throw new Error("harness failed to load");
  return harness;
}

const ok: Responder = (n) => ({ token: `ticket-${n}`, expiresIn: 300 });

afterEach(() => {
  jest.useRealTimers();
});

describe("getSocketTicket", () => {
  it("reuses a live ticket instead of spending a request", async () => {
    const h = await loadHarness(ok);

    await expect(h.getSocketTicket()).resolves.toBe("ticket-1");
    await expect(h.getSocketTicket()).resolves.toBe("ticket-1");

    expect(h.calls).toHaveLength(1);
  });

  it("collapses concurrent requests into one — the four-namespace case", async () => {
    const h = await loadHarness(ok);

    const tokens = await Promise.all([
      h.getSocketTicket(),
      h.getSocketTicket(),
      h.getSocketTicket(),
      h.getSocketTicket(),
    ]);

    expect(tokens).toEqual(["ticket-1", "ticket-1", "ticket-1", "ticket-1"]);
    expect(h.calls).toHaveLength(1);
  });

  it("refetches once the ticket is inside the expiry margin", async () => {
    jest.useFakeTimers();
    const h = await loadHarness(ok);

    await expect(h.getSocketTicket()).resolves.toBe("ticket-1");

    // 300s ticket, 30s margin: still good at 269s, spent at 271s.
    jest.advanceTimersByTime(269_000);
    await expect(h.getSocketTicket()).resolves.toBe("ticket-1");
    expect(h.calls).toHaveLength(1);

    jest.advanceTimersByTime(2_000);
    await expect(h.getSocketTicket()).resolves.toBe("ticket-2");
    expect(h.calls).toHaveLength(2);
  });

  it("mints a new ticket after a rejected one is cleared", async () => {
    const h = await loadHarness(ok);

    await expect(h.getSocketTicket()).resolves.toBe("ticket-1");
    h.clearSocketTicket();

    await expect(h.getSocketTicket()).resolves.toBe("ticket-2");
    expect(h.calls).toHaveLength(2);
  });

  it("does not cache a failure — the next attempt retries", async () => {
    const h = await loadHarness((n) => (n === 1 ? new Error("503") : { token: `ticket-${n}` }));

    await expect(h.getSocketTicket()).rejects.toThrow("503");
    await expect(h.getSocketTicket()).resolves.toBe("ticket-2");
  });

  it("rejects a response that carries no token", async () => {
    const h = await loadHarness(() => ({ token: "" }));

    await expect(h.getSocketTicket()).rejects.toThrow(/no token/i);
  });
});

describe("socketAuth", () => {
  it("hands socket.io the ticket", async () => {
    const h = await loadHarness(ok);
    const payload = await new Promise<{ token?: string }>((resolve) => h.socketAuth(resolve));

    expect(payload).toEqual({ token: "ticket-1" });
  });

  it("hands over an empty payload on failure, leaving the cookie fallback", async () => {
    const h = await loadHarness(() => new Error("offline"));
    const payload = await new Promise<{ token?: string }>((resolve) => h.socketAuth(resolve));

    // Not `{ token: undefined }` — the handshake proceeds with no token at all.
    expect(payload).toEqual({});
  });
});
