import type { Socket } from "socket.io-client";

import { refreshAccessToken } from "@/lib/api";

/**
 * How many times a socket may refresh-and-retry before it gives up. A handshake
 * that keeps coming back `unauthorized` is not going to be fixed by another token.
 */
const MAX_ATTEMPTS = 3;

/** Backoff between attempts, so even a doomed socket costs three calls, not thousands. */
const BACKOFF_MS = [1_000, 5_000, 15_000];

/**
 * The gateways authenticate off the `accessToken` cookie at handshake time only,
 * and that cookie is short-lived (it tracks `JWT_ACCESS_TTL`). A socket that
 * outlives it gets kicked with `unauthorized` and, left alone, never returns —
 * so live updates silently stop until the page is reloaded.
 *
 * Refresh the cookie (single-flight, shared with the HTTP client) and reconnect.
 *
 * Bounded on purpose. Refreshing on every `unauthorized` with no cap turns a
 * handshake that can *never* authenticate — a cookie the browser won't send
 * cross-site, say — into an unthrottled loop: unauthorized → refresh → connect →
 * unauthorized, as fast as the network allows. That is what put ~12,000 refresh
 * rows an hour on one signed-in manager. A refresh that succeeds resets the count,
 * so a genuinely expired token still recovers indefinitely; only repeated failures
 * to *stay* connected give up.
 */
export function attachSocketReauth(socket: Socket): void {
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const reset = () => {
    attempts = 0;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // Staying connected is the proof the token worked; anything before that is a
  // retry that hasn't paid off yet.
  socket.on("connect", reset);

  socket.on("unauthorized", () => {
    if (timer) return; // a retry is already pending
    if (attempts >= MAX_ATTEMPTS) return; // give up quietly; a reload starts over

    const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
    attempts += 1;

    timer = setTimeout(() => {
      timer = null;
      void refreshAccessToken()
        .then(() => {
          if (!socket.connected) socket.connect();
        })
        .catch(() => {
          // Refresh itself failed — the session is genuinely gone. The 401 handler
          // in the API client owns redirecting to login; nothing to do here.
        });
    }, delay);
  });

  socket.on("disconnect", () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });
}
