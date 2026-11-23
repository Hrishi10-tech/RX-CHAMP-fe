import { AxiosError } from "axios";

import { apiClient } from "@/lib/api";

import {
  NO_DAY_PROGRESS,
  getAvatarManifest,
  getDayProgress,
  getMyAvatar,
  resetMyAvatar,
  resetUserAvatar,
  setMyAvatar,
} from "./avatars";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const client = apiClient as unknown as Record<"get" | "put" | "post" | "delete", jest.Mock>;
const ok = <T>(data: T) => ({ data: { success: true, data } });
const failing = (status: number) => {
  const err = new AxiosError("Request failed");
  err.response = { status, data: {} } as never;
  return err;
};

describe("the avatar routes the portal calls", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads the manifest and unwraps it", async () => {
    const manifest = { version: 1, defaults: {}, avatars: [] };
    client.get.mockResolvedValue(ok(manifest));
    await expect(getAvatarManifest()).resolves.toEqual(manifest);
    expect(client.get).toHaveBeenCalledWith("/api/v1/avatars/manifest");
  });

  it("reads your avatar", async () => {
    const mine = { avatarId: "M01", chosenAvatarId: null, defaultAvatarId: "M01", library: "male" };
    client.get.mockResolvedValue(ok(mine));
    await expect(getMyAvatar()).resolves.toEqual(mine);
    expect(client.get).toHaveBeenCalledWith("/api/v1/me/avatar");
  });

  it("saves with PUT and the manifest ID only", async () => {
    client.put.mockResolvedValue(ok({ avatarId: "M12" }));
    await expect(setMyAvatar("M12")).resolves.toEqual({ avatarId: "M12" });
    expect(client.put).toHaveBeenCalledWith("/api/v1/me/avatar", { avatarId: "M12" });
  });

  it("resets your own with DELETE", async () => {
    client.delete.mockResolvedValue(ok({ avatarId: "M01" }));
    await expect(resetMyAvatar()).resolves.toEqual({ avatarId: "M01" });
    expect(client.delete).toHaveBeenCalledWith("/api/v1/me/avatar");
  });

  it("resets someone else's with POST on their avatar", async () => {
    client.post.mockResolvedValue(ok({ userId: "u-1", avatarId: "M01" }));
    await resetUserAvatar("u-1");
    expect(client.post).toHaveBeenCalledWith("/api/v1/users/u-1/avatar/reset");
  });

  describe("day progress", () => {
    it("reads the route and unwraps it", async () => {
      const day = { ...NO_DAY_PROGRESS, status: "BREAK" };
      client.get.mockResolvedValue(ok(day));
      await expect(getDayProgress()).resolves.toEqual(day);
      expect(client.get).toHaveBeenCalledWith("/api/v1/me/day-progress");
    });

    it("a 404, an API without the route, answers Working at 0", async () => {
      client.get.mockRejectedValue(failing(404));
      await expect(getDayProgress()).resolves.toBe(NO_DAY_PROGRESS);
    });

    it.each([500, 503, 403])("a %i is a failure, never Working at 0", async (status) => {
      client.get.mockRejectedValue(failing(status));
      await expect(getDayProgress()).rejects.toBeInstanceOf(AxiosError);
    });

    it("so is the network going away", async () => {
      client.get.mockRejectedValue(new AxiosError("Network Error"));
      await expect(getDayProgress()).rejects.toBeInstanceOf(AxiosError);
    });
  });
});
