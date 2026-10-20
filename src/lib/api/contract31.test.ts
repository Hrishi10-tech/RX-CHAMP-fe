/**
 * Every 3.1 request the portal makes, against SPEC section 3: method, path,
 * query and body. Each case names the endpoint it covers.
 *
 * Checked against the running 3.1 API (October 2026), which settled the open
 * questions:
 * - `POST /approvals/bulk-approve` takes `items[].type` in lower case, like the
 *   item paths ("break" | "meeting"; "BREAK" is 400 VALIDATION_ERROR), and
 *   answers `approved` / `skipped` with lower-case types too.
 * - `GET /approvals` puts the page in `data`: `{ items, meta }` (not `meta`
 *   beside `data`, as the 3.0 lists do).
 * - `GET /approvals/summary` counts the caller's own scope ("mine"; for a Super
 *   Admin: routed to them, the Super Admin pool and every escalated item).
 * - Item views carry `decidedById` (since the 3.1 fix round) beside
 *   `decidedByName`, so Reopen is offered to the decider by id, or to any Super
 *   Admin; the API re-checks.
 * - `days` above 31 is a 400, so `/approvals/me` is clamped here.
 */
import {
  approveItem,
  bulkApprove,
  getApprovals,
  getApprovalsSummary,
  getMyApprovals,
  rejectItem,
  reopenItem,
} from "@/features/approvals/api/approvals";
import { getUserHourly } from "@/features/activity/api/getUserHourly";
import { getMyMeetingsToday, searchParticipants } from "@/features/meetings/api/getMeetings";
import {
  downloadPersonMonthXlsx,
  downloadTeamMonthXlsx,
  getMonthLock,
  getPersonDayReport,
  getPersonMonthReport,
  getReportPeople,
  getReportRuns,
  getTeamDayReport,
  getTeamMonthReport,
  lockMonth,
  unlockMonth,
} from "@/features/reports/api/reports";
import { getSettings, updateSettings } from "@/features/settings/api/settings";
import { getTeamToday } from "@/features/teamToday/api/getTeamToday";
import { getWorkdayToday } from "@/features/workday/api/getWorkdayToday";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  refreshAccessToken: jest.fn(),
}));

const client = apiClient as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

function answer(data: unknown, extra: Record<string, unknown> = {}) {
  return Promise.resolve({ data: { success: true, data, ...extra }, headers: {} });
}

beforeEach(() => {
  jest.clearAllMocks();
  client.get.mockImplementation(() => answer({ items: [] }));
  client.post.mockImplementation(() => answer({}));
  client.patch.mockImplementation(() => answer({}));
  client.delete.mockImplementation(() => answer({}));
});

describe("3.1 Work day", () => {
  it("GET /workday/me/today", async () => {
    client.get.mockImplementation(() => answer({ state: "OPEN" }));
    await getWorkdayToday();
    expect(client.get).toHaveBeenCalledWith("/api/v1/workday/me/today");
  });
});

describe("3.3 Meetings (read-only)", () => {
  it("GET /meetings/me/today and /meetings/participants?q=", async () => {
    await getMyMeetingsToday();
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/meetings/me/today");
    await searchParticipants("  asha ");
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/meetings/participants", {
      params: { q: "asha" },
    });
  });
});

