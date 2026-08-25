import { apiClient } from "@/lib/api";

interface Ticket {
  token: string;
  /** Epoch ms. Derived from `expiresIn`, which the endpoint reports in seconds. */
  expiresAt: number;
}

/**
 * Treat a ticket as spent this long before it actually expires, so one can't
 * lapse between being handed to socket.io and the handshake reaching the server.
 */
const EXPIRY_MARGIN_MS = 30_000;

/** Used only if the endpoint ever omits `expiresIn`; the server issues 300s. */
const FALLBACK_TTL_SEC = 300;

let cached: Ticket | null = null;
let inFlight: Promise<Ticket> | null = null;

async function fetchTicket(): Promise<Ticket> {
  // Relative URL on purpose: this goes through the Next `/api/*` proxy, which
  // makes it same-origin, which is the only reason the auth cookie is sent. A
  // 401 here is handled by the client interceptor, which refreshes and retries.
  const { data } = await apiClient.get<{
    success: boolean;
    data?: { token: string; expiresIn?: number };
  }>("/api/v1/auth/socket-ticket");

  const token = data.data?.token;
  if (!token) throw new Error("socket-ticket response carried no token");

  const ttl = data.data?.expiresIn ?? FALLBACK_TTL_SEC;
  return { token, expiresAt: Date.now() + ttl * 1000 };
}

/**
 * A short-lived token that authenticates a socket handshake. The gateways can't
 * read the auth cookie: it belongs to the frontend's own origin (the API is
 * proxied), while the sockets connect to the backend host directly, so the
 * browser never sends it there. This is fetched over the proxied API instead,
 * where the cookie does apply, and passed in the handshake.
 *
 * Deliberately not usable as an API credential — the server rejects `typ:
 * "socket"` on the HTTP path — because unlike the cookie this is readable by
 * JavaScript.
 */
export function getSocketTicket(): Promise<string> {
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return Promise.resolve(cached.token);
  }

  // Single-flight. Four namespaces connect at once and all reconnect together
  // after a dropout; without this each one would spend a request against the
  // endpoint's 30/min cap on every reconnect.
  inFlight ??= fetchTicket()
    .then((ticket) => {
      cached = ticket;
      return ticket;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight.then((ticket) => ticket.token);
}

/**
 * Drops the cached ticket so the next handshake fetches a fresh one. Called when
 * a gateway rejects one, since reconnecting with the same rejected token would
 * just be refused again.
 */
export function clearSocketTicket(): void {
  cached = null;
}

/**
 * socket.io calls this before every connection attempt, reconnects included, so
 * each attempt carries a current ticket without anything having to await one.
 *
 * A failure hands over an empty payload rather than blocking the handshake: the
 * gateways still accept the cookie, which is what local dev runs on.
 */
export function socketAuth(cb: (payload: { token?: string }) => void): void {
  void getSocketTicket()
    .then((token) => cb({ token }))
    .catch(() => cb({}));
}
