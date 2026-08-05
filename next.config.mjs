/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal server bundle for Docker images.
  output: "standalone",
  poweredByHeader: false,
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
    const backend = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(
      /\/$/,
      "",
    );
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
