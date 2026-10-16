import {
  approvalPath,
  buildApprovalsQuery,
  paramsForFilters,
  type ApprovalsFilters,
} from "./query";

const base: ApprovalsFilters = {
  tab: "pending",
  decision: "ALL",
  category: "",
  userId: "",
  scope: "mine",
  page: 1,
  limit: 50,
};

describe("paramsForFilters", () => {
  it("asks for pending items on the Pending tab", () => {
    expect(paramsForFilters(base)).toEqual({
      status: "PENDING",
      overdue: undefined,
      scope: "mine",
      userId: undefined,
      page: 1,
      limit: 50,
    });
  });

  it("adds overdue=true on the Overdue tab", () => {
    expect(paramsForFilters({ ...base, tab: "overdue" })).toMatchObject({
      status: "PENDING",
      overdue: true,
    });
  });

  it("uses the decision filter on All decisions", () => {
    expect(paramsForFilters({ ...base, tab: "decisions" }).status).toBe("DECIDED");
    expect(paramsForFilters({ ...base, tab: "decisions", decision: "REJECTED" }).status).toBe(
      "REJECTED",
    );
  });

  it("turns the Type filter into type or category", () => {
    expect(paramsForFilters({ ...base, category: "TYPE_MEETING" })).toMatchObject({
      type: "MEETING",
    });
    expect(paramsForFilters({ ...base, category: "TYPE_BREAK" })).toMatchObject({ type: "BREAK" });
    const one = paramsForFilters({ ...base, category: "BREAK_AUTO_SKIP", userId: "u1" });
    expect(one).toMatchObject({ category: "BREAK_AUTO_SKIP", userId: "u1" });
    expect(one.type).toBeUndefined();
  });
});

describe("buildApprovalsQuery", () => {
  it("sends only what is set", () => {
    expect(
      buildApprovalsQuery({
        status: "PENDING",
        scope: "all",
        overdue: true,
        category: "BREAK_SKIP",
        userId: "",
        page: 2,
        limit: 50,
      }),
    ).toEqual({
      status: "PENDING",
      scope: "all",
      overdue: true,
      category: "BREAK_SKIP",
      page: 2,
      limit: 50,
    });
  });

  it("never sends overdue=false", () => {
    expect(buildApprovalsQuery({ status: "ALL", overdue: false })).toEqual({ status: "ALL" });
  });

  it("leaves scope out for a Manager", () => {
    expect(buildApprovalsQuery({ status: "PENDING", scope: "all" }, false)).toEqual({
      status: "PENDING",
    });
  });
});

describe("approvalPath", () => {
  it("uses the lower-case type segment", () => {
    expect(approvalPath("BREAK", "b-1", "approve")).toBe("/api/v1/approvals/break/b-1/approve");
    expect(approvalPath("MEETING", "m 2", "reopen")).toBe("/api/v1/approvals/meeting/m%202/reopen");
  });
});
