import { AxiosError, AxiosHeaders } from "axios";

import { login } from "@/features/auth/api/login";
import { loginErrorCopy } from "@/features/auth/lib/loginErrors";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { post: jest.fn() },
  refreshAccessToken: jest.fn(),
}));

const post = (apiClient as unknown as { post: jest.Mock }).post;

/** An axios failure carrying the API's error body: { message, error: { code, message } }. */
function failure(status: number, code: string, message: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(message, String(status), config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: { success: false, message, error: { code, message } },
  });
}

const credentials = { email: "asha@example.test", password: "x", remember: false };

describe("login failures, as the API sends them", () => {
  it("shows the pause from too many wrong passwords (429 TOO_MANY_ATTEMPTS) as it came", async () => {
    const text = "Too many wrong passwords. Sign-in is paused for 15 minutes.";
    post.mockRejectedValueOnce(failure(429, "TOO_MANY_ATTEMPTS", text));
    const result = await login(credentials);
    expect(result).toEqual({ ok: false, reason: "rate_limited", message: text });
    if (!result.ok) {
      expect(loginErrorCopy(result.reason, result.message)).toMatchObject({
        title: "Sign-in paused",
        description: text,
      });
    }
  });

  it("keeps the throttler's own wording (429 RATE_LIMITED) away from people", async () => {
    post.mockRejectedValueOnce(
      failure(429, "RATE_LIMITED", "ThrottlerException: Too Many Requests"),
    );
    const result = await login(credentials);
    expect(result).toEqual({ ok: false, reason: "rate_limited", message: undefined });
    if (!result.ok) {
      expect(loginErrorCopy(result.reason, result.message).description).toBe(
        "Too many sign-in attempts. Wait a minute, then try again.",
      );
    }
  });

  it("still reads a wrong password and a disabled account", async () => {
    post.mockRejectedValueOnce(failure(401, "UNAUTHORIZED", "Invalid email or password"));
    expect(await login(credentials)).toMatchObject({ ok: false, reason: "invalid_credentials" });
    post.mockRejectedValueOnce(failure(403, "ACCOUNT_DISABLED", "This account is disabled"));
    expect(await login(credentials)).toMatchObject({ ok: false, reason: "account_blocked" });
    expect(loginErrorCopy("account_blocked").title).toBe("Account blocked");
  });
});
