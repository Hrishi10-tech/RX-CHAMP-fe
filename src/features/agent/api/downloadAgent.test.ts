import { apiClient } from "@/lib/api";
import { downloadAgentForUser, downloadAgentInstaller } from "./downloadAgent";

jest.mock("@/lib/api", () => ({ apiClient: { get: jest.fn() } }));

const get = apiClient.get as jest.Mock;

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({ data: new Blob(["x"]) });
  // jsdom has no object URLs.
  Object.assign(URL, { createObjectURL: jest.fn(() => "blob:x"), revokeObjectURL: jest.fn() });
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("agent downloads (4.0)", () => {
  it("asks for one person's installer by their id", async () => {
    await downloadAgentForUser("u-2", "RXVision-Staff.exe", "windows");
    expect(get).toHaveBeenCalledWith("/api/v1/agent/download", {
      params: { userId: "u-2", platform: "windows" },
      responseType: "blob",
    });
  });

  it("asks for the plain installer without any user id (never one for yourself)", async () => {
    await downloadAgentInstaller("RXVision.exe", "mac");
    expect(get).toHaveBeenCalledWith("/api/v1/agent/download", {
      params: { platform: "mac" },
      responseType: "blob",
    });
  });
});
