import type { AuthSession } from "./types";

export const SESSION_COOKIE = "tc_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function encodeSession(session: AuthSession): string {
  return btoa(encodeURIComponent(JSON.stringify(session)));
}

export function decodeSession(raw?: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(raw))) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${encodeSession(session)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function getSession(): AuthSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return decodeSession(match?.slice(SESSION_COOKIE.length + 1));
}

export function clearSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
