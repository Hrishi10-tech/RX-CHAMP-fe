import { sortRows } from "./TeamMonthView";
import type { MonthTotals, TeamMonthRow } from "@/features/reports/types";

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }) }));

function row(id: string, name: string, paidSec: number): TeamMonthRow {
  return {
    person: {
      id,
      name,
      email: `${id}@example.com`,
      role: "USER",
      department: "Engineering",
      departmentId: "d-eng",
      designation: null,
      managerId: null,
      managerName: null,
    },
    totals: { focusSec: 0, expectedSec: 0, paidSec } as MonthTotals,
    days: [],
  };
}

describe("team month ranking", () => {
  it("sorts by paid time, the payroll figure, ties by name", () => {
    const rows = [row("a", "Alpha", 3600), row("b", "Bravo", 7200), row("c", "Charlie", 3600)];
    expect(sortRows(rows, "paid", -1).map((r) => r.person.name)).toEqual([
      "Bravo",
      "Alpha",
      "Charlie",
    ]);
    expect(sortRows(rows, "paid", 1).map((r) => r.person.name)).toEqual([
      "Alpha",
      "Charlie",
      "Bravo",
    ]);
  });
});
