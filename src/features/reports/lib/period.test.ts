import type { ReportPerson } from "@/features/reports/types";
import {
  calendarDays,
  canShowNextMonth,
  initialPeriod,
  monthOptions,
  periodLabel,
  reportTarget,
  resolvePeriod,
  resolveWho,
  stepPeriod,
  teamsOf,
} from "./period";

const TODAY = "2026-10-13";

function person(id: string, name: string, managerId: string | null = "m-1"): ReportPerson {
  return {
    id,
    name,
    email: `${id}@example.com`,
    role: "USER",
    department: "Engineering",
    designation: null,
    managerId,
    managerName: managerId === "m-1" ? "Maya Reddy" : managerId ? "Karthik N" : null,
  };
}

const PEOPLE = [
  person("u-1", "Asha Kumar"),
  person("u-2", "Praveen Kumar"),
  person("u-3", "Kavya R", "m-2"),
];

describe("resolvePeriod", () => {
  it("starts on last month", () => {
    expect(resolvePeriod(initialPeriod(TODAY), TODAY)).toEqual({ kind: "month", month: "2026-09" });
  });

  it("reads This month as the current month", () => {
    const choice = { ...initialPeriod(TODAY), mode: "thisMonth" as const };
    expect(resolvePeriod(choice, TODAY)).toEqual({ kind: "month", month: "2026-10" });
  });

  it("takes any day up to today, never a future one", () => {
    const base = { ...initialPeriod(TODAY), mode: "day" as const };
    expect(resolvePeriod({ ...base, day: "2026-10-13" }, TODAY)).toEqual({
      kind: "day",
      date: "2026-10-13",
    });
    expect(resolvePeriod({ ...base, day: "2026-10-14" }, TODAY)).toBeNull();
    expect(resolvePeriod({ ...base, day: "2026-02-30" }, TODAY)).toBeNull();
  });

  it("takes any month up to the current one", () => {
    const base = initialPeriod(TODAY);
    expect(resolvePeriod({ ...base, month: "2025-12" }, TODAY)).toEqual({
      kind: "month",
      month: "2025-12",
    });
    expect(resolvePeriod({ ...base, month: "2026-10" }, TODAY)).toEqual({
      kind: "month",
      month: "2026-10",
    });
    expect(resolvePeriod({ ...base, month: "2026-11" }, TODAY)).toBeNull();
  });
});

describe("period labels", () => {
  it("names a day, the month so far, and a past month", () => {
    expect(periodLabel({ kind: "day", date: "2026-10-12" }, TODAY)).toBe("Mon 12 Oct 2026");
    expect(periodLabel({ kind: "day", date: TODAY }, TODAY)).toBe("Tue 13 Oct 2026, today");
    expect(periodLabel({ kind: "month", month: "2026-10" }, TODAY)).toBe(
      "1 to 13 Oct 2026, so far",
    );
    expect(periodLabel({ kind: "month", month: "2026-10" }, "2026-10-01")).toBe(
      "1 Oct 2026, so far",
    );
    expect(periodLabel({ kind: "month", month: "2026-09" }, TODAY)).toBe("September 2026");
  });
});

describe("pickers", () => {
  it("disables days after today in the calendar", () => {
    const cells = calendarDays("2026-10", TODAY, "2026-10-05");
    const byDate = new Map(cells.filter((c) => c.date).map((c) => [c.date, c]));
    expect(byDate.get("2026-10-13")).toMatchObject({ disabled: false, today: true });
    expect(byDate.get("2026-10-14")?.disabled).toBe(true);
    expect(byDate.get("2026-10-05")?.selected).toBe(true);
    expect(byDate.get("2026-10-05")?.ariaLabel).toBe("Mon 5 Oct 2026");
    expect(cells.slice(0, 3).every((c) => c.date === null && c.disabled)).toBe(true);
  });

  it("never moves the calendar past the current month", () => {
    expect(canShowNextMonth("2026-09", TODAY)).toBe(true);
    expect(canShowNextMonth("2026-10", TODAY)).toBe(false);
  });

  it("offers months up to the current one", () => {
    const months = monthOptions(2026, TODAY);
    expect(months).toHaveLength(12);
    expect(months[9]).toMatchObject({ month: "2026-10", label: "Oct, so far", disabled: false });
    expect(months[10].disabled).toBe(true);
    expect(monthOptions(2025, TODAY).every((m) => !m.disabled)).toBe(true);
  });

  it("steps reports back and forward, never into the future", () => {
    expect(stepPeriod({ kind: "day", date: "2026-10-01" }, -1, TODAY)).toEqual({
      kind: "day",
      date: "2026-09-30",
    });
    expect(stepPeriod({ kind: "day", date: TODAY }, 1, TODAY)).toBeNull();
    expect(stepPeriod({ kind: "month", month: "2026-01" }, -1, TODAY)).toEqual({
      kind: "month",
      month: "2025-12",
    });
    expect(stepPeriod({ kind: "month", month: "2026-10" }, 1, TODAY)).toBeNull();
  });
});

