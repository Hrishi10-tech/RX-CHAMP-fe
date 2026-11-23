import { getFeatures } from "@/features/features/api/features";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn() },
  refreshAccessToken: jest.fn(),
}));

const get = (apiClient as unknown as { get: jest.Mock }).get;

describe("release feature flags", () => {
  it("reads the flags from GET /features", async () => {
    get.mockResolvedValueOnce({
      data: { success: true, data: { flags: { messaging: true, aiChat: false } } },
    });
    await expect(getFeatures()).resolves.toEqual({ messaging: true, aiChat: false });
    expect(get).toHaveBeenCalledWith("/api/v1/features");
  });
});
