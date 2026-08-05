"use client";

import { useEffect, useRef, useState } from "react";

import type { LiveActivityUpdate } from "@/features/activity/types";
import { acquireActivitySocket, releaseActivitySocket } from "@/features/activity/lib/socket";

export function useReportActivityLive(
  userId: string,
  onUpdate: (update: LiveActivityUpdate) => void,
): boolean {
  const [connected, setConnected] = useState(false);

  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    const socket = acquireActivitySocket();
    setConnected(socket.connected);

    const handleUpdate = (update: LiveActivityUpdate) => {
      if (update.userId === userId) callbackRef.current(update);
    };
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("activity:update", handleUpdate);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("activity:update", handleUpdate);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      releaseActivitySocket();
    };
  }, [userId]);

  return connected;
}
