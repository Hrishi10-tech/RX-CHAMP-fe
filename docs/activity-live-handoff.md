# Handoff — Live Activity Board (Manager View)

**Status:** Not built yet. This is a build spec for the frontend dev.
**Repo:** `timechamp-frontend` (Next.js App Router, TS, feature-based).

---

## What to build

A **live activity board** on the manager view. One row per team member, showing
what each report is doing *right now* (app + window title + site) plus a status
pill. Polls — no socket.

### Data flow

- Call `GET /api/v1/activity/team/live` **every 30 seconds** (polling, not
  WebSocket). Returns `TeamMemberActivity[]`.
- Row click → open that user's daily detail via
  `GET /api/v1/activity/user/:userId/daily` → `DailyActivity`.

> **Note:** the base client (`@/lib/api`) uses `baseURL: ""`, so all paths must
> include the `/api/v1` prefix, e.g. `/api/v1/activity/team/live`.

### Row layout (per member)

- **Name + department**
- **Status pill** from `status`:
  - `ACTIVE` → 🟢 ACTIVE
  - `IDLE` → 🟡 IDLE
  - `OFFLINE` → ⚪ OFFLINE
- **Using now** (from `current`):
  - Show `app` (e.g. "Visual Studio Code", "WhatsApp") as the primary line.
  - Show `title` as a smaller secondary line **or** a tooltip.
  - If `url` is set, show the site (e.g. `github.com`).
  - If `status === "OFFLINE"`, show `—` for the activity (ignore `current`).
- **Last seen** (optional) from `lastSampleAt`.

---

## Rules for the dev (read these)

- **All time values are in seconds.** Format them client-side (e.g. `4h 12m`).
  There is a `toHours`/`toMinutes` pattern already in
  `features/presence/components/UserActivityView.tsx` you can mirror.
- **Auth is httpOnly cookies.** The shared `apiClient` already sends
  `withCredentials: true` — just use it, don't add headers.
- **Response envelope is `{ success, data, message? }`** (`ApiResponse<T>` from
  `@/lib/api`). Unwrap `data`; throw on `!success` — see any existing
  `features/*/api/*.ts` for the exact pattern.
- **The board carries app name + window title + site only.** There is **no**
  message content and **no** keystroke content in the payload. Do not design UI
  that expects it.
- **Disclosed monitoring:** keep the board clearly visible / labeled. This is
  monitoring the team is informed about, not covert capture.

---

## §1 — Types (inlined; self-contained)

Add these to `features/activity/types/index.ts` (new feature folder). Field
names below are the contract — confirm exact spelling against the backend before
wiring.

```ts
/** Live status of a team member's agent. */
export type ActivityStatus = "ACTIVE" | "IDLE" | "OFFLINE";

/** What a member is doing right now. Null-ish/ignored when OFFLINE. */
export interface CurrentActivity {
  /** Foreground application name, e.g. "Visual Studio Code", "WhatsApp". */
  app: string;
  /** Foreground window title, e.g. "activity.controller.ts — time champ be". */
  title: string;
  /** Browser host only if the foreground app is a browser, e.g. "github.com". */
  url?: string;
}

/** One row on the live board — a member's current activity snapshot. */
export interface TeamMemberActivity {
  userId: string;
  name: string;
  department: string;
  status: ActivityStatus;
  /** Present when status is ACTIVE/IDLE; treat as absent when OFFLINE. */
  current?: CurrentActivity;
  /** ISO timestamp of the last sample received from this member's agent. */
  lastSampleAt?: string;
}

/** Per-category totals for a day, all in SECONDS. */
export interface DailyActivityTotals {
  activeSec: number;
  idleSec: number;
  /** Optional richer buckets if the backend provides them. */
  meetingSec?: number;
  breakSec?: number;
}

/** One application's usage for the day, in SECONDS. */
export interface AppUsage {
  app: string;
  seconds: number;
  /** Optional site breakdown for browsers. */
  url?: string;
}

/** Response of GET /api/v1/activity/user/:userId/daily. */
export interface DailyActivity {
  userId: string;
  name: string;
  department: string;
  /** The day this covers (YYYY-MM-DD). */
  date: string;
  totals: DailyActivityTotals;
  /** Top applications used that day, descending by seconds. */
  apps: AppUsage[];
}
```

> These interfaces are inferred from the spec, not copied from a backend
> contract. Diff them against the API's actual response before shipping and
> adjust names (`current` vs `activity`, `userId` presence, etc.).

---

## Suggested file layout

```
src/features/activity/
  api/
    getTeamLive.ts       // GET /api/v1/activity/team/live  → TeamMemberActivity[]
    getUserDaily.ts      // GET /api/v1/activity/user/:id/daily → DailyActivity
  components/
    LiveActivityBoard.tsx
    StatusPill.tsx
  types/
    index.ts             // the §1 types above
src/app/dashboard/manager/live/page.tsx   // mounts LiveActivityBoard
```

### API helper skeleton (mirror existing `features/*/api` style)

```ts
import { apiClient, type ApiResponse } from "@/lib/api";
import type { TeamMemberActivity } from "@/features/activity/types";

export async function getTeamLive(): Promise<TeamMemberActivity[]> {
  const { data } = await apiClient.get<ApiResponse<TeamMemberActivity[]>>(
    "/api/v1/activity/team/live",
  );
  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to load live activity");
  }
  return data.data;
}
```

### Polling

React Query is already a dependency (`@tanstack/react-query`). Use it:

```ts
const { data } = useQuery({
  queryKey: ["activity", "team", "live"],
  queryFn: getTeamLive,
  refetchInterval: 30_000,       // 30s poll
  refetchIntervalInBackground: false,
});
```

---

## What already exists (don't duplicate)

- `/dashboard/manager` — manager's team **members table**. Its "Status" column
  is **account status** (Active/Invited/Inactive), *not* live active/idle. Do
  not overload it; the live board is a separate view.
- `/dashboard/manager/activity/[userId]` → `UserActivityView`
  (`features/presence`) — **historical** presence (daily online hours,
  break/lunch/meeting tiles, gauge, timeline, screenshots). It calls
  `GET /api/v1/presence/team/:userId/history`. This is aggregated history, *not*
  the real-time app/window feed — the live board is new.

Decide with the team whether the daily-detail row click should route to the
existing `UserActivityView` or to a new daily view fed by
`GET /api/v1/activity/user/:userId/daily`.
