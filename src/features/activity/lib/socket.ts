import { io, type Socket } from "socket.io-client";

import { getSession } from "@/lib/auth/session";
import { attachSocketReauth } from "@/lib/socket/reauth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

let socket: Socket | null = null;
let refCount = 0;

export function acquireActivitySocket(): Socket {
  if (!socket) {
    const token = getSession()?.token;
    socket = io(`${SOCKET_URL}/activity`, {
      auth: token ? { token } : undefined,
      withCredentials: true,
    });
    attachSocketReauth(socket);
  }
  refCount += 1;
  return socket;
}

export function releaseActivitySocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
