import { isAxiosError } from "axios";

import { apiClient, type ApiResponse } from "@/lib/api";
import type {
  LoginCredentials,
  LoginData,
  LoginFailureReason,
  LoginResult,
} from "@/features/auth/types";

/**
 * A blocked account is told by the code, then by 403, never by the words: the API's wording
 * changes (brief 1.5), and its message for a blocked account no longer says "blocked".
 */
const BLOCKED_CODES = ["ACCOUNT_DISABLED", "ACCOUNT_BLOCKED", "USER_DISABLED"];

function looksBlocked(status: number | undefined, code?: string): boolean {
  if (code && BLOCKED_CODES.includes(code)) return true;
  return status === 403;
}

function readBody(data: unknown): { message?: string; code?: string } {
  if (!data || typeof data !== "object") return {};
  const { message, code, error } = data as Record<string, unknown>;
  // The API's errors are { message, error: { code, message } }.
  const nested =
    error && typeof error === "object" ? (error as Record<string, unknown>).code : undefined;
  return {
    message: typeof message === "string" ? message : undefined,
    code:
      typeof code === "string"
        ? code
        : typeof nested === "string"
          ? nested
          : typeof error === "string"
            ? error
            : undefined,
  };
}

function classify(error: unknown): { reason: LoginFailureReason; message?: string } {
  if (!isAxiosError(error)) return { reason: "unknown" };

  // No response at all, server unreachable, DNS failure, timeout, offline.
  if (!error.response) return { reason: "network" };

  const status = error.response.status;
  const { message, code } = readBody(error.response.data);

  // 429 TOO_MANY_ATTEMPTS: this account or network had too many wrong passwords and
  // sign-in is paused ("Try again in 15 minutes. ..."), worth showing as it came. Any
  // other 429 is the throttler: the sign-in form has its own, fuller line for that.
  if (status === 429) {
    return { reason: "rate_limited", message: code === "TOO_MANY_ATTEMPTS" ? message : undefined };
  }
  if (looksBlocked(status, code)) return { reason: "account_blocked", message };
  if (status === 401 || status === 400 || status === 404) {
    return { reason: "invalid_credentials", message };
  }
  if (status >= 500) return { reason: "server", message };
  return { reason: "unknown", message };
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const { data } = await apiClient.post<ApiResponse<LoginData>>("/api/v1/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });

    if (!data.success || !data.data) {
      // 200 with success:false: the code decides.
      const { message, code } = readBody(data);
      return looksBlocked(undefined, code)
        ? { ok: false, reason: "account_blocked", message }
        : { ok: false, reason: "invalid_credentials", message };
    }

    return { ok: true, user: data.data.user };
  } catch (error) {
    const { reason, message } = classify(error);
    return { ok: false, reason, message };
  }
}
