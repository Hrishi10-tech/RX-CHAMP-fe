import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { InternalAxiosRequestConfig } from "axios";

import { OrgSwitcher } from "./OrgSwitcher";
import * as api from "@/features/organisations/api/organisations";
import { apiClient } from "@/lib/api/client";
import { orgScopedHash } from "@/lib/query/QueryProvider";
import {
  getSelectedOrg,
  orgHeaderValue,
  resetOrgSelectionForTests,
  selectOrg,
  setOrgSwitching,
} from "@/lib/org/selection";
import type { OrganisationView } from "@/features/organisations/types";

jest.mock("@/features/organisations/api/organisations", () => ({
  getOrganisations: jest.fn(),
}));

const mocked = api as jest.Mocked<typeof api>;

function org(id: string, name: string, admin = true): OrganisationView {
  return {
    id,
    name,
    createdAt: null,
    admin: admin ? { id: `a-${id}`, name: `Admin ${name}`, email: "" } : null,
    counts: { staff: 4, managers: 1, departments: 2 },
    today: { started: 2, working: 2, onBreak: 0, notStarted: 2 },
  };
}

function renderSwitcher(onChange = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OrgSwitcher onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

/** Runs a request through the client's own interceptors and returns the headers it would send. */
async function headersSent(): Promise<Record<string, unknown>> {
  let seen: Record<string, unknown> = {};
  await apiClient.get("/api/v1/team", {
    adapter: async (config: InternalAxiosRequestConfig) => {
      seen = config.headers.toJSON() as Record<string, unknown>;
      return {
        data: { success: true, data: {} },
        status: 200,
        statusText: "",
        headers: {},
        config,
      };
    },
  });
  return seen;
}

beforeEach(() => {
  window.localStorage.clear();
  resetOrgSelectionForTests();
  setOrgSwitching(true);
  mocked.getOrganisations.mockResolvedValue([
    org("o1", "Xelements Health"),
    org("o2", "RhythmRx", false),
  ]);
});

describe("OrgSwitcher (Super Admin header)", () => {
  it("starts on All organisations and lists every organisation", async () => {
    renderSwitcher();
    const trigger = screen.getByRole("button", { name: /Organisation: All organisations/ });
    await userEvent.click(trigger);
    expect(await screen.findByRole("option", { name: /Xelements Health/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /RhythmRx.*No admin yet/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /All organisations/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("selects an organisation, remembers it per browser and reports the change", async () => {
    const onChange = renderSwitcher();
    await userEvent.click(screen.getByRole("button", { name: /Change organisation/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Xelements Health/ }));
    expect(getSelectedOrg()).toEqual({ id: "o1", name: "Xelements Health" });
    expect(JSON.parse(window.localStorage.getItem("rxv.org") ?? "{}")).toEqual({
      id: "o1",
      name: "Xelements Health",
    });
    expect(onChange).toHaveBeenCalledWith({ id: "o1", name: "Xelements Health" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Organisation: Xelements Health/ }),
      ).toBeInTheDocument(),
    );
  });

  it("filters by search", async () => {
    renderSwitcher();
    await userEvent.click(screen.getByRole("button", { name: /Change organisation/ }));
    await screen.findByRole("option", { name: /Xelements/ });
    await userEvent.type(screen.getByRole("searchbox", { name: "Find an organisation" }), "rhy");
    expect(screen.queryByRole("option", { name: /Xelements/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /RhythmRx/ })).toBeInTheDocument();
  });

  it("goes back to the platform view", async () => {
    selectOrg({ id: "o2", name: "RhythmRx" });
    const onChange = renderSwitcher();
    await userEvent.click(screen.getByRole("button", { name: /Organisation: RhythmRx/ }));
    await userEvent.click(await screen.findByRole("option", { name: /All organisations/ }));
    expect(getSelectedOrg()).toBeNull();
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe("X-Org-Id and the cache", () => {
  it("sends X-Org-Id on every request once an organisation is selected", async () => {
    expect((await headersSent())["X-Org-Id"]).toBeUndefined();
    selectOrg({ id: "o1", name: "Xelements Health" });
    expect(orgHeaderValue()).toBe("o1");
    expect((await headersSent())["X-Org-Id"]).toBe("o1");
  });

  it("never sends it for anyone but a Super Admin", async () => {
    selectOrg({ id: "o1", name: "Xelements Health" });
    setOrgSwitching(false);
    expect((await headersSent())["X-Org-Id"]).toBeUndefined();
  });

  it("drops a selected organisation the server no longer knows (ORG_NOT_FOUND)", async () => {
    selectOrg({ id: "gone", name: "Old Org" });
    const failing = apiClient.get("/api/v1/settings", {
      adapter: async (config: InternalAxiosRequestConfig) =>
        Promise.reject(
          Object.assign(new Error("Request failed with status code 404"), {
            isAxiosError: true,
            config,
            response: {
              status: 404,
              statusText: "",
              headers: {},
              config,
              data: {
                success: false,
                message: "Organisation not found",
                error: { code: "ORG_NOT_FOUND" },
              },
            },
          }),
        ),
    });
    await expect(failing).rejects.toBeTruthy();
    expect(getSelectedOrg()).toBeNull();
    expect(window.localStorage.getItem("rxv.org")).toBeNull();
  });

  it("keeps each organisation's answers apart in the query cache", () => {
    expect(orgScopedHash(["team", "list"], "o1")).not.toBe(orgScopedHash(["team", "list"], "o2"));
    expect(orgScopedHash(["team", "list"], "")).not.toBe(orgScopedHash(["team", "list"], "o1"));
    // Who is signed in and the platform list are not one organisation's.
    expect(orgScopedHash(["me"], "o1")).toBe(orgScopedHash(["me"], "o2"));
    expect(orgScopedHash(["organisations"], "o1")).toBe(orgScopedHash(["organisations"], ""));
  });
});
