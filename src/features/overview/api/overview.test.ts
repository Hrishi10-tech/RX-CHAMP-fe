import { readOverview } from "./overview";

describe("readOverview (GET /overview)", () => {
  it("keeps hourly absent apart from hourly empty", () => {
    // A Manager without the activity grant: the server leaves `hourly` out.
    expect(readOverview({ today: { working: 2 } }).hourly).toBeNull();
    // Nobody has worked yet: present but empty.
    expect(readOverview({ hourly: [] }).hourly).toEqual([]);
    expect(
      readOverview({
        hourly: [
          { hour: 10, working: 3 },
          { hour: 9, working: 1 },
        ],
      }).hourly,
    ).toEqual([
      { hour: 9, working: 1 },
      { hour: 10, working: 3 },
    ]);
  });

  it("reads the server's generatedAt and the attention list", () => {
    const view = readOverview({
      generatedAt: "2026-10-19T05:30:00.000Z",
      attention: [{ kind: "NO_ADMIN", count: 1, people: [] }],
      scope: {
        organisation: { id: "o1", name: "Northwind" },
        departments: [{ id: "d1", name: "Hardware", icon: "cpu" }],
      },
    });
    expect(view.generatedAt).toBe("2026-10-19T05:30:00.000Z");
    expect(view.attention).toEqual([{ kind: "NO_ADMIN", count: 1, people: [] }]);
    expect(view.scope.organisation).toEqual({ id: "o1", name: "Northwind" });
    expect(view.scope.departments).toEqual([{ id: "d1", name: "Hardware" }]);
    expect(readOverview({}).generatedAt).toBeNull();
  });

  it("reads offline time, and paid time only when the server sends it", () => {
    const view = readOverview({
      today: { focusSec: 3600, unverifiedSec: 1500 },
      month: { focusSec: 36000, unverifiedSec: 1500, paidSec: 39600 },
      approvals: { pending: 2, overdue: 0, oldestDueAt: "2026-10-21T23:34:27.366Z" },
    });
    expect(view.today).toMatchObject({ unverifiedSec: 1500, paidSec: null });
    expect(view.month).toMatchObject({ unverifiedSec: 1500, paidSec: 39600 });
    expect(view.approvals.oldestDueAt).toBe("2026-10-21T23:34:27.366Z");
    expect(readOverview({}).today.unverifiedSec).toBe(0);
  });
});
