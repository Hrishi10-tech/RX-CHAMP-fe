"use client";

import { useSyncExternalStore } from "react";

/**
 * Avatars pushed by the `avatar:changed` socket event since the lists on screen were
 * fetched. Every PersonAvatar reads through this, so a change shows within seconds
 * everywhere without refetching each list that happens to carry the person.
 */
const REFRESH_COOLDOWN_MS = 30_000;

/**
 * 4.0: the React Query trees whose answers carry people with their avatar. A reconnect
 * (refreshLiveAvatars) reads them again, so nobody goes back to an avatar from before it.
 */
export const PEOPLE_LIST_KEYS: readonly (readonly string[])[] = [
  ["users"],
  ["super-managers"],
  ["team"],
  ["team-today"],
  ["reports", "people"],
  ["departments"],
  ["organisations"],
  ["org-contents"],
  ["overview"],
  ["agent-health"],
  ["signout-keys"],
  ["leave"],
  ["wfh"],
  ["attendance"],
  ["approvals"],
  ["calendar"],
  ["shift-assignments"],
];

const pushed = new Map<string, string | null>();
const listeners = new Set<() => void>();
let lastRefreshAt = 0;

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLiveAvatar(userId: string, avatarId: string | null): void {
  pushed.set(userId, avatarId);
  notify();
}

export function clearLiveAvatars(): void {
  if (pushed.size === 0) return;
  pushed.clear();
  notify();
}

/**
 * After a socket reconnect, when pushes may have been missed: what was pushed goes, and
 * every list that shows people reads again (PEOPLE_LIST_KEYS, by the caller), so fresh
 * lists are the truth rather than the ones fetched before the pushes. A flapping socket fires reconnect
 * over and over, so this does nothing again for a while. Answers whether it did anything.
 */
export function refreshLiveAvatars(): boolean {
  const now = Date.now();
  if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) return false;
  lastRefreshAt = now;
  pushed.clear();
  notify();
  return true;
}

/** The avatar to show for a person: the latest push, else what the API said. */
export function useLiveAvatarId(
  userId: string | undefined,
  fetched: string | null | undefined,
): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (userId !== undefined && pushed.has(userId) ? pushed.get(userId)! : (fetched ?? null)),
    () => fetched ?? null,
  );
}
