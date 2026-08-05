# Manager Activity route — API contract

Route: `/dashboard/manager/activity/[userId]?name=<display name>`
Component: `src/features/presence/components/UserActivityView.tsx`
Access: manager (the `userId` must be one of the caller's reports) / admin / self.
Envelope: every endpoint returns `{ success: boolean, data: T, message?: string }`.
All durations are in **seconds**. Base path prefix: `/api/v1`.

The page already consumes all of the below from the live API — no mock data.
Sections whose endpoint 404s / errors degrade gracefully (fallback or empty
state), so nothing crashes if a piece isn't ready yet.

---

## 1. Presence history — REQUIRED (drives the header, tiles, bar chart)
`GET /api/v1/presence/team/:userId/history?days=7`
```json
{ "userId": "…", "name": "lakshman test", "email": "…", "department": "…",
  "days": [
    { "date": "2026-07-20",
      "totals": { "onlineSec": 0, "breakSec": 0, "lunchSec": 0,
                  "meetingSec": 0, "idleSec": 0 } }
  ] }
```
- `name` / `email` / `department` → header.
- `days[].date` → date picker + "Online Hours Per Day" bars.
- `totals` → Break / Lunch / Meeting tiles; fallback Active/Idle; Focus Trend
  proxy (`onlineSec − meetingSec`).
- `idleSec` is optional here (falls back to 0).

## 2. Daily activity — REQUIRED for **TOP APPS** + Active/Idle
`GET /api/v1/activity/user/:userId/daily?date=YYYY-MM-DD`
```json
{ "date": "2026-07-20",
  "activeSec": 12345, "idleSec": 6789,
  "workingBasisSec": 32400, "extraSec": 0, "remainingSec": 20055,
  "clockedOut": false, "clockInAt": "ISO", "clockOutAt": "ISO",
  "topApps":     [{ "name": "Visual Studio Code", "seconds": 9900 }],
  "topWebsites": [{ "name": "github.com",         "seconds": 5400 }],
  "hourly":      [{ "hour": 9, "activeSec": 3000, "idleSec": 600 }] }
```
- **`topApps: [{ name, seconds }]`** → the **Top Apps** card. ← the key field.
- `topWebsites: [{ name, seconds }]` → the "Top Websites" sub-list (optional;
  section hidden if empty).
- `activeSec` / `idleSec` → Active/Idle tiles (preferred over presence) + the
  Active/Idle donut.
- `hourly` is accepted by the type but not currently rendered (safe to omit).

> If **Top Apps is empty on the page**, this endpoint is the one to check —
> confirm it returns `topApps` with `name` + `seconds` for this `userId`+`date`.

## 3. Current activity — live status + "Currently Using"
`GET /api/v1/activity/user/:userId/current`
```json
{ "status": "ACTIVE" | "IDLE" | "OFFLINE",
  "app": "Google Chrome", "title": "…", "url": "github.com",
  "idle": false, "lastSampleAt": "ISO", "staleSec": 42 }
```
- Drives the status badge + "Currently Using" panel + recent-apps trail.
- `app`/`title`/`url` may be `null` when OFFLINE (>150s since last sample).
- Polled every 30s; also updated live via the `/activity` socket (`activity:update`).

## 4. Screenshots — REQUIRED for **SCREENSHOT REPOSITORY**
`GET /api/v1/screenshots?userId=<id>&limit=100&from=&to=&kind=&q=`
```json
{ "userId": "…", "total": 12,
  "items": [
    { "id": "…", "kind": "AUTO" | "MANUAL",
      "takenAt": "ISO", "url": "https://…presigned…" }
  ] }
```
- **`items[].url`** must be a viewable image URL (presigned S3 is fine; treated
  as ephemeral). `kind`, `takenAt` power the badge + caption.
- `total` → the count pill. `kind`/time filters are applied client-side;
  `q` (OCR full-text) is passed to the backend if implemented.

On-demand capture (the "Capture now" button):
`POST /api/v1/screenshots/capture  { "userId": "…" }`  → `202`
- Backend signals the agent to capture (kind `MANUAL`); the new shot appears in
  the list a few seconds later (the UI polls for it).

> If **Screenshots is empty**, check that `GET /screenshots?userId=` returns
> `items[]` with working `url`s for this user.

## 5. Daily productivity — OPTIONAL (gauge; falls back to a heuristic)
`GET /api/v1/productivity/:userId?date=YYYY-MM-DD`
```json
{ "date": "…", "score": 8.2, "focusSec": 0, "meetingSec": 0, "idleSec": 0 }
```
`score` is 0–10. If this 404s, the gauge is derived from presence totals.

## 6. Intraday timeline — OPTIONAL (Activity Timeline chart; empty state otherwise)
`GET /api/v1/presence/team/:userId/timeline?date=YYYY-MM-DD`
```json
{ "date": "…",
  "buckets": [{ "start": "09:00", "workSec": 0, "breakSec": 0,
                "lunchSec": 0, "meetingSec": 0, "idleSec": 0 }] }
```

## 7. Live socket — OPTIONAL (keeps status/app/totals live)
Namespace `/activity`, event `activity:update` (manager room), filtered to the
viewed `userId`:
```json
{ "userId": "…", "status": "ACTIVE", "app": "…", "title": "…", "url": "…",
  "lastSampleAt": "ISO", "activeSec": 0, "idleSec": 0 }
```

---

## Quick status for THIS user (e5f27eec…, "lakshman test")
| Section | Endpoint | Field the section needs |
|---|---|---|
| **Top Apps** | `GET /activity/user/:id/daily?date=` | `topApps[].name`, `topApps[].seconds` |
| **Screenshots** | `GET /screenshots?userId=` | `items[].url`, `kind`, `takenAt` |
| Header / tiles | `GET /presence/team/:id/history` | `name`, `email`, `department`, `days[].totals` |
| Live badge | `GET /activity/user/:id/current` | `status`, `app`, `title` |