describe("3.4 Approvals", () => {
  it("GET /approvals with only the filters that are set", async () => {
    client.get.mockImplementation(() =>
      answer({
        items: [{ type: "BREAK", id: "b1" }, { id: "" }],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      }),
    );
    const page = await getApprovals(
      {
        status: "PENDING",
        scope: "all",
        overdue: true,
        category: "BREAK_SKIP",
        userId: "u1",
        page: 1,
        limit: 50,
      },
      true,
    );
    expect(client.get).toHaveBeenCalledWith("/api/v1/approvals", {
      params: {
        status: "PENDING",
        scope: "all",
        overdue: true,
        category: "BREAK_SKIP",
        userId: "u1",
        page: 1,
        limit: 50,
      },
    });
    // The row with no id is dropped; each row is stamped with when it arrived.
    expect(page.items).toEqual([{ type: "BREAK", id: "b1", receivedAt: expect.any(Number) }]);
    expect(page.meta?.total).toBe(1);
  });

  it("never sends scope for a Manager", async () => {
    await getApprovals({ status: "ALL", scope: "all", type: "MEETING" }, false);
    expect(client.get).toHaveBeenCalledWith("/api/v1/approvals", {
      params: { status: "ALL", type: "MEETING" },
    });
  });

  it("GET /approvals/summary and /approvals/me?days=", async () => {
    client.get.mockImplementation(() => answer({ pending: 1 }));
    await getApprovalsSummary();
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/approvals/summary");
    client.get.mockImplementation(() => answer({ items: [] }));
    await getMyApprovals(90);
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/approvals/me", { params: { days: 31 } });
  });

  it("POST approve, reject and reopen on /approvals/:type/:id/...", async () => {
    await approveItem({ type: "BREAK", id: "b1" });
    expect(client.post).toHaveBeenLastCalledWith("/api/v1/approvals/break/b1/approve", {});
    await approveItem({ type: "MEETING", id: "m1" }, "  fine ");
    expect(client.post).toHaveBeenLastCalledWith("/api/v1/approvals/meeting/m1/approve", {
      note: "fine",
    });
    await rejectItem({ type: "BREAK", id: "b1" }, " Take lunch ");
    expect(client.post).toHaveBeenLastCalledWith("/api/v1/approvals/break/b1/reject", {
      note: "Take lunch",
    });
    await reopenItem({ type: "MEETING", id: "m1" });
    expect(client.post).toHaveBeenLastCalledWith("/api/v1/approvals/meeting/m1/reopen", {});
  });

  it("POST /approvals/bulk-approve with { items: { type, id }[] }, type in lower case, at most 200", async () => {
    // The real API: items[].type must be "break" or "meeting" ("BREAK" is
    // 400 VALIDATION_ERROR), and the answer names types the same way.
    client.post.mockImplementation(() =>
      answer({
        approved: [{ type: "break", id: "b1" }],
        skipped: [
          { type: "meeting", id: "m1", reason: "This meeting is still running." },
          { type: "nonsense", id: "x" },
        ],
      }),
    );
    const refs = [
      ...Array.from({ length: 204 }, (_, i) => ({ type: "BREAK" as const, id: `b${i}` })),
      { type: "MEETING" as const, id: "m1" },
    ];
    const result = await bulkApprove([refs[204], ...refs.slice(0, 204)], " fine ");
    const [url, body] = client.post.mock.calls[0];
    expect(url).toBe("/api/v1/approvals/bulk-approve");
    expect(body.items).toHaveLength(200);
    expect(body.items[0]).toEqual({ type: "meeting", id: "m1" });
    expect(body.items[1]).toEqual({ type: "break", id: "b0" });
    expect(body.note).toBe("fine");
    // Read back as the lists name types, so skipped rows can be matched.
    expect(result).toEqual({
      approved: [{ type: "BREAK", id: "b1" }],
      skipped: [{ type: "MEETING", id: "m1", reason: "This meeting is still running." }],
    });
    await bulkApprove([{ type: "BREAK", id: "b1" }]);
    expect(client.post.mock.calls[1][1]).toEqual({ items: [{ type: "break", id: "b1" }] });
  });
});

describe("3.5 Team today and 3.6 Activity", () => {
  it("GET /team/today?date=&managerId=", async () => {
    client.get.mockImplementation(() => answer({ rows: [{ user: { id: "u1" } }, { user: null }] }));
    const view = await getTeamToday({ date: "2026-10-13", managerId: "m1" });
    expect(client.get).toHaveBeenCalledWith("/api/v1/team/today", {
      params: { date: "2026-10-13", managerId: "m1" },
    });
    expect(view.rows).toHaveLength(1);
    expect(view.totals.people).toBe(0);
  });

  it("GET /activity/user/:userId/hourly?date=", async () => {
    client.get.mockImplementation(() => answer({ date: "2026-10-13" }));
    const view = await getUserHourly("u 1", "2026-10-13");
    expect(client.get).toHaveBeenCalledWith("/api/v1/activity/user/u%201/hourly", {
      params: { date: "2026-10-13" },
    });
    expect(view.hours).toEqual([]);
  });
});

