import { buildTeamDayQuery, buildTeamMonthQuery, fileSlug, parseIds } from "./query";
import { buildTeamTodayQuery } from "@/features/teamToday/api/getTeamToday";

describe("report query strings", () => {
  it("team day: the date, and ids only when given", () => {
    expect(buildTeamDayQuery({ date: "2026-10-12" })).toEqual({ date: "2026-10-12" });
    expect(buildTeamDayQuery({ date: "2026-10-12", userIds: ["a", "b"] })).toEqual({
      date: "2026-10-12",
      userIds: "a,b",
    });
    expect(buildTeamDayQuery({ date: "2026-10-12", userIds: [] })).toEqual({ date: "2026-10-12" });
  });

  it("team month: the month, the department and the ids that are set", () => {
    expect(buildTeamMonthQuery({ month: "2026-09" })).toEqual({ month: "2026-09" });
    expect(
      buildTeamMonthQuery({ month: "2026-09", departmentId: "d-1", userIds: ["a", "b"] }),
    ).toEqual({
      month: "2026-09",
      departmentId: "d-1",
      userIds: "a,b",
    });
    expect(buildTeamMonthQuery({ month: "2026-09", userIds: ["a"], departmentId: "" })).toEqual({
      month: "2026-09",
      userIds: "a",
    });
  });

  it("team day: a department goes as its id", () => {
    expect(buildTeamDayQuery({ date: "2026-10-12", departmentId: "d-1" })).toEqual({
      date: "2026-10-12",
      departmentId: "d-1",
    });
    // An older link that also names people keeps them (the server takes both).
    expect(buildTeamDayQuery({ date: "2026-10-12", departmentId: "d-1", userIds: ["a"] })).toEqual({
      date: "2026-10-12",
      departmentId: "d-1",
      userIds: "a",
    });
  });

  it("team today: date and manager only when set", () => {
    expect(buildTeamTodayQuery({})).toEqual({});
    expect(buildTeamTodayQuery({ date: "2026-10-12", managerId: "m-1" })).toEqual({
      date: "2026-10-12",
      managerId: "m-1",
    });
  });
});

describe("parseIds", () => {
  it("splits, trims and deduplicates", () => {
    expect(parseIds(" a, b,,a ,c")).toEqual(["a", "b", "c"]);
    expect(parseIds(null)).toEqual([]);
    expect(parseIds("")).toEqual([]);
  });
});

describe("fileSlug", () => {
  it("makes a safe file name piece", () => {
    expect(fileSlug("Asha Kumar")).toBe("asha-kumar");
    expect(fileSlug("../../R&D Team")).toBe("r-d-team");
    expect(fileSlug("***")).toBe("report");
  });
});
