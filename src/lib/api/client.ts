import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

import { clearSession, getSession } from "@/lib/auth/session";
import type { RetryableConfig } from "./types";

const REFRESH_URL = "/api/v1/auth/refresh";
const LOGIN_URL = "/api/v1/auth/login";
const LOGIN_ROUTE = "/auth/login";

export const apiClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = getSession()?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setApiAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

let refreshPromise: Promise<void> | null = null;

/**
 * Re-issues the short-lived `accessToken` cookie. Single-flight, so a burst of
 * 401s — or several sockets kicked at once — triggers one refresh, not one each.
 */
export function refreshAccessToken(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(REFRESH_URL, null, { withCredentials: true })
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.href = LOGIN_ROUTE;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    // A 401 from login/refresh itself is a rejected credential, not an expired
    // token. Refreshing would fail and then hard-redirect to /auth/login, reloading
    // the page and discarding the error the user needs to see.
    const isAuthCall = original?.url?.includes(REFRESH_URL) || original?.url?.includes(LOGIN_URL);

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
