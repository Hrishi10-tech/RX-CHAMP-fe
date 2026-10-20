#!/usr/bin/env node
/**
 * A small mock of the 4.0 API (docs/4.0/SPEC.md section 5) for looking at the
 * portal without a backend. Development only: never shipped, never deployed.
 *
 *   node scripts/mock-api/server.mjs 5151
 *   BACKEND_URL=http://127.0.0.1:5151 npm run build && npm start
 *
 * Sign in with any password as:
 *   sa@rxv.test        Super Admin
 *   admin@rxv.test     Admin of Northwind Labs
 *   manager@rxv.test   Manager (all three grants)
 *   viewer@rxv.test    Manager with the screenshots grant only
 *   nogrant@rxv.test   Manager without grants
 *   staff@rxv.test     Staff (refused by the portal)
 */
import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.argv[2] ?? process.env.PORT ?? 5151);
const TZ_OFFSET_MIN = 330; // Asia/Kolkata

// ---- clock ---------------------------------------------------------------------------
function istNow() {
  return new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
}
function todayKey() {
  return istNow().toISOString().slice(0, 10);
}
/** An ISO instant for "HH:MM" business time on `day`. */
function at(hm, day = todayKey()) {
  const [h, m] = hm.split(":").map(Number);
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, m) - TZ_OFFSET_MIN * 60_000).toISOString();
}
function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekday(key) {
  const d = new Date(`${key}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

// ---- people ---------------------------------------------------------------------------
const ORGS = [
  { id: "org-1", name: "Northwind Labs", createdAt: "2025-02-11T05:00:00.000Z" },
  { id: "org-2", name: "Bluewater Clinics", createdAt: "2025-06-03T05:00:00.000Z" },
  { id: "org-3", name: "Kestrel Devices", createdAt: "2026-09-28T05:00:00.000Z" },
];

const DEPARTMENTS = [
  { id: "d-hw", name: "Hardware", icon: "circuit-board" },
  { id: "d-fw", name: "Firmware", icon: "cpu" },
  { id: "d-qa", name: "Quality Assurance", icon: "badge-check" },
  { id: "d-ra", name: "Regulatory Affairs", icon: "scale" },
  { id: "d-sales", name: "Sales", icon: "bar-chart" },
  { id: "d-cs", name: "Customer Support", icon: "headphones" },
];

const ACCOUNTS = {
  "sa@rxv.test": { id: "u-sa", name: "Priya Raman", role: "SUPER_ADMIN", org: null },
  "admin@rxv.test": { id: "u-admin", name: "Arjun Mehta", role: "ADMIN", org: "org-1" },
  "manager@rxv.test": {
    id: "u-m1",
    name: "Kavya Nair",
    role: "MANAGER",
    org: "org-1",
    departments: ["d-hw", "d-fw"],
    grants: { screenshots: true, timeline: true, activity: true },
  },
  "viewer@rxv.test": {
    id: "u-m2",
    name: "Rohan Iyer",
    role: "MANAGER",
    org: "org-1",
    departments: ["d-sales"],
    grants: { screenshots: true, timeline: false, activity: false },
  },
  "nogrant@rxv.test": {
    id: "u-m3",
    name: "Meera Pillai",
    role: "MANAGER",
    org: "org-1",
    departments: ["d-qa"],
    grants: { screenshots: false, timeline: false, activity: false },
  },
  "staff@rxv.test": { id: "u-s1", name: "Asha Kumar", role: "USER", org: "org-1", department: "d-hw" },
};

const FIRST = ["Asha", "Vikram", "Divya", "Karthik", "Sneha", "Rahul", "Ananya", "Suresh", "Lakshmi", "Nikhil", "Pooja", "Ganesh", "Ishita", "Manoj", "Revathi", "Sanjay", "Tara", "Vivek", "Nandini", "Harish", "Swathi", "Deepak"];
const LAST = ["Kumar", "Rao", "Menon", "Shah", "Reddy", "Joshi", "Das", "Gupta", "Krishnan", "Varma", "Pillai", "Bose"];
const DESIGNATIONS = {
  "d-hw": ["Hardware engineer", "PCB designer", "Test technician"],
  "d-fw": ["Firmware engineer", "Embedded developer"],
  "d-qa": ["QA engineer", "Validation lead"],
  "d-ra": ["Regulatory specialist"],
  "d-sales": ["Sales executive", "Key account manager"],
  "d-cs": ["Support executive", "Support lead"],
};
const STATUSES = ["WORKING", "WORKING", "WORKING", "BREAK", "MEETING", "AWAY", "WORKING", "NOT_STARTED", "WORKING", "ENDED", "WORKING", "BREAK"];

const STAFF = Array.from({ length: 22 }, (_, i) => {
  const dept = DEPARTMENTS[i % DEPARTMENTS.length];
  const status = STATUSES[i % STATUSES.length];
  const start = `09:${String((i * 7) % 50).padStart(2, "0")}`;
  return {
    id: i === 0 ? "u-s1" : `u-${i + 10}`,
    name: i === 0 ? "Asha Kumar" : `${FIRST[i % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`,
    email: i === 0 ? "staff@rxv.test" : `${FIRST[i % FIRST.length].toLowerCase()}.${LAST[(i * 5) % LAST.length].toLowerCase()}@northwind.test`,
    role: "USER",
    department: dept,
    designation: DESIGNATIONS[dept.id][i % DESIGNATIONS[dept.id].length],
    status,
    start,
    focusSec: status === "NOT_STARTED" ? 0 : 3600 * 2 + ((i * 1777) % 10800),
    online: status !== "NOT_STARTED" && status !== "ENDED",
    screenshotsEnabled: i % 6 !== 3,
    idleEnabled: i % 7 === 2 ? true : i % 7 === 5 ? false : null,
    agentStatus: status === "NOT_STARTED" ? (i % 2 ? "NOT_SIGNED_IN" : "OFFLINE") : status === "ENDED" ? "DAY_ENDED" : "LIVE",
    createdAt: `2026-0${(i % 9) + 1}-1${i % 9}T05:00:00.000Z`,
  };
});

const MANAGERS = [
  { ...ACCOUNTS["manager@rxv.test"], email: "manager@rxv.test" },
  { ...ACCOUNTS["viewer@rxv.test"], email: "viewer@rxv.test" },
  { ...ACCOUNTS["nogrant@rxv.test"], email: "nogrant@rxv.test" },
];

function deptById(id) {
  return DEPARTMENTS.find((d) => d.id === id) ?? null;
}

// ---- state that pages change ------------------------------------------------------------
const calendarOverrides = new Map([
  ["2026-10-20", { date: "2026-10-20", isWorking: false, label: "Diwali" }],
  ["2026-11-09", { date: "2026-11-09", isWorking: false, label: "Founders' day" }],
  ["2026-12-25", { date: "2026-12-25", isWorking: false, label: "Christmas" }],
  ["2026-08-15", { date: "2026-08-15", isWorking: false, label: "Independence Day" }],
  ["2026-11-15", { date: "2026-11-15", isWorking: true, label: "Make-up day" }],
]);
let weekPattern = [1, 2, 3, 4, 5, 6];
const signOutKeys = [
  {
    id: "k-1",
    scope: "USERS",
    users: [{ id: "u-11", name: STAFF[1].name }],
    departments: [],
    createdBy: { id: "u-admin", name: "Arjun Mehta" },
    createdAt: at("10:12"),
    expiresAt: new Date(Date.parse(at("10:12")) + 24 * 3600_000).toISOString(),
    revokedAt: null,
    uses: 0,
  },
  {
    id: "k-2",
    scope: "DEPARTMENTS",
    users: [],
    departments: [{ id: "d-sales", name: "Sales" }],
    createdBy: { id: "u-admin", name: "Arjun Mehta" },
    createdAt: at("16:40", addDays(todayKey(), -3)),
    expiresAt: at("16:40", addDays(todayKey(), -2)),
    revokedAt: null,
    uses: 3,
  },
  {
    id: "k-3",
    scope: "ORG",
    users: [],
    departments: [],
    createdBy: { id: "u-sa", name: "Priya Raman" },
    createdAt: at("09:00", addDays(todayKey(), -9)),
    expiresAt: at("09:00", addDays(todayKey(), -8)),
    revokedAt: at("09:30", addDays(todayKey(), -9)),
    uses: 1,
  },
];
const idle = {
  defaultEnabled: true,
  defaultMinutes: 5,
  reasons: [
    { key: "BREAK", label: "Took a break", kind: "BREAK", builtIn: true },
    { key: "THINKING", label: "Thinking", kind: "THINKING", builtIn: true },
    { key: "MEETING", label: "Short meeting", kind: "MEETING", builtIn: true },
    { key: "HARDWARE", label: "Working on hardware", kind: "HARDWARE", builtIn: true },
    { key: "OTHER", label: "Other work", kind: "OTHER", builtIn: true },
    { key: "CUSTOM_SITE_VISIT", label: "Site visit", kind: "CUSTOM", builtIn: false },
  ],
  departments: [
    { departmentId: "d-hw", enabled: true, minutes: 10, reasonKeys: ["BREAK", "THINKING", "MEETING", "HARDWARE", "OTHER"] },
    { departmentId: "d-sales", enabled: false, minutes: null, reasonKeys: null },
  ],
};
let settings = {
  approvalSlaHours: 48,
  blockManagerEndDayWhenOverdue: true,
  fullDayPct: 80,
  halfDayPct: 40,
  lateStartGraceMin: 10,
  quietHourActiveMin: 20,
  quietHoursFlag: 4,
  autoCloseAfterShiftEndMin: 240,
  breakBufferMin: 10,
};

// ---- helpers ------------------------------------------------------------------------------
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}
const ok = (res, data, meta) => send(res, 200, { success: true, data, ...(meta ? { meta } : {}) });
const fail = (res, status, code, message) =>
  send(res, status, { success: false, message, error: { code, message } });

function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie ?? "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );
}

function who(req) {
  const email = cookies(req).mock_user;
  return email && ACCOUNTS[email] ? { email, ...ACCOUNTS[email] } : null;
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function scopeStaff(me) {
  if (me.role === "MANAGER") return STAFF.filter((s) => (me.departments ?? []).includes(s.department.id));
  return STAFF;
}

function teamPerson(s) {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    designation: s.designation,
    department: s.department,
    status: s.status,
    since:
      s.status === "NOT_STARTED"
        ? null
        : s.status === "WORKING"
          ? at(s.start)
          : s.status === "ENDED"
            ? at("17:45")
            : at("11:20"),
    startedAt: s.status === "NOT_STARTED" ? null : at(s.start),
    focusSec: s.focusSec,
    targetSec: 7.5 * 3600,
    online: s.online,
    agentVersion: s.online ? "4.0.0" : "3.1.2",
    lateStartMin: s.start > "09:40" && s.status !== "NOT_STARTED" ? 12 : 0,
  };
}

/** "9:05 AM" for an ISO instant, as the backend sends it beside `in` / `out`. */
function twelve(iso) {
  if (!iso) return null;
  const d = new Date(Date.parse(iso) + TZ_OFFSET_MIN * 60_000);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

function orgView(org) {
  const isMain = org.id === "org-1";
  const staff = isMain ? STAFF.length : org.id === "org-2" ? 9 : 0;
  return {
    ...org,
    admin: isMain
      ? { id: "u-admin", name: "Arjun Mehta", email: "admin@rxv.test" }
      : org.id === "org-2"
        ? { id: "u-admin2", name: "Fatima Sheikh", email: "fatima@bluewater.test" }
        : null,
    counts: { staff, managers: isMain ? 3 : org.id === "org-2" ? 2 : 0, departments: isMain ? 6 : org.id === "org-2" ? 3 : 0 },
    today: isMain
      ? { started: 19, working: 11, onBreak: 2, notStarted: 3 }
      : org.id === "org-2"
        ? { started: 6, working: 5, onBreak: 1, notStarted: 3 }
        : { started: 0, working: 0, onBreak: 0, notStarted: 0 },
  };
}

function userRow(s) {
  return {
    id: s.id,
    name: s.name,
    firstName: s.name.split(" ")[0],
    lastName: s.name.split(" ").slice(1).join(" "),
    email: s.email,
    role: s.role,
    designation: s.designation,
    department: s.department,
    departmentId: s.department?.id ?? null,
    status: s.id === "u-15" ? "DISABLED" : "ACTIVE",
    screenshotsEnabled: s.screenshotsEnabled,
    idleEnabled: s.idleEnabled,
    idleMinutes: null,
    agentStatus: s.agentStatus,
    agentLastSeenAt: at("12:40"),
    shiftId: null,
    createdAt: s.createdAt,
  };
}

function managerRow(m) {
  return {
    id: m.id,
    name: m.name,
    firstName: m.name.split(" ")[0],
    lastName: m.name.split(" ").slice(1).join(" "),
    email: m.email,
    role: "MANAGER",
    designation: "Team lead",
    departments: m.departments.map(deptById),
    departmentIds: m.departments,
    grants: m.grants,
    status: "ACTIVE",
    screenshotsEnabled: true,
    idleEnabled: null,
    agentStatus: "LIVE",
    agentLastSeenAt: at("12:50"),
    shiftId: "sh-general",
    createdAt: "2025-03-02T05:00:00.000Z",
  };
}

function hourly() {
  const out = [];
  // A whole working day, whatever time the mock runs at.
  for (let h = 8; h <= 18; h++) {
    out.push({ hour: h, working: h < 9 ? 3 : h === 13 ? 9 : Math.min(17, 10 + ((h * 3) % 8)) });
  }
  return out;
}

function shifts() {
  const mk = (id, name, start, end, isDefault) => ({
    id,
    companyId: "org-1",
    name,
    start,
    end,
    overnight: false,
    workDays: [1, 2, 3, 4, 5, 6],
    isDefault,
    rules: { ringLeadMin: 5, ringDurationMin: 10, ringSound: true, reasonOnEarly: true, reasonOnLate: true, reasonMinChars: 10, overrunReason: false, overrunGraceMin: 2 },
    breaks: [
      { kind: "MORNING", label: "Morning break", enabled: true, startTime: "11:00", durationMin: 15, windowBeforeMin: 15, windowAfterMin: 30, allowSkip: true, endTime: "11:15", windowOpen: "10:45", windowClose: "11:30", ringStart: "10:55", ringEnd: "11:05" },
      { kind: "LUNCH", label: "Lunch", enabled: true, startTime: "13:00", durationMin: 45, windowBeforeMin: 30, windowAfterMin: 30, allowSkip: false, endTime: "13:45", windowOpen: "12:30", windowClose: "13:30", ringStart: "12:55", ringEnd: "13:05" },
      { kind: "EVENING", label: "Evening break", enabled: true, startTime: "16:30", durationMin: 15, windowBeforeMin: 15, windowAfterMin: 30, allowSkip: true, endTime: "16:45", windowOpen: "16:15", windowClose: "17:00", ringStart: "16:25", ringEnd: "16:35" },
    ],
    usage: { people: isDefault ? 18 : 4, departments: isDefault ? ["Hardware", "Firmware"] : ["Customer Support"], overrides: 1 },
    createdAt: "2026-01-02T05:00:00.000Z",
    updatedAt: "2026-09-02T05:00:00.000Z",
  });
  return [mk("sh-general", "General", "09:30", "18:30", true), mk("sh-early", "Early", "07:00", "16:00", false)];
}

function analytics(userId) {
  const timeline = [];
  for (let h = 9; h <= 17; h++) timeline.push({ hour: h, activeSec: 2400 + ((h * 431) % 900), idleSec: 300 + ((h * 97) % 500) });
  const dailyFlow = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(todayKey(), -d);
    for (let h = 9; h <= 18; h++) dailyFlow.push({ date, hour: h, activeSec: 1500 + ((h * d * 211) % 1800), idleSec: 200 + ((h + d) % 5) * 60 });
  }
  return {
    userId,
    date: todayKey(),
    kpis: {
      idle: { value: 2460, deltaPct: -12, spark: [3, 4, 2, 5, 3, 2, 4] },
      active: { value: 17820, deltaPct: 8, spark: [4, 5, 6, 5, 7, 6, 8] },
      break: { value: 1500, deltaPct: 0, spark: [2, 2, 3, 2, 2, 3, 2] },
      lunch: { value: 2700, deltaPct: 5, spark: [3, 3, 3, 4, 3, 3, 3] },
      meeting: { value: 3600, deltaPct: 20, spark: [1, 2, 1, 3, 2, 2, 4] },
    },
    workVsBreak: { workSec: 21600, breakSec: 4200 },
    topApps: [
      { name: "KiCad", seconds: 7200 },
      { name: "Visual Studio Code", seconds: 5400 },
      { name: "Microsoft Teams", seconds: 2700 },
      { name: "Google Chrome", seconds: 2400 },
      { name: "Excel", seconds: 1200 },
    ],
    timeline,
    focusTrend: Array.from({ length: 7 }, (_, i) => ({ date: addDays(todayKey(), i - 6), value: 18000 + ((i * 1777) % 7200) })),
    dailyFlow,
    focusSessions: [
      { start: at("09:40"), end: at("11:00"), durationSec: 4800 },
      { start: at("11:20"), end: at("12:50"), durationSec: 5400 },
      { start: at("14:00"), end: at("14:40"), durationSec: 2400 },
      { start: at("15:00"), end: at("15:20"), durationSec: 1200 },
    ],
  };
}

function timesheet(userId, from, to) {
  const s = STAFF.find((x) => x.id === userId) ?? STAFF[0];
  const rows = [];
  for (let d = from, i = 0; d <= to && i < 400; d = addDays(d, 1), i++) {
    const o = calendarOverrides.get(d);
    const working = o ? o.isWorking : weekPattern.includes(weekday(d));
    const isToday = d === todayKey();
    const future = d > todayKey();
    const focus = !working || future ? 0 : isToday ? s.focusSec : 22000 + ((i * 1373) % 7000);
    const inAt = working && !future ? at(`09:${String((i * 7) % 40 + 5).padStart(2, "0")}`, d) : null;
    const outAt = working && !future && !isToday ? at(`18:${String((i * 11) % 50 + 5).padStart(2, "0")}`, d) : null;
    rows.push({
      date: d,
      weekday: weekday(d),
      isWorkingDay: working,
      label: o?.label ?? null,
      in: inAt,
      out: outAt,
      in12: twelve(inAt),
      out12: twelve(outAt),
      focusSec: focus,
      targetSec: working ? 27000 : 0,
      breakSec: working && !future ? 5100 : 0,
      paidBreakSec: working && !future ? 5100 : 0,
      unpaidBreakSec: working && !future && i % 5 === 0 ? 420 : 0,
      meetingsSec: working && !future ? (i % 3) * 1800 : 0,
      awayApprovedSec: working && !future && i % 4 === 0 ? 900 : 0,
      awayPendingSec: working && !future && i % 6 === 0 ? 600 : 0,
      status: !working ? "OFF" : future ? "UPCOMING" : isToday ? "IN_PROGRESS" : focus >= 21600 ? "FULL" : focus >= 10800 ? "HALF" : "ABSENT",
    });
  }
  return {
    person: { id: s.id, name: s.name, email: s.email, designation: s.designation, department: s.department, organisation: { id: "org-1", name: "Northwind Labs" } },
    range: { from, to },
    rows,
  };
}

function approvals() {
  const base = (id, type, category, person, title, extra = {}) => ({
    type,
    id,
    category,
    user: { id: person.id, name: person.name, email: person.email, role: "USER", department: person.department.name },
    date: todayKey(),
    title,
    detail: "",
    reason: null,
    needsComment: false,
    participants: [],
    startedAt: at("11:05"),
    endedAt: at("11:30"),
    inProgress: false,
    durationSec: 1500,
    effect: { mode: "PLUS", minutes: 25, text: "+25 min if approved" },
    status: "PENDING",
    createdAt: at("11:31"),
    dueAt: at("11:31", addDays(todayKey(), 2)),
    dueInSec: 40 * 3600,
    dueSoon: false,
    overdue: false,
    escalated: false,
    decidedAt: null,
    decidedById: null,
    decidedByName: null,
    decisionNote: null,
    canDecide: true,
    locked: false,
    break: null,
    meeting: null,
    ...extra,
  });
  return [
    base("a-1", "AWAY", "AWAY_MEETING", STAFF[2], "Away 25 min: short meeting", {
      detail: "11:05 AM to 11:30 AM · 25 min",
      reason: "Walked through the enclosure drawings with the vendor",
      participants: [{ name: "Vikram Rao" }, { name: "Supplier (Shenzhen)" }],
      momSender: "Vikram Rao",
      away: { reasonKey: "MEETING", reasonKind: "MEETING", reasonLabel: "Short meeting", comment: "Walked through the enclosure drawings with the vendor", momSender: "Vikram Rao" },
    }),
    base("a-2", "AWAY", "AWAY_THINKING", STAFF[4], "Away 12 min: thinking", {
      detail: "2:10 PM to 2:22 PM · 12 min",
      reason: "Planning the battery test matrix",
      effect: { mode: "PLUS", minutes: 12, text: "+12 min if approved" },
      away: { reasonKey: "THINKING", reasonKind: "THINKING", reasonLabel: "Thinking", comment: "Planning the battery test matrix", momSender: null },
      dueInSec: -3 * 3600,
      overdue: true,
    }),
    base("m-1", "MEETING", "MEETING_PAST", STAFF[6], "Meeting: Sprint review", {
      detail: "3:00 PM to 3:45 PM · 45 min",
      reason: "Sprint review with the firmware team",
      participants: [{ name: "Kavya Nair" }, { name: "Divya Menon" }],
      momSender: "Divya Menon",
      effect: { mode: "PLUS", minutes: 45, text: "+45 min if approved" },
    }),
    base("b-1", "BREAK", "BREAK_SKIP", STAFF[8], "Morning break skipped", {
      reason: "Customer call ran long",
      effect: { mode: "MINUS", minutes: 15, text: "−15 min if rejected" },
    }),
  ];
}

// ---- routes ----------------------------------------------------------------------------------
async function route(req, res) {
  const url = new URL(req.url, "http://mock");
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const method = req.method ?? "GET";
  const q = url.searchParams;

  // Auth
  if (path === "/auth/login" && method === "POST") {
    const { email } = await body(req);
    const account = ACCOUNTS[String(email ?? "").toLowerCase()];
    if (!account) return fail(res, 401, "INVALID_CREDENTIALS", "Incorrect email or password");
    return send(
      res,
      200,
      { success: true, data: { user: { id: account.id, email, name: account.name, role: account.role } } },
      { "Set-Cookie": `mock_user=${encodeURIComponent(email)}; Path=/; HttpOnly; SameSite=Lax` },
    );
  }
  if (path === "/auth/logout") return send(res, 200, { success: true, data: null }, { "Set-Cookie": "mock_user=; Path=/; Max-Age=0" });
  if (path === "/auth/refresh") return who(req) ? ok(res, null) : fail(res, 401, "UNAUTHORIZED", "Signed out");
  const me = who(req);
  if (!me) return fail(res, 401, "UNAUTHORIZED", "Sign in first");
  if (path === "/auth/socket-ticket") return ok(res, { token: "mock", expiresIn: 300 });

  const orgId = me.role === "SUPER_ADMIN" ? req.headers["x-org-id"] : me.org;

  if (path === "/me") {
    return ok(res, {
      id: me.id,
      name: me.name,
      email: me.email,
      role: me.role,
      organisation: me.org ? { id: me.org, name: "Northwind Labs" } : null,
      department: me.department ? deptById(me.department) : null,
      departments: (me.departments ?? []).map(deptById),
      grants: me.grants ?? { screenshots: false, timeline: false, activity: false },
    });
  }

  // Platform
  if (path === "/organisations" && method === "GET") return ok(res, ORGS.map(orgView));
  if (path === "/organisations" && method === "POST") {
    const { name } = await body(req);
    const org = { id: `org-${ORGS.length + 1}`, name, createdAt: new Date().toISOString() };
    ORGS.push(org);
    return ok(res, orgView(org));
  }
  if (path.startsWith("/organisations/")) return ok(res, { ok: true });
  if (path === "/overview/platform") return ok(res, { organisations: ORGS.map(orgView), unassignedPeople: 2 });

  if (me.role === "SUPER_ADMIN" && !orgId && !["/notifications", "/notifications/unread-count", "/chat/unread", "/chat/contacts", "/chat/threads"].includes(path)) {
    return fail(res, 400, "ORG_REQUIRED", "Pick an organisation first");
  }

  // Overview and team
  if (path === "/overview") {
    const staff = scopeStaff(me);
    const count = (st) => staff.filter((s) => s.status === st).length;
    const working = count("WORKING");
    const depts = (me.role === "MANAGER" ? me.departments.map(deptById) : DEPARTMENTS).map((d) => {
      const ds = staff.filter((s) => s.department.id === d.id);
      return {
        ...d,
        staff: ds.length,
        working: ds.filter((s) => s.status === "WORKING").length,
        focusSec: ds.reduce((t, s) => t + s.focusSec, 0),
        targetSec: ds.length * 27000,
      };
    });
    return ok(res, {
      scope: { organisation: { id: "org-1", name: "Northwind Labs" }, departments: me.role === "MANAGER" ? me.departments.map(deptById) : [] },
      today: {
        people: staff.length,
        started: staff.length - count("NOT_STARTED"),
        working,
        onBreak: count("BREAK"),
        inMeeting: count("MEETING"),
        away: count("AWAY"),
        notStarted: count("NOT_STARTED"),
        lateStarts: me.role === "MANAGER" ? 1 : 3,
        ended: count("ENDED"),
        focusSec: staff.reduce((t, s) => t + s.focusSec, 0),
        targetSec: staff.length * 27000,
      },
      approvals: { pending: 4, overdue: 1, oldestDueAt: at("14:22", addDays(todayKey(), -1)) },
      month: {
        month: todayKey().slice(0, 7),
        workingDays: 26,
        elapsedWorkingDays: 16,
        focusSec: staff.length * 16 * 24800,
        targetSec: staff.length * 26 * 27000,
        full: staff.length * 12,
        half: staff.length * 2,
        absent: 3,
      },
      departments: depts,
      attention: [
        { kind: "AWAY_UNEXPLAINED", count: 1, people: [{ id: STAFF[5].id, name: STAFF[5].name }] },
        { kind: "LATE_START", count: 3, people: STAFF.slice(6, 9).map((s) => ({ id: s.id, name: s.name })) },
        { kind: "NO_AGENT", count: 2, people: STAFF.slice(7, 9).map((s) => ({ id: s.id, name: s.name })) },
        ...(me.role === "MANAGER" ? [] : [{ kind: "NO_DEPARTMENT", count: 1, people: [{ id: "u-x", name: "Neha Bhat" }] }]),
      ],
      nextHolidays: [...calendarOverrides.values()]
        .filter((o) => !o.isWorking && o.date >= todayKey())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((o) => ({ date: o.date, label: o.label })),
      ...(me.role === "MANAGER" && !me.grants.activity ? {} : { hourly: hourly() }),
      generatedAt: new Date().toISOString(),
    });
  }
  if (path === "/team") {
    const people = scopeStaff(me).map(teamPerson);
    const counts = {
      all: people.length,
      active: people.filter((p) => ["WORKING", "BREAK", "MEETING", "AWAY"].includes(p.status)).length,
      working: people.filter((p) => p.status === "WORKING").length,
      onBreak: people.filter((p) => p.status === "BREAK").length,
      inMeeting: people.filter((p) => p.status === "MEETING").length,
      away: people.filter((p) => p.status === "AWAY").length,
      notStarted: people.filter((p) => p.status === "NOT_STARTED").length,
      ended: people.filter((p) => p.status === "ENDED").length,
    };
    return ok(res, { date: todayKey(), counts, people });
  }

  // Departments and people
  if (path === "/departments" && method === "GET") {
    const list = me.role === "MANAGER" ? me.departments.map(deptById) : DEPARTMENTS;
    return ok(
      res,
      list.map((d) => ({
        ...d,
        staffCount: STAFF.filter((s) => s.department.id === d.id).length,
        managers: MANAGERS.filter((m) => m.departments.includes(d.id)).map((m) => ({ id: m.id, name: m.name })),
        idle: { enabled: null, minutes: null, reasonKeys: null },
      })),
    );
  }
  if (path === "/departments" && method === "POST") {
    const input = await body(req);
    const d = { id: `d-${DEPARTMENTS.length + 1}`, name: input.name, icon: input.icon };
    DEPARTMENTS.push(d);
    return ok(res, { ...d, staffCount: 0, managers: [], idle: {} });
  }
  if (path.startsWith("/departments/")) return ok(res, { id: path.split("/")[2], name: "Updated", icon: "briefcase", staffCount: 0, managers: [] });
  if (path === "/users" && method === "GET") {
    let rows = [
      ...(orgId === "org-1" || me.org === "org-1"
        ? [{ id: "u-admin", name: "Arjun Mehta", firstName: "Arjun", lastName: "Mehta", email: "admin@rxv.test", role: "ADMIN", designation: "Operations head", status: "ACTIVE", screenshotsEnabled: false, idleEnabled: null, agentStatus: "LIVE", agentLastSeenAt: at("12:55"), createdAt: "2025-02-11T05:00:00.000Z" }]
        : []),
      ...MANAGERS.map(managerRow),
      ...STAFF.map(userRow),
    ];
    if (q.get("role")) rows = rows.filter((r) => r.role === q.get("role"));
    if (q.get("departmentId")) rows = rows.filter((r) => r.departmentId === q.get("departmentId") || (r.departmentIds ?? []).includes(q.get("departmentId")));
    if (q.get("status")) rows = rows.filter((r) => r.status === q.get("status"));
    if (q.get("q")) rows = rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q.get("q").toLowerCase()));
    const page = Number(q.get("page") ?? 1);
    const limit = Number(q.get("limit") ?? 10);
    return ok(res, rows.slice((page - 1) * limit, page * limit), {
      total: rows.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    });
  }
  if (path.startsWith("/users")) return ok(res, { updated: true });
  if (path === "/shifts") return ok(res, shifts());

  // Calendar, settings, idle, keys
  if (path === "/calendar" && method === "GET") {
    const year = Number(q.get("year") ?? todayKey().slice(0, 4));
    return ok(res, { weekPattern, overrides: [...calendarOverrides.values()].filter((o) => o.date.startsWith(`${year}-`)), months: [] });
  }
  if (path === "/calendar/week-pattern") {
    weekPattern = (await body(req)).days ?? weekPattern;
    return ok(res, { weekPattern });
  }
  if (path.startsWith("/calendar/days/")) {
    const date = path.split("/")[3];
    if (method === "DELETE") calendarOverrides.delete(date);
    else {
      const b = await body(req);
      calendarOverrides.set(date, { date, isWorking: Boolean(b.isWorking), label: b.label ?? null });
    }
    return ok(res, { date });
  }
  if (path === "/settings") {
    if (method === "PATCH") settings = { ...settings, ...(await body(req)) };
    return ok(res, settings);
  }
  if (path === "/idle-settings" && method === "GET") return ok(res, idle);
  if (path.startsWith("/idle-settings")) return ok(res, idle);
  if (path === "/signout-keys" && method === "GET") {
    return ok(res, signOutKeys.map((k) => ({ ...k, active: !k.revokedAt && Date.parse(k.expiresAt) > Date.now() })));
  }
  if (path === "/signout-keys" && method === "POST") {
    return ok(res, { id: "k-new", phrase: "amber orbit cedar river lamp 42", expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString() });
  }
  if (path.startsWith("/signout-keys/")) return ok(res, { revoked: true });

  // Approvals, notifications, chat
  if (path === "/approvals/summary") return ok(res, { pending: 4, dueSoon: 1, overdue: 1, escalated: 0, approvedToday: 2, rejectedToday: 0, slaHours: 48 });
  if (path === "/approvals") return ok(res, { items: approvals(), meta: { total: 4, page: 1, limit: 50, totalPages: 1 } });
  if (path === "/notifications/unread-count") return ok(res, { count: 2 });
  if (path === "/notifications") return ok(res, []);
  if (path === "/chat/unread") return ok(res, { count: 0 });

  // A person's day
  if (path.startsWith("/analytics/")) return ok(res, analytics(path.split("/")[2]));
  if (/^\/reports\/person\/[^/]+\/timesheet$/.test(path)) {
    return ok(res, timesheet(path.split("/")[3], q.get("from") ?? todayKey(), q.get("to") ?? todayKey()));
  }
  if (/^\/presence\/team\/[^/]+\/current$/.test(path)) {
    const s = STAFF.find((x) => x.id === path.split("/")[3]);
    return ok(res, { status: s?.status === "BREAK" ? "BREAK" : s?.status === "MEETING" ? "MEETING" : "WORKING", note: null, since: at("09:12"), elapsedSec: 600 });
  }
  if (/^\/activity\/user\/[^/]+\/current$/.test(path)) {
    return ok(res, { status: "ACTIVE", app: "KiCad", title: "enclosure-v3.kicad_pcb", url: null, idle: false, lastSampleAt: new Date().toISOString(), staleSec: 4 });
  }
  if (path === "/screenshots") {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `shot-${i}`,
      kind: i === 3 ? "MANUAL" : "AUTO",
      takenAt: at(`${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "35" : "05"}`),
      url: `/api/v1/mock-shot/${i}.svg`,
    }));
    return ok(res, { userId: q.get("userId"), total: items.length, items });
  }
  if (path.startsWith("/mock-shot/")) {
    const n = Number(path.split("/")[2].replace(".svg", "")) || 0;
    const hues = [230, 200, 260, 160, 20, 300, 190, 120];
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    return res.end(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="hsl(${hues[n % 8]},45%,92%)"/><rect x="16" y="16" width="288" height="20" rx="4" fill="hsl(${hues[n % 8]},45%,70%)"/><rect x="16" y="48" width="180" height="120" rx="6" fill="#fff"/><rect x="208" y="48" width="96" height="120" rx="6" fill="#fff"/></svg>`,
    );
  }
  if (path === "/breaks/team") {
    const staff = scopeStaff(me).slice(0, 8);
    return ok(res, {
      date: todayKey(),
      totals: { people: staff.length, taken: 9, late: 1, early: 0, missed: 1, overrun: 1, pending: 2, skipped: 1 },
      rows: staff.map((s) => ({
        user: { id: s.id, name: s.name, email: s.email, role: "USER", department: s.department.name },
        shift: { id: "sh-general", name: "General", start: "09:30", end: "18:30" },
        source: "DEFAULT",
        workday: true,
        cells: [],
        unscheduled: [],
        pending: 0,
      })),
    });
  }
  if (path === "/reports/people") return ok(res, { items: STAFF.map((s) => ({ id: s.id, name: s.name, role: "USER", department: s.department.name, managerId: null, managerName: null })) });

  if (method === "GET") return ok(res, []);
  return ok(res, { ok: true });
}

http
  .createServer((req, res) => {
    route(req, res).catch((err) => {
      console.error(err);
      fail(res, 500, "MOCK_ERROR", String(err?.message ?? err));
    });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`mock API on http://127.0.0.1:${PORT}`));
