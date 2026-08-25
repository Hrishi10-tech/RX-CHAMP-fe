import { io, type Socket } from "socket.io-client";

import { attachSocketReauth } from "@/lib/socket/reauth";
import { socketAuth } from "@/lib/socket/ticket";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

let socket: Socket | null = null;
let refCount = 0;

export function acquirePresenceSocket(): Socket {
  if (!socket) {
    // The gateway authenticates the handshake off a short-lived ticket, since
    // the auth cookie belongs to this origin and is never sent to the backend
    // host. `withCredentials` still matters for local dev, where the two are
    // same-site and the cookie is what the gateway falls back to.
    socket = io(`${SOCKET_URL}/presence`, { withCredentials: true, auth: socketAuth });
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
