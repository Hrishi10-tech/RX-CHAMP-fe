import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

import { clearSession } from "@/lib/auth/session";
import type { RetryableConfig } from "./types";

const REFRESH_URL = "/api/v1/auth/refresh";
const LOGIN_ROUTE = "/auth/login";

/**
 * A 401 from one of these is a rejected credential — a wrong password, or a
 * refresh cookie that is genuinely gone — not an expired access token.
 * Refreshing off one of them is how the refresh loop starts.
 */
const AUTH_URLS = [REFRESH_URL, "/api/v1/auth/login", "/api/v1/auth/logout"];

export const apiClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  // Both tokens are httpOnly cookies, so every request has to carry them; the
  // browser sends nothing without this and everything 401s.
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;
/** Latched once a refresh fails: the session is gone, so stop asking. */
let sessionDead = false;

/**
 * Re-issues the short-lived `accessToken` cookie. Single-flight, so a burst of
 * 401s — a dashboard's worth of parallel requests, or several sockets kicked at
 * once — triggers one refresh, not one each. Racing refreshes rotate the token
 * N times server-side and only the last one survives, killing the rest.
 */
export function refreshAccessToken(): Promise<void> {
  if (sessionDead) return Promise.reject(new Error("Session expired"));

  refreshPromise ??= axios
    .post(REFRESH_URL, null, { withCredentials: true })
    .then(() => undefined)
    .catch((error: unknown) => {
      sessionDead = true;
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.href = LOGIN_ROUTE;
  }
}

apiClient.interceptors.response.use(
  (response) => {
    // Any 2xx proves the cookies still work, so an earlier refresh failure is
    // stale (a fresh login, or the network came back). Let refresh try again.
    sessionDead = false;
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = AUTH_URLS.some((url) => original?.url?.includes(url));

    // `_retry` caps this at one refresh per request — no loops.
    if (status !== 401 || !original || original._retry || isAuthCall) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      await refreshAccessToken();
      return apiClient(original as AxiosRequestConfig);
    } catch (refreshError) {
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);
