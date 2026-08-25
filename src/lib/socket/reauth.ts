import type { Socket } from "socket.io-client";

import { clearSocketTicket } from "@/lib/socket/ticket";

/**
 * How many times a socket may refresh-and-retry before it gives up. A handshake
 * that keeps coming back `unauthorized` is not going to be fixed by another token.
 */
const MAX_ATTEMPTS = 3;

/** Backoff between attempts, so even a doomed socket costs three calls, not thousands. */
const BACKOFF_MS = [1_000, 5_000, 15_000];

/**
 * The gateways authenticate at handshake time only, off a short-lived ticket, so
 * an established socket stays authenticated however long it lives. Expiry only
 * bites on reconnect — and a socket kicked with `unauthorized`, left alone, never
 * returns, so live updates silently stop until the page is reloaded.
 *
 * Drop the cached ticket and reconnect: socket.io asks for auth again on the next
 * attempt, which mints a fresh ticket. Retrying with the rejected one would only
 * be refused again.
 *
 * Bounded on purpose. Retrying every `unauthorized` with no cap turns a handshake
 * that can *never* authenticate into an unthrottled loop — unauthorized → new
 * ticket → connect → unauthorized, as fast as the network allows. That is what
 * put ~12,000 refresh rows an hour on one signed-in manager, and the ticket
 * endpoint is rate limited to 30/min, which such a loop would exhaust in seconds.
 * Connecting resets the count, so a genuinely expired ticket still recovers
 * indefinitely; only repeated failures to *stay* connected give up.
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
      // Minting the replacement is socket.io's job, via the `auth` callback on
      // the next attempt. If the cookie behind that call has itself expired, the
      // API client refreshes and retries it; if the session is genuinely gone it
      // redirects to login. Either way there is nothing to await here.
      clearSocketTicket();
      if (!socket.connected) socket.connect();
    }, delay);
  });

  socket.on("disconnect", () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });
}
