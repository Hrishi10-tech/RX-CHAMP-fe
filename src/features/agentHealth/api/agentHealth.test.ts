import { apiClient } from "@/lib/api";
import { buildAgentHealthQuery, fetchAgentHealth, getAgentHealth } from "./agentHealth";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn() },
  refreshAccessToken: jest.fn(),
}));

const client = apiClient as unknown as { get: jest.Mock };
const answer = (data: unknown) => Promise.resolve({ data: { success: true, data } });

describe("GET /agent-health", () => {
  beforeEach(() => client.get.mockReset());

  it("sends only the filters that are set", () => {
    expect(buildAgentHealthQuery({})).toEqual({});
    expect(buildAgentHealthQuery({ problemsOnly: false, departmentId: "" })).toEqual({});
    expect(
      buildAgentHealthQuery({ problemsOnly: true, departmentId: "d1", companyId: "c1" }),
    ).toEqual({ problemsOnly: true, departmentId: "d1", companyId: "c1" });
  });

  it("reads the view, filling a missing summary and dropping broken rows", async () => {
    client.get.mockImplementation(() =>
      answer({
        date: "2026-11-03",
        timezone: "Asia/Kolkata",
        asOf: "2026-11-03T06:00:00.000Z",
        rows: [{ userId: "u1", name: "Asha", flags: [] }, null],
      }),
    );
    const view = await getAgentHealth();
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/agent-health", { params: {} });
    expect(view.organisationId).toBeNull();
    expect(view.summary.people).toBe(0);
    expect(view.rows.map((r) => r.userId)).toEqual(["u1"]);
  });

  it("fetchAgentHealth({ problemsOnly }) is the reusable entry point", async () => {
    client.get.mockImplementation(() => answer({ organisationId: "o1", rows: [] }));
    const view = await fetchAgentHealth({ problemsOnly: true });
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/agent-health", {
      params: { problemsOnly: true },
    });
    expect(view.organisationId).toBe("o1");
  });

  it("throws the server's message on a refusal", async () => {
    client.get.mockImplementation(() =>
      Promise.resolve({
        data: { success: false, message: "Ask your admin for access to your team." },
      }),
    );
    await expect(getAgentHealth()).rejects.toThrow("Ask your admin");
  });
});
