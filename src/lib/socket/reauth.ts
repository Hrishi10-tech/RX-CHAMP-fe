import type { Socket } from "socket.io-client";

import { clearSocketTicket } from "@/lib/socket/ticket";

/**
 * How many times a socket may refresh-and-retry before it gives up. A handshake
 * that keeps being turned away is not going to be fixed by another ticket.
 */
const MAX_ATTEMPTS = 3;

/** Backoff between attempts, so even a doomed socket costs three calls, not thousands. */
const BACKOFF_MS = [1_000, 5_000, 15_000];

/**
 * How long a socket must stay connected before its retries count as paid off.
 * The gateways answer the handshake first and check the ticket second, so a
 * refused socket still sees `connect` before it is turned away: `connect` alone
 * proves nothing.
 */
const STABLE_MS = 10_000;

/** socket.io's reason when the server closed the socket on purpose. */
const SERVER_CLOSED = "io server disconnect";

/**
 * The gateways authenticate at handshake time, off a short-lived ticket, and the
 * server ends a socket itself in two cases: the ticket was refused (it says
 * `unauthorized` first), or the account's sign-in changed while the socket was
 * open (signed out elsewhere, a new password, a new role or manager). socket.io
 * never reconnects by itself after a server-side close, so left alone the socket
 * stays dead and live updates silently stop until the page is reloaded.
 *
 * So: drop the cached ticket and connect again. socket.io asks for auth on the
 * next attempt, which mints a fresh ticket. If the session behind that call is
 * really gone, the API client's own handling takes the person to sign-in.
 *
 * Bounded on purpose. Retrying with no cap turns a handshake that can never
 * authenticate into an unthrottled loop, refused, new ticket, connect, refused,
 * as fast as the network allows. That is what put about 12,000 refresh rows an
 * hour on one signed-in manager, and the ticket endpoint is rate limited to
 * 30 a minute. Only staying connected for a while resets the count, so a ticket
 * that merely expired recovers every time, and a socket that cannot stay
 * connected gives up after three tries until the page is reloaded.
 */
export function attachSocketReauth(socket: Socket): void {
  let attempts = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let stable: ReturnType<typeof setTimeout> | null = null;

  const clear = (timer: ReturnType<typeof setTimeout> | null) => {
    if (timer) clearTimeout(timer);
    return null;
  };

  const schedule = () => {
    if (retry) return; // a retry is already pending
    if (attempts >= MAX_ATTEMPTS) return; // give up quietly; a reload starts over

    const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
    attempts += 1;

    retry = setTimeout(() => {
      retry = null;
      // Minting the replacement is socket.io's job, through the `auth` callback
      // on the next attempt. If the cookie behind that call has itself expired,
      // the API client refreshes and retries it; if the session is gone it goes
      // to sign-in. Either way there is nothing to await here.
      clearSocketTicket();
      if (!socket.connected) socket.connect();
    }, delay);
  };

  socket.on("connect", () => {
    stable = clear(stable);
    stable = setTimeout(() => {
      stable = null;
      attempts = 0;
    }, STABLE_MS);
  });

  socket.on("unauthorized", schedule);

  socket.on("disconnect", (reason: string) => {
    stable = clear(stable);
    if (reason === SERVER_CLOSED) {
      // Turned away or ended by the server: come back with a fresh ticket.
      schedule();
      return;
    }
    // Closed by this page (the last user of the socket went away), or a network
    // drop that socket.io reconnects by itself: no retry of ours is wanted.
    if (reason === "io client disconnect") retry = clear(retry);
  });
}
