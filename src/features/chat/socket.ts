import { io, type Socket } from "socket.io-client";

import { attachSocketReauth } from "@/lib/socket/reauth";
import { socketAuth } from "@/lib/socket/ticket";

// Empty falls back to same-origin, never to a localhost that would ship to a
// production build. In production this names the backend host directly, which is
// fine cross-site: the handshake authenticates off a ticket, not off the cookie.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

let socket: Socket | null = null;
let refCount = 0;

/**
 * Shared, because two things listen on it: the messages page, and the notifier
 * that raises a popup from any other screen. A connection each would double the
 * gateway's fan-out and hand every message to both.
 *
 * Holders must remove their own handlers by reference — `socket.off()` with no
 * arguments strips every listener, the other holder's included.
 */
export function acquireChatSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/chat`, {
      withCredentials: true,
      auth: socketAuth,
      transports: ["websocket"],
    });
    attachSocketReauth(socket);
  }
  refCount += 1;
  return socket;
}

export function releaseChatSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}
