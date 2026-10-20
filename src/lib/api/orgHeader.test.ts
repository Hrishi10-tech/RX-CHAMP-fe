import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * X-Org-Id (SPEC 1.4): the Super Admin's selected organisation goes on every
 * request, except one that names its organisation itself (the Organisations
 * page looking inside an organisation without switching to it).
 */
async function sentHeaders(
  run: (client: AxiosInstance) => Promise<unknown>,
  selected: { id: string; name: string } | null,
): Promise<(string | undefined)[]> {
  const seen: (string | undefined)[] = [];
  await jest.isolateModulesAsync(async () => {
    const selection = await import("@/lib/org/selection");
    selection.resetOrgSelectionForTests();
    selection.setOrgSwitching(true);
    selection.selectOrg(selected);
    const { apiClient } = await import("@/lib/api/client");
    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      seen.push(config.headers.get("X-Org-Id") as string | undefined);
      return {
        data: { success: true },
        status: 200,
        statusText: "",
        headers: {},
        config,
      } as AxiosResponse;
    };
    await run(apiClient);
  });
  return seen;
}

describe("X-Org-Id", () => {
  it("sends the selected organisation, or keeps one the request names", async () => {
    const seen = await sentHeaders(
      async (client) => {
        await client.get("/api/v1/users");
        await client.get("/api/v1/departments", { headers: { "X-Org-Id": "org-b" } });
      },
      { id: "org-a", name: "A" },
    );
    expect(seen).toEqual(["org-a", "org-b"]);
  });

  it("sends nothing for All organisations unless the request names one", async () => {
    const seen = await sentHeaders(async (client) => {
      await client.get("/api/v1/organisations");
      await client.get("/api/v1/users", { headers: { "X-Org-Id": "org-b" } });
    }, null);
    expect(seen).toEqual([undefined, "org-b"]);
  });
});

/** 404 ORG_NOT_FOUND for the organisation a request named. */
function notFound(config: InternalAxiosRequestConfig): Promise<never> {
  const error = Object.assign(new Error("Request failed with status code 404"), {
    isAxiosError: true,
    config,
    response: {
      status: 404,
      data: {
        success: false,
        error: { code: "ORG_NOT_FOUND", message: "That organisation does not exist." },
      },
      headers: {},
      config,
      statusText: "",
    },
  });
  return Promise.reject(error);
}

describe("a deleted organisation (404 ORG_NOT_FOUND)", () => {
  async function run(request: (client: AxiosInstance) => Promise<unknown>) {
    let result: { selected: unknown; gone: unknown[]; afterHeader: string | undefined } | null =
      null;
    await jest.isolateModulesAsync(async () => {
      const selection = await import("@/lib/org/selection");
      selection.resetOrgSelectionForTests();
      selection.setOrgSwitching(true);
      selection.selectOrg({ id: "org-a", name: "Gone Ltd" });
      const gone: unknown[] = [];
      selection.onOrgGone((org) => gone.push(org));
      const { apiClient } = await import("@/lib/api/client");
      let afterHeader: string | undefined;
      apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
        if (config.url === "/api/v1/after") {
          afterHeader = config.headers.get("X-Org-Id") as string | undefined;
          return {
            data: { success: true },
            status: 200,
            statusText: "",
            headers: {},
            config,
          } as AxiosResponse;
        }
        return notFound(config);
      };
      await request(apiClient).catch(() => undefined);
      await apiClient.get("/api/v1/after");
      result = { selected: selection.getSelectedOrg(), gone, afterHeader };
    });
    return result!;
  }

  it("drops the selection, says which one went, and asks for the platform view after", async () => {
    const r = await run((client) => client.get("/api/v1/overview"));
    expect(r.selected).toBeNull();
    expect(r.gone).toEqual([{ id: "org-a", name: "Gone Ltd" }]);
    expect(r.afterHeader).toBeUndefined();
  });

  it("keeps the selection when a request named another organisation on purpose", async () => {
    const r = await run((client) =>
      client.get("/api/v1/departments", { headers: { "X-Org-Id": "org-b" } }),
    );
    expect(r.selected).toEqual({ id: "org-a", name: "Gone Ltd" });
    expect(r.gone).toEqual([]);
    expect(r.afterHeader).toBe("org-a");
  });
});
