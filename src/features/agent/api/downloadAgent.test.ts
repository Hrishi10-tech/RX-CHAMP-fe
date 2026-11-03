import { apiClient } from "@/lib/api";
import { downloadAgentForUser, downloadAgentInstaller } from "./downloadAgent";

jest.mock("@/lib/api", () => ({ apiClient: { post: jest.fn() } }));

const post = apiClient.post as jest.Mock;
const LINK = "https://api.test/api/v1/agent/download/direct?ticket=abc";
let clicked: string[] = [];

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: { data: { url: LINK, expiresInSec: 60 } } });
  clicked = [];
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.href);
  });
});

describe("agent downloads (direct from the API host)", () => {
  it("asks for a ticket for one person's installer, then opens the direct link", async () => {
    await downloadAgentForUser("u-2", "RXVision-Staff.exe", "windows");
    expect(post).toHaveBeenCalledWith("/api/v1/agent/download-ticket", undefined, {
      params: { userId: "u-2", platform: "windows" },
    });
    expect(clicked).toEqual([LINK]);
  });

  it("asks for the plain installer without any user id (never one for yourself)", async () => {
    await downloadAgentInstaller("RXVision.exe", "mac");
    expect(post).toHaveBeenCalledWith("/api/v1/agent/download-ticket", undefined, {
      params: { platform: "mac" },
    });
    expect(clicked).toEqual([LINK]);
  });

  it("fails clearly when the server sends no link", async () => {
    post.mockResolvedValue({ data: {} });
    await expect(downloadAgentInstaller()).rejects.toThrow("download link");
    expect(clicked).toEqual([]);
  });
});
