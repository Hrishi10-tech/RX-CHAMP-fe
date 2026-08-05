# Time Champ — Frontend Demo (Throwaway)

> ⚠️ **This is a demo build with mock data.** It exists so the manager can see
> the dashboard vision in real UI while the backend is still being built. The
> whole `frontend-demo/` folder is safe to delete once the real `frontend/`
> is connected to the real backend.

## Quick start

```bash
cd frontend-demo
npm install
npm run dev
```

Open <http://localhost:3000> → you'll be redirected to the login page.

**Demo login:**
- Email: `admin@timechamp.test`
- Password: `admin123`

## What's in this demo

| Page | Path | Notes |
|---|---|---|
| Login | `/login` | Super-admin only. Hardcoded credentials. |
| Dashboard | `/admin/dashboard` | 4 KPI cards + recent-activity table |
| User listing | `/admin/users` | The "users tab" your manager described — sortable, searchable, filterable by department |
| User detail | `/admin/users/[id]` | Click any user → see their day: total/active/idle/productive + top apps + top websites + timeline |

Disabled sidebar links (Departments / Reports / Screenshots / Settings) are
the planned pages — they'll wire up when the backend exists.

## What's mock vs what's real

| Layer | Status |
|---|---|
| UI components, layout, styling | **Real** — copy-paste into `frontend/` later |
| Routing, role gating | **Real** — uses the locked route-group structure |
| Auth | Mock — single hardcoded super admin |
| Data | Mock — see `src/lib/mockData.ts` |

When the backend ships, only **2 files change**:
1. `src/lib/demoAuth.ts` → replace with real JWT auth
2. `src/lib/mockData.ts` → replace with API calls to the real endpoints

Everything else (pages, layouts, components) is the production code.

## Deletion / cleanup

When the real `frontend/` is up:

```bash
rm -rf frontend-demo
```

Done. Nothing else in the project touches this folder.
