# Productivity Dashboard — API contract

One endpoint powers the whole dashboard on **both**:
- `/dashboard/me` (self)
- `/dashboard/manager/activity/:userId` (manager viewing a report)

```
GET /api/v1/analytics/:userId?date=YYYY-MM-DD
→ { success, data: DashboardAnalytics }
```
- Manager/admin/self scoped: `:userId` must be one of the caller's reports (else 403).
- `date` optional (defaults to today). All durations in **SECONDS**.
- TS source of truth: `src/features/analytics/types/index.ts`.

Return this exact object:

```jsonc
{
  "date": "2026-07-20",

  // ── Row 1: 5 KPI tiles ───────────────────────────────
  // key MUST be one of: focus | active | score | tasks | sessions
  // value = preformatted display string. deltaPct = % vs yesterday (sign shows ↑/↓).
  // spark = small trend series (any units; ~7–10 points).
  "kpis": [
    { "key": "focus",    "label": "Focus Time",        "value": "4h 32m", "deltaPct": 18, "spark": [12,18,14,22,19,26,24,30,27] },
    { "key": "active",   "label": "Active Time",       "value": "5h 12m", "deltaPct": 12, "spark": [20,24,22,28,26,24,30,29,33] },
    { "key": "score",    "label": "Productivity Score","value": "92%",    "deltaPct": 8,  "spark": [60,66,70,68,74,72,80,86,92] },
    { "key": "tasks",    "label": "Tasks Completed",   "value": "14",     "deltaPct": 27, "spark": [4,6,5,8,7,9,11,12,14] },
    { "key": "sessions", "label": "Focus Sessions",    "value": "8",      "deltaPct": 14, "spark": [3,4,4,5,6,5,7,7,8] }
  ],

  // ── Row 2 ────────────────────────────────────────────
  // Activity Timeline — 24 hourly buckets, seconds per category.
  "timeline": [
    { "hour": "09:00", "activeSec": 2040, "breakSec": 120, "meetingSec": 360, "idleSec": 180, "otherSec": 120 }
  ],
  // Time Distribution donut — center shows totalSec; slice names free-form.
  "distribution": {
    "totalSec": 18720,
    "slices": [
      { "name": "Deep Work",    "seconds": 8424 },
      { "name": "Shallow Work", "seconds": 4680 },
      { "name": "Meetings",     "seconds": 2808 },
      { "name": "Breaks",       "seconds": 1872 },
      { "name": "Others",       "seconds": 936 }
    ]
  },
  // NOTE: Row 2 col 3 is the Screenshots card — it is NOT part of this payload.
  // It calls the existing screenshots endpoint (see below).

  // ── Row 3 ────────────────────────────────────────────
  "categories": [ { "name": "Development", "seconds": 14700 } ],
  "focusSessions": {
    "total": 8,
    "buckets": [ { "name": "> 60 min", "count": 3 }, { "name": "30–60 min", "count": 3 }, { "name": "15–30 min", "count": 2 } ]
  },
  "taskCompletion": { "completed": 14, "total": 18 },

  // ── Row 4 ────────────────────────────────────────────
  // Daily Flow heatmap — 7 days × 24 hours. day: 0=Mon..6=Sun, hour: 0–23, value: 0–1 intensity.
  "dailyFlow": [ { "day": 0, "hour": 9, "value": 0.8 } ],
  // Focus Time Trend — last ~7 days, seconds.
  "focusTrend": [ { "date": "2026-07-14", "seconds": 13200 } ],
  // Online Hours per Day — last ~7 days, seconds (bars + compare-to-average).
  "onlineHours": [ { "date": "2026-07-14", "seconds": 14400 } ],

  // ── Row 5 ────────────────────────────────────────────
  "topApps": [ { "name": "Visual Studio Code", "seconds": 9900 } ],
  "achievements": [
    // icon MUST be: focus | tasks | streak.  tone MUST be: violet | teal | amber.
    { "key": "deep-focus", "title": "Deep Focus", "subtitle": "4+ hours focus", "when": "Today", "icon": "focus", "tone": "violet" }
  ],
  "goals": [
    // unit: "seconds" → shown as duration; "count" → shown as-is. Bar caps at 100%, % can exceed.
    { "name": "Daily Focus Goal (4h)", "current": 16320, "target": 14400, "unit": "seconds" },
    { "name": "Weekly Tasks (18)",     "current": 14,    "target": 18,    "unit": "count" }
  ]
}
```

---

## What already has a data source vs. what's NEW

You can reuse logic from endpoints we already built (see
`docs/manager-activity-route-api.md`). Marked below:

| Field | Reuse from existing | New backend work |
|---|---|---|
| `kpis[active].value` | `activity/daily.activeSec` | format only |
| `kpis[focus].value` | `productivity.focusSec` | format only |
| `kpis[score].value` | `productivity.score` (×10 → %) | format only |
| `kpis[*].deltaPct` | — | **need yesterday's values** to diff |
| `kpis[*].spark` | — | **need a short history series** |
| `kpis[tasks]`, `kpis[sessions]` | — | **need tasks + focus-session tracking** |
| `timeline` | `presence/timeline.buckets` (has work/break/lunch/meeting/idle) | add `active`/`other` split |
| `distribution` | derive from focus/meeting/break/idle | **"Deep vs Shallow Work" needs real classification** |
| `categories` | — | **need project/task time categorization** |
| `focusSessions` | — | **need focus-session tracking** |
| `taskCompletion` | — | **need tasks module** |
| `dailyFlow` | `activity/daily.hourly` is 1 day only | **need 7 days × 24h activity intensity** |
| `focusTrend` | `presence/history.days[].onlineSec` (proxy) or focus per day | prefer real focus per day |
| `onlineHours` | `presence/history.days[].onlineSec` | **direct reuse — already available** |
| `topApps` | `activity/daily.topApps` | **direct reuse — already available** |
| `achievements` | — | **need achievements rules** |
| `goals` | daily focus from `activity/daily.workingBasisSec` | rest need a goals module |

### Summary of genuinely missing data (build these)
1. **Tasks module** → `kpis[tasks]`, `taskCompletion`.
2. **Focus-session tracking** → `kpis[sessions]`, `focusSessions`.
3. **Per-day history** (7d) of score & focus → `weeklyScore`, `focusTrend`, KPI `deltaPct`/`spark`.
4. **Deep vs Shallow work classification** → `distribution`.
5. **Project/task category time** → `categories`.
6. **7-day hourly activity intensity** → `dailyFlow`.
7. **Achievements + Goals rules** → `achievements`, `goals`.

Everything else can be assembled from the endpoints that already exist.

## Screenshots card (Row 2, col 3) — separate endpoint

The Screenshots card does **not** come from the analytics payload. It uses the
existing screenshots API directly (already built), scoped to the same `userId`:

```
GET  /api/v1/screenshots?userId=<id>&from=<startOfToday ISO>&limit=100
     → { userId, total, items: [{ id?, kind, takenAt, url }] }
POST /api/v1/screenshots/capture   { userId }   → 202   // "Capture Screenshot" button
```
- `total` → the "N screenshots today" count.
- `items[].url` (viewable image) + `takenAt` → the thumbnail grid.
- "View All Screenshots" expands the grid in place (no separate route needed).

> Until `GET /api/v1/analytics/:userId` exists, both pages show a friendly
> "Dashboard data isn't available yet" state (no dummy data, no crash). The
> Screenshots card works independently as soon as `/screenshots` returns data.
