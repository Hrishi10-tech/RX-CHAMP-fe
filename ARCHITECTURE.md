# Time Champ — Enterprise Frontend Architecture

Production-grade Next.js (App Router) frontend for a business-management system,
built with a **feature-based, clean architecture** designed to scale to 500+
users, role-based dashboards, large data tables, real-time updates and complex
forms.

> The legacy demo (`/login`, `/admin`, `/manager`, `/me`, in-app `/api/*` mock
> routes) is **preserved and untouched**. The enterprise app is mounted at
> non-colliding routes (`/auth/*`, `/dashboard`, `/users`, `/projects`,
> `/tasks`, `/reports`, `/settings`) and talks to an **external backend** via
> `NEXT_PUBLIC_API_URL`.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui-style components (Radix primitives, CVA) |
| Icons / animation | lucide-react / framer-motion |
| Forms / validation | React Hook Form + Zod |
| Server state | TanStack React Query |
| Global state | Redux Toolkit (auth, ui, notifications only) |
| HTTP | Axios (interceptors, auto refresh, error normalization) |
| Tables | TanStack Table |
| Charts | Recharts |
| Dates | date-fns |
| Realtime | socket.io-client |
| Theme | next-themes |
| Testing | Jest + React Testing Library + Playwright |
| Quality | ESLint + Prettier + Husky + lint-staged |

**State boundary:** Redux holds only client/session/UI state (auth, permissions,
theme, sidebar, modals, notifications). All server data — fetching, caching,
pagination, infinite scroll, optimistic updates — is owned by React Query.

## Structure

```
src/
  app/
    auth/{login,register}/        # enterprise auth (URLs: /auth/login, /auth/register)
    (dashboard)/                  # authenticated shell (route group)
      dashboard|users|projects|tasks|reports|settings/
      layout.tsx error.tsx loading.tsx
    admin|manager|me/ login/ api/ # legacy demo (preserved)
  components/
    ui/                           # Button, Input, Select, Dialog(Modal), Sheet(Drawer),
                                  #   Table, Pagination, Card, Badge, Dropdown, Avatar…
    data-table/DataTable.tsx      # TanStack table: sort/search/visibility/export
    common/                       # ErrorBoundary, EmptyState, LoadingState, ThemeToggle
    layout/                       # DashboardLayout, Sidebar, Navbar, Breadcrumb, UserMenu
  features/
    auth/        { api, components, hooks, store, validation }
    users/       { api, components, hooks, validation }
    projects/    { api, components, hooks, validation }
    tasks/       { api, components, hooks, validation }
    dashboard/   { api, components, hooks }
    notifications/ { api, components, hooks, store }
  store/         index.ts (root), slices/uiSlice, hooks.ts (typed)
  providers/     AppProviders, ReduxProvider, QueryProvider, ThemeProvider
  lib/           axios.ts, queryClient.ts, export.ts, utils.ts
  hooks/         useDebounce, useMediaQuery
  types/         common, auth, user, project, task, report, notification
  constants/     roles, permissions, routes, query-keys
  config/        env.ts (Zod-validated), site.ts
  utils/         date.ts, format.ts
  middleware.ts  # edge auth redirect (enterprise routes only)
  test/          test-utils.tsx
e2e/             auth.spec.ts, workflow.spec.ts
```

## Authentication & RBAC

- **Flow:** access + refresh tokens. HttpOnly cookies are preferred
  (`axios` uses `withCredentials`); a bearer-token fallback is kept in memory
  (never `localStorage`, to limit XSS exposure).
- **Auto refresh:** the axios response interceptor transparently calls
  `/auth/refresh` on `401`, queues concurrent requests, retries once, and logs
  out on failure.
- **Guards:** `middleware.ts` does the fast edge redirect; `<ProtectedRoute>`
  enforces session + role/permission client-side; `<AuthProvider>` hydrates the
  session from `/auth/me`.
- **Permissions:** roles `SUPER_ADMIN | ADMIN | MANAGER | USER` map to
  fine-grained permissions in `constants/permissions.ts`. Gate UI with
  `usePermission()` or:

  ```tsx
  <PermissionGuard permission="CREATE_TASK">
    <CreateButton />
  </PermissionGuard>
  ```

  The backend remains the source of truth and must re-check every permission.

## Data layer

- Query keys are centralized in `constants/query-keys.ts` for safe invalidation.
- Lists use server pagination + `keepPreviousData`; tasks include an
  infinite-scroll hook and an **optimistic** status-update mutation.
- Every API module (`*.api.ts`) is a thin typed wrapper over the axios instance.

## Getting started

```bash
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL to your backend
npm install --legacy-peer-deps  # React 19 peer ranges
npm run dev                     # http://localhost:3000/auth/login
```

Scripts: `dev build start lint lint:fix format typecheck test test:watch e2e`.

To enable the Husky pre-commit hook, run `git init` then `npm run prepare`.

## Deployment

- `Dockerfile` builds the Next.js **standalone** output (multi-stage, non-root).
- Per-environment files: `.env.development`, `.env.staging`, `.env.production`.
- Security headers are set in `next.config.mjs`; CSRF via double-submit
  `X-XSRF-TOKEN`; secure cookies expected from the backend.

## Backend contract (expected endpoints)

`POST /auth/login|register|logout|refresh`, `GET /auth/me`,
`GET/POST/PATCH/DELETE /users|projects|tasks` (paginated list shape
`{ data, meta:{ page, pageSize, total, totalPages } }`),
`PATCH /tasks/:id/assign`, `GET /reports/dashboard?role=`,
`GET /notifications` + `socket.io` `notification` events.
