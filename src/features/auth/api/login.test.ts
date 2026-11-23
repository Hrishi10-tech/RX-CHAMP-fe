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
    const text = "Try again in 15 minutes. Sign-in is paused for now.";
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

  it("answers the throttler (429 RATE_LIMITED) with the form's own line", async () => {
    post.mockRejectedValueOnce(failure(429, "RATE_LIMITED", "Try again in a minute."));
    const result = await login(credentials);
    expect(result).toEqual({ ok: false, reason: "rate_limited", message: undefined });
    if (!result.ok) {
      expect(loginErrorCopy(result.reason, result.message).description).toBe(
        "Too many sign-in attempts. Wait a minute, then try again.",
      );
    }
  });

  it("still reads a wrong password and a disabled account", async () => {
    post.mockRejectedValueOnce(
      failure(401, "INVALID_CREDENTIALS", "Check your email and password, then try again."),
    );
    expect(await login(credentials)).toMatchObject({ ok: false, reason: "invalid_credentials" });
    const off = "Ask your manager or an administrator to turn your account back on.";
    post.mockRejectedValueOnce(failure(403, "ACCOUNT_DISABLED", off));
    expect(await login(credentials)).toEqual({
      ok: false,
      reason: "account_blocked",
      message: off,
    });
    expect(loginErrorCopy("account_blocked").title).toBe("Account blocked");
    expect(loginErrorCopy("account_blocked", off).description).toBe(off);
  });

  it("branches on the code, never on the words", async () => {
    // Words that once meant blocked, on a wrong password.
    post.mockRejectedValueOnce(failure(401, "INVALID_CREDENTIALS", "Your account is blocked"));
    expect(await login(credentials)).toMatchObject({ ok: false, reason: "invalid_credentials" });
    // A 200 with success:false: no code, no blocked account, whatever it says.
    post.mockResolvedValueOnce({ data: { success: false, message: "This account is disabled" } });
    expect(await login(credentials)).toMatchObject({ ok: false, reason: "invalid_credentials" });
    post.mockResolvedValueOnce({
      data: { success: false, message: "Ask your manager", error: { code: "ACCOUNT_DISABLED" } },
    });
    expect(await login(credentials)).toMatchObject({ ok: false, reason: "account_blocked" });
  });
});
