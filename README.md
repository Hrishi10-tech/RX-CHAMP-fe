# RX Vision portal

The web portal of RX Vision: Next.js 15, React 19, React Query and Tailwind. Super Admins, managers and staff use it in a browser. It has no data of its own: everything comes from the RX Vision API in [`../backend`](../backend/README.md). Version 3.1.0 (tag `v3.1.0`).

Start with the 3.1 documentation set in [`../docs/3.1/`](../docs/3.1/README.md). Deploying: [`docs/3.1/DEPLOY.md`](../docs/3.1/DEPLOY.md) section 8. `ARCHITECTURE.md` in this folder predates 3.x and describes a mock-data demo; use [`docs/3.1/ARCHITECTURE.md`](../docs/3.1/ARCHITECTURE.md) section 3 instead.

## Run locally

1. Start the API on your machine first ([`../backend/README.md`](../backend/README.md), "Run locally"). It listens on `http://localhost:4000`, and its `.env.example` already allows `http://localhost:3000` (`CORS_ORIGINS`).
2. Install and configure:

   ```bash
   cd web-portal
   npm ci --legacy-peer-deps
   cp .env.example .env.local
   ```

   `.env.example` already points at the local API: `BACKEND_URL=http://localhost:4000`, `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`, `NEXT_PUBLIC_BUSINESS_TIMEZONE=Asia/Kolkata`.
3. Start the portal:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`: it sends you to sign in. Use a demo account from [`../backend/README.md`](../backend/README.md) (local databases only).

## Build-time values

Read when the portal is built (`next build`), not when it starts. Changing one needs a rebuild.

| Name | What it is |
|---|---|
| `BACKEND_URL` | The API origin. The portal server proxies `/api/*` to it, so the browser only talks to the portal's own origin (and the sign-in cookie belongs to it). Baked into the route table |
| `NEXT_PUBLIC_SOCKET_URL` | Where the browser opens Socket.IO for live updates, usually the API origin. Empty means the portal's own origin, which needs a websocket proxy to the API |
| `NEXT_PUBLIC_BUSINESS_TIMEZONE` | The API's `APP_TIMEZONE` (default `Asia/Kolkata`). Times are shown in it, whatever the viewer's clock says |

## Tests

| Suite | Command | Result on 14 Oct |
|---|---|---|
| Unit | `npx jest` | 50 suites, 444 tests, all pass |
| Types | `npm run typecheck` | No errors |
| Build | `npm run build` (with the three values) | `Compiled successfully` |

`npm run e2e` (Playwright) runs the projects and tasks tests of the original scaffold. They do not cover RX Vision and are not a release gate. Details: [`docs/3.1/TESTING.md`](../docs/3.1/TESTING.md) section (a).

## Scripts

```bash
npm run dev         # development server on port 3000
npm run build       # production build
npm start           # serve the build on port 3000
npm run typecheck   # tsc --noEmit
npx jest            # unit tests
npm run lint        # next lint
```

## Deploying

Node on a host (`npm ci --legacy-peer-deps`, `npm run build`, then start it the way the server runs it) or Docker (the `Dockerfile` here takes the three values as `--build-arg` and serves on port 3000). The production steps, checks and rollback are in [`docs/3.1/DEPLOY.md`](../docs/3.1/DEPLOY.md) sections 8, 9 and 14.4.
