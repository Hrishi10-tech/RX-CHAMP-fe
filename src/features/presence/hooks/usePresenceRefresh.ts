"use client";

import { useEffect, useRef } from "react";

import { throttle } from "@/lib/hooks/throttle";
import { acquirePresenceSocket, releasePresenceSocket } from "@/features/presence/lib/socket";

/** SPEC 7.5: a presence change refetches at most every 15 seconds. */
export const PRESENCE_REFRESH_MIN_MS = 15_000;

/**
 * Calls `onChange` when someone's presence changes (a break, a meeting, Start or
 * End Day), throttled so a burst of changes across a team costs one refetch.
 * `userId` narrows it to one person.
 */
export function usePresenceRefresh(
  onChange: () => void,
  {
    userId,
    enabled = true,
    minIntervalMs = PRESENCE_REFRESH_MIN_MS,
  }: {
    userId?: string;
    enabled?: boolean;
    minIntervalMs?: number;
  } = {},
): void {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });

  useEffect(() => {
    if (!enabled) return;
    const run = throttle(() => callback.current(), minIntervalMs);
    const socket = acquirePresenceSocket();
    const onUpdate = (u: { userId?: string }) => {
      if (userId && u?.userId !== userId) return;
      run();
    };
    socket.on("presence:update", onUpdate);
    return () => {
      run.cancel();
      socket.off("presence:update", onUpdate);
      releasePresenceSocket();
    };
  }, [enabled, userId, minIntervalMs]);
}
