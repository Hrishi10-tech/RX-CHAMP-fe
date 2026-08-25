import { io, type Socket } from "socket.io-client";

import { socketAuth } from "@/lib/socket/ticket";

// Empty falls back to same-origin, never to a localhost that would ship to a
// production build. In production this names the backend host directly, which is
// fine cross-site: the handshake authenticates off a ticket, not off the cookie.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";

export function createNotificationsSocket(): Socket {
  return io(`${SOCKET_URL}/notifications`, {
    withCredentials: true,
    auth: socketAuth,
    transports: ["websocket"],
    autoConnect: false,
  });
}
