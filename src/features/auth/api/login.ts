import { isAxiosError } from "axios";

import { apiClient, type ApiResponse } from "@/lib/api";
import type {
  LoginCredentials,
  LoginData,
  LoginFailureReason,
  LoginResult,
} from "@/features/auth/types";

/**
 * Blocked accounts are detected defensively: an explicit code is preferred, then
 * 403, then the message text — so this keeps working whichever way the backend
 * signals it.
 */
const BLOCKED_CODES = ["ACCOUNT_DISABLED", "ACCOUNT_BLOCKED", "USER_DISABLED"];
const BLOCKED_PATTERN = /disabl|block|deactivat|suspend/i;

function looksBlocked(status: number | undefined, code?: string, message?: string): boolean {
  if (code && BLOCKED_CODES.includes(code)) return true;
  if (status === 403) return true;
  return Boolean(message && BLOCKED_PATTERN.test(message));
}

function readBody(data: unknown): { message?: string; code?: string } {
  if (!data || typeof data !== "object") return {};
  const { message, code, error } = data as Record<string, unknown>;
  return {
    message: typeof message === "string" ? message : undefined,
    code: typeof code === "string" ? code : typeof error === "string" ? error : undefined,
  };
}

function classify(error: unknown): { reason: LoginFailureReason; message?: string } {
  if (!isAxiosError(error)) return { reason: "unknown" };

  // No response at all — server unreachable, DNS failure, timeout, offline.
  if (!error.response) return { reason: "network" };

  const status = error.response.status;
  const { message, code } = readBody(error.response.data);

  if (looksBlocked(status, code, message)) return { reason: "account_blocked", message };
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
      // 200 with success:false — classify off the message alone.
      const { message, code } = readBody(data);
      return looksBlocked(undefined, code, message)
        ? { ok: false, reason: "account_blocked", message }
        : { ok: false, reason: "invalid_credentials", message };
    }

    return { ok: true, user: data.data.user };
  } catch (error) {
    const { reason, message } = classify(error);
    return { ok: false, reason, message };
  }
}
