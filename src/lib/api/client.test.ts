import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * The refresh loop that these guard against: several requests 401 in the same
 * second, each fires its own refresh, the server rotates the token once per
 * call, and every rotation but the last is dead on arrival.
 */

type Route = (url: string) => number;

interface Harness {
  apiClient: AxiosInstance;
  calls: string[];
}

const REFRESH = "/api/v1/auth/refresh";

/**
 * Fresh copy of the client per test — it latches a failed refresh in module
 * state, so tests would otherwise leak into each other.
 */
async function loadHarness(route: Route): Promise<Harness> {
  let harness: Harness | undefined;

  await jest.isolateModulesAsync(async () => {
    const { default: axios, AxiosError } = await import("axios");
    const calls: string[] = [];

    const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      const url = config.url ?? "";
      calls.push(url);
      const status = route(url);
      const response: AxiosResponse = {
        data: { success: status < 400 },
        status,
        statusText: "",
        headers: {},
        config,
      };
      if (status >= 400) {
        throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, response);
      }
      return response;
    };

    axios.defaults.adapter = adapter;
    const { apiClient } = await import("@/lib/api/client");
    apiClient.defaults.adapter = adapter;
    harness = { apiClient, calls };
  });

  return harness as Harness;
}

beforeEach(() => {
  // The 401 handler hard-navigates on a dead session; jsdom can't. Reset per test
  // so a redirect in one does not leave axios resolving against a relative URL.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "http://localhost/" },
  });
});

describe("apiClient 401 handling", () => {
  it("refreshes once for a burst of concurrent 401s, then retries each request", async () => {
    let refreshed = false;
    const { apiClient, calls } = await loadHarness((url) => {
      if (url === REFRESH) {
        refreshed = true;
        return 200;
      }
      return refreshed ? 200 : 401;
    });

    const results = await Promise.all([
      apiClient.get("/api/v1/reports"),
      apiClient.get("/api/v1/screenshots"),
      apiClient.get("/api/v1/activity"),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(calls.filter((url) => url === REFRESH)).toHaveLength(1);
  });

  it("does not refresh when login itself returns 401", async () => {
    const { apiClient, calls } = await loadHarness(() => 401);

    await expect(apiClient.post("/api/v1/auth/login", {})).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(calls).not.toContain(REFRESH);
  });

  it("stops refreshing once a refresh has failed", async () => {
    const { apiClient, calls } = await loadHarness(() => 401);

    await expect(apiClient.get("/api/v1/reports")).rejects.toBeDefined();
    await expect(apiClient.get("/api/v1/reports")).rejects.toBeDefined();

    expect(calls.filter((url) => url === REFRESH)).toHaveLength(1);
    expect(window.location.href).toBe("/auth/login");
  });

  it("retries a request at most once", async () => {
    const { apiClient, calls } = await loadHarness((url) => (url === REFRESH ? 200 : 401));

    await expect(apiClient.get("/api/v1/reports")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(calls.filter((url) => url === "/api/v1/reports")).toHaveLength(2);
  });
});
