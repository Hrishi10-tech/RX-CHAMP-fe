# syntax=docker/dockerfile:1
# Multi-stage build using Next.js standalone output.

# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ---- Builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Both of these must exist during `next build`, not just at runtime:
#   - BACKEND_URL is read inside next.config.mjs `rewrites()`, which Next evaluates
#     at build time and serialises into .next/routes-manifest.json. Setting it later
#     cannot change the baked destination.
#   - NEXT_PUBLIC_* values are inlined into the client bundle at build time.
# Docker hides the host environment from the build unless it is declared as ARG, so
# without these the config fell back to localhost and every /api/* call 500'd.
ARG BACKEND_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV BACKEND_URL=${BACKEND_URL}
ENV NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}

RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
