import axios, { AxiosHeaders, type AxiosError, type AxiosRequestConfig } from "axios";

import { clearSession } from "@/lib/auth/session";
import { dropMissingOrg, orgHeaderValue } from "@/lib/org/selection";
import { errorCode } from "./errorMessage";
import { loginHref } from "@/features/auth/lib/loginRedirect";
import type { RetryableConfig } from "./types";

const REFRESH_URL = "/api/v1/auth/refresh";

/** SPEC 1.4: the organisation a Super Admin has selected. */
export const ORG_HEADER = "X-Org-Id";

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

/**
 * A Super Admin acts inside one organisation by sending its id on every request
 * (SPEC 1.4). Nothing is sent for "All organisations" or for any other role. A
 * request that names an organisation itself (the Organisations page reading one
 * organisation's departments and people) keeps it.
 */
apiClient.interceptors.request.use((config) => {
  const org = orgHeaderValue();
  if (org && !config.headers.has(ORG_HEADER)) config.headers.set(ORG_HEADER, org);
  return config;
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
    // Remember the page, so signing in again comes back to it.
    const { pathname = "", search = "" } = window.location;
    window.location.href = loginHref(pathname + search);
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

    // The selected organisation no longer exists (deleted, or a stale choice in
    // this browser): drop it and fall back to the platform view, instead of
    // failing on every page and every refetch.
    if (status === 404 && errorCode(error) === "ORG_NOT_FOUND") {
      const sent = AxiosHeaders.from(original?.headers as AxiosHeaders | undefined).get(ORG_HEADER);
      dropMissingOrg(typeof sent === "string" ? sent : null);
    }

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
