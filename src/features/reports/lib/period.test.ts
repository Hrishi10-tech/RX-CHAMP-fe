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
  departmentsIn,
  membersOf,
} from "./period";

const TODAY = "2026-10-13";

const DEPT_IDS: Record<string, string> = { Engineering: "d-eng", Sales: "d-sales" };

function person(id: string, name: string, department: string | null = "Engineering"): ReportPerson {
  return {
    id,
    name,
    email: `${id}@example.com`,
    role: "USER",
    department,
    departmentId: department ? (DEPT_IDS[department] ?? null) : null,
    designation: null,
    managerId: null,
    managerName: null,
  };
}

const PEOPLE = [
  person("u-1", "Asha Kumar"),
  person("u-2", "Praveen Kumar"),
  person("u-3", "Kavya R", "Sales"),
];

const DEPARTMENTS = [
  { id: "d-eng", name: "Engineering", icon: "code" },
  { id: "d-sales", name: "Sales", icon: "bar-chart" },
  { id: "d-empty", name: "Empty", icon: "briefcase" },
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
    const who = resolveWho({ mode: "everyone", departmentId: "", picked: [] }, PEOPLE, false);
    expect(who).toMatchObject({
      count: 3,
      label: "Everyone in my departments, 3 people",
      single: null,
    });
    expect(who.userIds).toBeUndefined();
    expect(resolveWho({ mode: "everyone", departmentId: "", picked: [] }, PEOPLE, true).label).toBe(
      "Everyone, 3 people",
    );
  });

  it("takes one department by its id, not its people's ids", () => {
    const who = resolveWho(
      { mode: "department", departmentId: "d-eng", picked: [] },
      PEOPLE,
      true,
      DEPARTMENTS,
    );
    expect(who).toMatchObject({ count: 2, label: "Engineering, 2 people", departmentId: "d-eng" });
    expect(who.userIds).toBeUndefined();
    expect(departmentsIn(PEOPLE, DEPARTMENTS).map((d) => [d.name, d.count])).toEqual([
      ["Engineering", 2],
      ["Sales", 1],
    ]);
    // Membership is the row's departmentId; the department's name plays no part.
    const moved = { ...person("u-9", "Moved"), departmentId: "d-sales" };
    expect(membersOf([moved], DEPARTMENTS[1]).map((p) => p.id)).toEqual(["u-9"]);
    expect(membersOf([moved], DEPARTMENTS[0])).toEqual([]);
    const nameOnly = { ...person("u-8", "Name only"), departmentId: null };
    expect(membersOf([nameOnly], DEPARTMENTS[0])).toEqual([]);
    expect(
      resolveWho({ mode: "department", departmentId: "", picked: [] }, PEOPLE, true, DEPARTMENTS)
        .label,
    ).toBe("Pick a department");
  });

  it("names one picked person, counts several, ignores unknown ids", () => {
    const one = resolveWho(
      { mode: "pick", departmentId: "", picked: ["u-2", "gone"] },
      PEOPLE,
      false,
    );
    expect(one).toMatchObject({ count: 1, label: "Praveen Kumar" });
    expect(one.single?.id).toBe("u-2");
    const two = resolveWho(
      { mode: "pick", departmentId: "", picked: ["u-1", "u-3"] },
      PEOPLE,
      false,
    );
    expect(two).toMatchObject({ count: 2, label: "2 people", single: null });
    expect(resolveWho({ mode: "pick", departmentId: "", picked: [] }, PEOPLE, false).label).toBe(
      "Nobody picked yet",
    );
  });
});

describe("reportTarget", () => {
  const day = { kind: "day" as const, date: "2026-10-12" };
  const month = { kind: "month" as const, month: "2026-09" };

  it("opens the person views for one person", () => {
    const who = resolveWho({ mode: "pick", departmentId: "", picked: ["u-1"] }, PEOPLE, false);
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
    const all = resolveWho({ mode: "everyone", departmentId: "", picked: [] }, PEOPLE, false);
    expect(reportTarget(all, month)?.href).toBe("/dashboard/reports/team?month=2026-09");
    expect(reportTarget(all, day)?.href).toBe("/dashboard/reports/team?date=2026-10-12");
    const two = resolveWho(
      { mode: "pick", departmentId: "", picked: ["u-1", "u-3"] },
      PEOPLE,
      false,
    );
    expect(reportTarget(two, month)?.href).toBe(
      "/dashboard/reports/team?month=2026-09&userIds=u-1%2Cu-3",
    );
  });

  it("sends a department as its id alone, for a month and a day", () => {
    const dept = resolveWho(
      { mode: "department", departmentId: "d-eng", picked: [] },
      PEOPLE,
      true,
      DEPARTMENTS,
    );
    expect(reportTarget(dept, month)?.href).toBe(
      "/dashboard/reports/team?month=2026-09&departmentId=d-eng",
    );
    expect(reportTarget(dept, day)?.href).toBe(
      "/dashboard/reports/team?date=2026-10-12&departmentId=d-eng",
    );
  });

  it("has nowhere to go with nobody chosen", () => {
    const none = resolveWho({ mode: "pick", departmentId: "", picked: [] }, PEOPLE, false);
    expect(reportTarget(none, month)).toBeNull();
  });
});