describe("resolveWho", () => {
  it("covers everyone in scope", () => {
    const who = resolveWho({ mode: "everyone", managerId: "", picked: [] }, PEOPLE, false);
    expect(who).toMatchObject({ count: 3, label: "Everyone in my team, 3 people", single: null });
    expect(who.userIds).toBeUndefined();
    expect(resolveWho({ mode: "everyone", managerId: "", picked: [] }, PEOPLE, true).label).toBe(
      "Everyone, 3 people",
    );
  });

  it("takes one manager's team for a Super Admin", () => {
    const who = resolveWho({ mode: "team", managerId: "m-1", picked: [] }, PEOPLE, true);
    expect(who).toMatchObject({ count: 2, label: "Maya Reddy's team, 2 people", managerId: "m-1" });
    expect(who.userIds).toEqual(["u-1", "u-2"]);
    expect(teamsOf(PEOPLE)).toEqual([
      { id: "m-2", name: "Karthik N", count: 1 },
      { id: "m-1", name: "Maya Reddy", count: 2 },
    ]);
  });

  it("names one picked person, counts several, ignores unknown ids", () => {
    const one = resolveWho({ mode: "pick", managerId: "", picked: ["u-2", "gone"] }, PEOPLE, false);
    expect(one).toMatchObject({ count: 1, label: "Praveen Kumar" });
    expect(one.single?.id).toBe("u-2");
    const two = resolveWho({ mode: "pick", managerId: "", picked: ["u-1", "u-3"] }, PEOPLE, false);
    expect(two).toMatchObject({ count: 2, label: "2 people", single: null });
    expect(resolveWho({ mode: "pick", managerId: "", picked: [] }, PEOPLE, false).label).toBe(
      "Nobody picked yet",
    );
  });
});

describe("reportTarget", () => {
  const day = { kind: "day" as const, date: "2026-10-12" };
  const month = { kind: "month" as const, month: "2026-09" };

  it("opens the person views for one person", () => {
    const who = resolveWho({ mode: "pick", managerId: "", picked: ["u-1"] }, PEOPLE, false);
    expect(reportTarget(who, day)).toEqual({
      kind: "person-day",
      href: "/dashboard/reports/person/u-1?date=2026-10-12",
    });
    expect(reportTarget(who, month)).toEqual({
      kind: "person-month",
      href: "/dashboard/reports/person/u-1?month=2026-09",
    });
  });

  it("opens the team views for several or everyone", () => {
    const all = resolveWho({ mode: "everyone", managerId: "", picked: [] }, PEOPLE, false);
    expect(reportTarget(all, month)?.href).toBe("/dashboard/reports/team?month=2026-09");
    expect(reportTarget(all, day)?.href).toBe("/dashboard/reports/team?date=2026-10-12");
    const two = resolveWho({ mode: "pick", managerId: "", picked: ["u-1", "u-3"] }, PEOPLE, false);
    expect(reportTarget(two, month)?.href).toBe(
      "/dashboard/reports/team?month=2026-09&userIds=u-1%2Cu-3",
    );
  });

  it("sends a manager's team by managerId for a month, by ids for a day", () => {
    const team = resolveWho({ mode: "team", managerId: "m-1", picked: [] }, PEOPLE, true);
    expect(reportTarget(team, month)?.href).toBe(
      "/dashboard/reports/team?month=2026-09&managerId=m-1",
    );
    expect(reportTarget(team, day)?.href).toBe(
      "/dashboard/reports/team?date=2026-10-12&userIds=u-1%2Cu-2",
    );
  });

  it("has nowhere to go with nobody chosen", () => {
    const none = resolveWho({ mode: "pick", managerId: "", picked: [] }, PEOPLE, false);
    expect(reportTarget(none, month)).toBeNull();
  });
});
