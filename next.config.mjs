/**
 * Where `/api/*` is forwarded, and where the browser opens its sockets.
 *
 * `BACKEND_URL` / `NEXT_PUBLIC_SOCKET_URL` still win when set, which is how a
 * deployment should configure this. These are the fallbacks for when they are not:
 * every `.env*` file is gitignored, so a deployed build that misses them previously
 * fell through to `localhost:4000` and every API call returned 500.
 */
const PRODUCTION_BACKEND = "https://rx-champ-be-production.up.railway.app";
const LOCAL_BACKEND = "http://localhost:4000";

const defaultBackend = process.env.NODE_ENV === "production" ? PRODUCTION_BACKEND : LOCAL_BACKEND;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal server bundle for Docker images.
  output: "standalone",
  poweredByHeader: false,
  // Sockets are opened by the browser straight at the backend, so unlike `/api/*`
  // they cannot go through the rewrite above and need the real origin at build time.
  env: {
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? defaultBackend,
  },
  images: {
    remotePatterns: [
      // Allow avatars / assets served from the backend host.
      { protocol: "https", hostname: "**" },
    ],
  },
  // Proxy /api/* to the backend so the browser makes same-origin requests
  // (avoids CORS in the browser; the forward happens server-side).
  async rewrites() {
    // Server-only var (NOT NEXT_PUBLIC_) so the browser keeps using relative
    // URLs and goes through this proxy instead of hitting the backend directly.
    const backend = (process.env.BACKEND_URL ?? defaultBackend).replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  // Security headers applied to every route.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
