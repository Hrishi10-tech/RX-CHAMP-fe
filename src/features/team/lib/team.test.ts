import { filterTeam, focusShare, isActive, teamCounts, teamStatusLook } from "./team";
import type { TeamPerson, TeamStatus } from "@/features/team/types";

function person(
  id: string,
  name: string,
  status: TeamStatus,
  dept?: string,
  designation?: string,
): TeamPerson {
  return {
    id,
    name,
    role: "USER",
    designation: designation ?? null,
    department: dept
      ? { id: dept, name: dept === "d-hw" ? "Hardware" : "Sales", icon: "cpu" }
      : null,
    status,
    since: null,
    startedAt: null,
    focusSec: 0,
    targetSec: 27000,
    paidSec: 0,
    unverifiedSec: 0,
    online: status !== "NOT_STARTED",
    agentVersion: "4.0.0",
    lateStartMin: 0,
  };
}

const PEOPLE: TeamPerson[] = [
  person("1", "Asha K", "WORKING", "d-hw", "Firmware engineer"),
  person("2", "Bala R", "BREAK", "d-hw"),
  person("3", "Chitra S", "MEETING", "d-sales"),
  person("4", "Dev M", "AWAY", "d-sales"),
  person("5", "Esha P", "NOT_STARTED", "d-hw"),
  person("6", "Farid N", "ENDED", "d-sales"),
  person("7", "Gita L", "WORKING"),
];

describe("Team view filtering (SPEC 7.2)", () => {
  it("Active shows only people with a day open now", () => {
    const rows = filterTeam(PEOPLE, { view: "active", departmentId: "", q: "" });
    expect(rows.map((p) => p.name)).toEqual(["Dev M", "Asha K", "Gita L", "Chitra S", "Bala R"]);
    expect(rows.every(isActive)).toBe(true);
  });

  it("All shows everyone, away first and the day's end last", () => {
    const rows = filterTeam(PEOPLE, { view: "all", departmentId: "", q: "" });
    expect(rows).toHaveLength(7);
    expect(rows[0].name).toBe("Dev M");
    expect(rows.at(-1)?.name).toBe("Farid N");
  });

  it("narrows to one department", () => {
    const rows = filterTeam(PEOPLE, { view: "all", departmentId: "d-hw", q: "" });
    expect(rows.map((p) => p.id).sort()).toEqual(["1", "2", "5"]);
  });

  it("searches name, designation and department, every word", () => {
    expect(
      filterTeam(PEOPLE, { view: "all", departmentId: "", q: "firmware" }).map((p) => p.name),
    ).toEqual(["Asha K"]);
    expect(
      filterTeam(PEOPLE, { view: "all", departmentId: "", q: "sales dev" }).map((p) => p.name),
    ).toEqual(["Dev M"]);
    expect(filterTeam(PEOPLE, { view: "active", departmentId: "", q: "esha" })).toEqual([]);
  });

  it("counts from the same people the rows come from", () => {
    expect(teamCounts(PEOPLE)).toEqual({
      all: 7,
      active: 5,
      working: 2,
      onBreak: 1,
      inMeeting: 1,
      away: 1,
      notStarted: 1,
      ended: 1,
    });
    expect(
      teamCounts(filterTeam(PEOPLE, { view: "all", departmentId: "d-sales", q: "" })),
    ).toMatchObject({
      all: 3,
      active: 2,
      ended: 1,
    });
  });

  it("labels every status, and an unknown one plainly", () => {
    expect(teamStatusLook("AWAY").label).toBe("Away");
    expect(teamStatusLook("ON_CALL").label).toBe("On call");
  });

  it("draws focus against target as a share", () => {
    expect(focusShare(13500, 27000)).toBe(50);
    expect(focusShare(40000, 27000)).toBe(100);
    expect(focusShare(0, 0)).toBe(0);
  });
});
