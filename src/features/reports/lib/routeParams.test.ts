import { peopleFromParams, periodFromParams, wantsPrint } from "./routeParams";

const TODAY = "2026-10-13";
const params = (q: string) => new URLSearchParams(q);

describe("periodFromParams", () => {
  it("reads a day or a month", () => {
    expect(periodFromParams(params("date=2026-10-12"), TODAY)).toEqual({
      kind: "day",
      date: "2026-10-12",
    });
    expect(periodFromParams(params("month=2026-09"), TODAY)).toEqual({
      kind: "month",
      month: "2026-09",
    });
  });

  it("falls back to this month for nothing, nonsense or the future", () => {
    const thisMonth = { kind: "month", month: "2026-10" };
    expect(periodFromParams(params(""), TODAY)).toEqual(thisMonth);
    expect(periodFromParams(params("date=2026-10-14"), TODAY)).toEqual(thisMonth);
    expect(periodFromParams(params("month=2026-11"), TODAY)).toEqual(thisMonth);
    expect(periodFromParams(params("date=13-10-2026&month=x"), TODAY)).toEqual(thisMonth);
  });
});

describe("peopleFromParams", () => {
  it("reads a manager and ids", () => {
    expect(peopleFromParams(params("departmentId=d-1&userIds=a,b"))).toEqual({
      departmentId: "d-1",
      userIds: ["a", "b"],
    });
    expect(peopleFromParams(params(""))).toEqual({ departmentId: undefined, userIds: undefined });
    // A 3.x link by manager is read as everyone in scope.
    expect(peopleFromParams(params("managerId=m-1"))).toEqual({
      departmentId: undefined,
      userIds: undefined,
    });
  });
});

describe("wantsPrint", () => {
  it("is on only for print=1", () => {
    expect(wantsPrint(params("print=1"))).toBe(true);
    expect(wantsPrint(params("print=0"))).toBe(false);
  });
});
