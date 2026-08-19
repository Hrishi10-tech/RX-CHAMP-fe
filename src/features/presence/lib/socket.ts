import { io, type Socket } from "socket.io-client";

import { attachSocketReauth } from "@/lib/socket/reauth";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

let socket: Socket | null = null;
let refCount = 0;

export function acquirePresenceSocket(): Socket {
  if (!socket) {
    // The gateway authenticates off the httpOnly `accessToken` cookie at
    // handshake time; `withCredentials` is what sends it.
    socket = io(`${SOCKET_URL}/presence`, { withCredentials: true });
    attachSocketReauth(socket);
  }
  refCount += 1;
  return socket;
}

export function releasePresenceSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