describe("3.7 Reports", () => {
  it("GET /reports/people", async () => {
    await getReportPeople();
    expect(client.get).toHaveBeenCalledWith("/api/v1/reports/people");
  });

  it("GET /reports/person/:userId/day?date= and /month?month=", async () => {
    client.get.mockImplementation(() => answer({ person: { id: "u1" }, summary: {} }));
    const day = await getPersonDayReport("u1", "2026-10-13");
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/person/u1/day", {
      params: { date: "2026-10-13" },
    });
    expect(day.timeline).toEqual([]);
    client.get.mockImplementation(() => answer({ person: { id: "u1" }, days: null }));
    const month = await getPersonMonthReport("u1", "2026-09");
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/person/u1/month", {
      params: { month: "2026-09" },
    });
    expect(month.days).toEqual([]);
    expect(month.totals.focusSec).toBe(0);
  });

  it("refuses an incomplete day report instead of rendering half of it", async () => {
    client.get.mockImplementation(() => answer({ person: { id: "u1" } }));
    await expect(getPersonDayReport("u1", "2026-10-13")).rejects.toThrow(/incomplete/);
  });

  it("GET /reports/team/day?date=&userIds=a,b and /team/month?month=&departmentId=&userIds=", async () => {
    client.get.mockImplementation(() => answer({ rows: [] }));
    await getTeamDayReport({ date: "2026-10-13", userIds: ["a", "b"] });
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/team/day", {
      params: { date: "2026-10-13", userIds: "a,b" },
    });
    client.get.mockImplementation(() => answer({ rows: [], totals: {} }));
    await getTeamMonthReport({ month: "2026-09", departmentId: "d1", userIds: ["a"] });
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/team/month", {
      params: { month: "2026-09", departmentId: "d1", userIds: "a" },
    });
  });

  it("GET the .xlsx exports as blobs, saved under the server's file name", async () => {
    const createObjectURL = jest.fn(() => "blob:x");
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    client.get.mockImplementation(() =>
      Promise.resolve({
        data: new Blob(["x"]),
        headers: { "content-disposition": 'attachment; filename="rx-vision-2026-09-team.xlsx"' },
      }),
    );
    await expect(downloadTeamMonthXlsx({ month: "2026-09", userIds: ["a"] })).resolves.toBe(
      "rx-vision-2026-09-team.xlsx",
    );
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/team/month/export.xlsx", {
      params: { month: "2026-09", userIds: "a" },
      responseType: "blob",
    });
    client.get.mockImplementation(() => Promise.resolve({ data: new Blob(["x"]), headers: {} }));
    await expect(downloadPersonMonthXlsx("u1", "2026-09", "Asha Kumar")).resolves.toBe(
      "rx-vision-2026-09-asha-kumar.xlsx",
    );
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/person/u1/month/export.xlsx", {
      params: { month: "2026-09" },
      responseType: "blob",
    });
    expect(click).toHaveBeenCalledTimes(2);
    click.mockRestore();
  });

  it("GET /reports/runs and the month lock: GET, POST, DELETE /reports/months/:month/lock", async () => {
    await getReportRuns();
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/runs");
    client.get.mockImplementation(() => answer({ month: "2026-09", locked: false }));
    await getMonthLock("2026-09");
    expect(client.get).toHaveBeenLastCalledWith("/api/v1/reports/months/2026-09/lock");
    client.post.mockImplementation(() => answer({ month: "2026-09", locked: true }));
    await lockMonth("2026-09");
    expect(client.post).toHaveBeenLastCalledWith("/api/v1/reports/months/2026-09/lock", {});
    client.delete.mockImplementation(() => answer({ month: "2026-09", locked: false }));
    await unlockMonth("2026-09");
    expect(client.delete).toHaveBeenLastCalledWith("/api/v1/reports/months/2026-09/lock");
  });
});

describe("3.8 Settings", () => {
  it("GET /settings and PATCH /settings with a subset", async () => {
    client.get.mockImplementation(() => answer({ approvalSlaHours: 48 }));
    await getSettings();
    expect(client.get).toHaveBeenCalledWith("/api/v1/settings");
    client.patch.mockImplementation(() => answer({ approvalSlaHours: 24 }));
    await updateSettings({ approvalSlaHours: 24 });
    expect(client.patch).toHaveBeenCalledWith("/api/v1/settings", { approvalSlaHours: 24 });
  });
});
