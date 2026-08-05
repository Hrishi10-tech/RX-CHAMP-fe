import type { Socket } from "socket.io-client";

import { refreshAccessToken } from "@/lib/api";

/**
 * The gateways authenticate off the `accessToken` cookie at handshake time only,
 * and that cookie is short-lived (it tracks `JWT_ACCESS_TTL`). A socket that
 * outlives it gets kicked with `unauthorized` and, left alone, never returns —
 * so live updates silently stop until the page is reloaded.
 *
 * Refresh the cookie (single-flight, shared with the HTTP client) and reconnect.
 * Mirrors what the chat and notification sockets already do.
 */
export function attachSocketReauth(socket: Socket): void {
  socket.on("unauthorized", () => {
    void refreshAccessToken()
      .then(() => {
        if (!socket.connected) socket.connect();
      })
      .catch(() => {
        // Refresh itself failed — the session is genuinely gone. The 401 handler
        // in the API client owns redirecting to login; nothing to do here.
      });
  });
}
