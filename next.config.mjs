/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output produces a minimal server bundle for Docker images.
  output: "standalone",
  poweredByHeader: false,
  // Review S-4: the image optimiser fetches nothing from other hosts. Avatars are same-origin
  // paths drawn unoptimised, the logo is a local file, screenshots are plain <img> links.
  images: {
    remotePatterns: [],
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
          // Review S-4. Browsers ignore this header over http, so local runs are unaffected.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
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
