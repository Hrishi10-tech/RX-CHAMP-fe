/**
 * The portal's Content-Security-Policy (review S-4, guide: security).
 *
 * Scripts run only from this origin and only with the per-request nonce the framework stamps on
 * its own tags ('strict-dynamic' lets those load their chunks); no inline script without it, no
 * eval. Styles allow inline because React writes style attributes (bar widths, avatar sizes) and
 * Tailwind's sheet is same-origin. Pictures: this origin, data and blob URLs (PDF export, the
 * avatar picker) and https (screenshots are presigned links to storage). The page may talk to
 * this origin (the /api proxy) and to the socket origin, and may be framed by nobody else.
 */
export function contentSecurityPolicy(
  nonce: string,
  opts: { socketUrl?: string; dev?: boolean } = {},
): string {
  const connect = ["'self'"];
  if (opts.socketUrl) {
    try {
      const u = new URL(opts.socketUrl);
      connect.push(u.origin, `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`);
    } catch {
      // Not a URL: same origin only.
    }
  }
  if (opts.dev) connect.push("ws:", "http://localhost:*");
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(opts.dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connect,
    "worker-src": ["'self'", "blob:"],
    "frame-ancestors": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/** 16 random bytes, base64: a fresh nonce for one response. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
