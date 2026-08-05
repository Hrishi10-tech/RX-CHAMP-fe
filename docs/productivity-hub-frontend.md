# Productivity Hub — frontend ↔ backend contract

Route: `/dashboard/manager/activity/[userId]` (manager/admin/self only).
All responses use the standard envelope `{ success, data }`. Base: `/api/v1`.

The page renders today from **presence history** alone; the panels below degrade
gracefully until their endpoints ship. This doc is the contract to make each
panel fully live.

## ✅ Already live (presence history)

`GET /api/v1/presence/team/:userId/history?days=7`
→ `{ userId, name, email, department, days: [{ date, totals: { onlineSec, breakSec, lunchSec, meetingSec } }] }`

Drives: header, Today tiles (Break/Lunch/Meeting), Online Hours Per Day bars,
and — as a **proxy** — the Focus Trend (`focus ≈ onlineSec − meetingSec`) and
the Productivity gauge (heuristic). These proxies are replaced by the real
endpoints below when available.

## 🔲 To make fully live

### 1. Productivity Score (daily gauge)
`GET /api/v1/productivity/:userId?date=YYYY-MM-DD`
→ `{ date, score /* 0–10 */, focusSec, meetingSec, idleSec }`
Requires agent-side focus/idle tracking + a score formula. Until then the gauge
shows a heuristic derived from presence.

### 2. Activity Timeline (intraday)
`GET /api/v1/presence/team/:userId/timeline?date=YYYY-MM-DD`
→ `{ date, buckets: [{ start /* "HH:mm" */, workSec, breakSec, lunchSec, meetingSec }] }`
30- or 60-min buckets. Until then the card shows an empty state.

### 3. Focus Trend (weekly) — optional upgrade
Add `focusSec` to each day in the history response (or
`GET /api/v1/productivity/:userId/trend?days=7 → [{ date, focusSec }]`).
Currently proxied by `onlineSec − meetingSec`.

### 4. Online Hours "Compare to team average"
Add `teamAvgOnlineSec` per day to the history response (or a sibling endpoint).
Currently the dashed line shows the user's **own** multi-day average.

## 📸 Screenshot Repository

`GET /api/v1/screenshots?userId=&limit=&from=&to=&kind=&q=`
→ `{ userId, total, items: [{ id?, kind: 'AUTO'|'MANUAL', takenAt, url }] }`
`POST /api/v1/screenshots/capture { userId }` → 202

Wired in the UI; still needed on the backend:
- `kind` filter (client-side today; server-side for paging past the first 100).
- `q` — **OCR full-text search**: OCR on upload + text search; ideally return a
  matched `snippet` per item.
- `offset`/cursor pagination (alongside existing `limit`; `total` already returned).
- Export: `GET /screenshots/export?userId=&from=&to=&kind=` → file (or 202 + job).
- Archive: `POST /screenshots/archive { ids: string[] }` + `?includeArchived=`.

Confirm the base path (`/api/v1/screenshots`) and the `from`/`to` format
(assumed ISO-8601 UTC, e.g. `2026-07-15T00:00:00.000Z`).
