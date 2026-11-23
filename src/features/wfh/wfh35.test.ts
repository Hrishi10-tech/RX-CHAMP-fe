import { canAccess, isOrgFreeRoute, type Role } from "@/constants/roles";
import { notificationHref } from "@/features/notifications/lib/links";
import { personOption } from "@/features/users/hooks/usePeopleOptions";
import type { User } from "@/features/users/types";
import {
  myRuleText,
  partTimesText,
  policyRuleText,
  scheduleProblems,
  scheduleText,
  wfhDraftProblems,
} from "@/features/wfh/lib/format";
import { wfhRequestBody } from "@/features/wfh/api/wfh";

describe("3.5 work from home on 4.0: who opens what, where notices go", () => {
  it("every portal role opens Work from home, on All organisations too; Staff never use the portal", () => {
    for (const role of ["SUPER_ADMIN", "SUPER_MANAGER", "ADMIN", "MANAGER"] as Role[]) {
      expect([role, canAccess(role, "/dashboard/wfh")]).toEqual([role, true]);
    }
    expect(canAccess("USER", "/dashboard/wfh")).toBe(false);
    expect(isOrgFreeRoute("/dashboard/wfh")).toBe(true);
  });

  it("a request or a cancellation opens the approver's queue; decisions and schedules the page", () => {
    expect(notificationHref("WFH_REQUESTED")).toBe("/dashboard/wfh?tab=requests");
    expect(notificationHref("WFH_CANCELLED")).toBe("/dashboard/wfh?tab=requests");
    for (const t of ["WFH_DECIDED", "WFH_REVOKED", "WFH_SCHEDULED"])
      expect(notificationHref(t)).toBe("/dashboard/wfh");
    // About the reader's own tracked day, read in the RX Vision app: nowhere to go here.
    expect(notificationHref("WFH_AUTO_ENDED")).toBeNull();
  });
});

describe("3.5 work from home: the forms' own checks", () => {
  it("a request needs its part, a first day, and a reason", () => {
    const base = {
      kind: "FULL_DAY" as const,
      part: null,
      startDate: "2026-11-10",
      endDate: "",
      reason: "Plumber coming",
    };
    expect(wfhDraftProblems(base)).toEqual({});
    expect(wfhDraftProblems({ ...base, kind: "HALF_DAY" }).part).toMatch(
      /first or the second half/,
    );
    expect(wfhDraftProblems({ ...base, startDate: "" }).startDate).toBeTruthy();
    expect(wfhDraftProblems({ ...base, endDate: "2026-11-09" }).endDate).toMatch(/before/);
    expect(wfhDraftProblems({ ...base, reason: "x" }).reason).toMatch(/at least 3/);
  });

  it("the body drops the part on a full day and the last day on a part day", () => {
    expect(
      wfhRequestBody({
        kind: "FULL_DAY",
        part: null,
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: " a  b ",
      }),
    ).toEqual({
      kind: "FULL_DAY",
      part: undefined,
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      reason: "a b",
    });
    expect(
      wfhRequestBody({
        kind: "HALF_DAY",
        part: "FIRST_HALF",
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "r",
      }).endDate,
    ).toBeUndefined();
  });

  it("a schedule needs a person, weekdays and a start today or later", () => {
    const s = {
      userId: "u1",
      weekdays: [3],
      weeks: [],
      kind: "FULL_DAY" as const,
      part: null,
      fromDate: "2026-11-10",
      toDate: "",
      note: "",
    };
    expect(scheduleProblems(s, "2026-11-04", false)).toEqual({});
    expect(scheduleProblems({ ...s, userId: "" }, "2026-11-04", false).userId).toBeTruthy();
    expect(scheduleProblems({ ...s, weekdays: [] }, "2026-11-04", false).weekdays).toBeTruthy();
    expect(
      scheduleProblems({ ...s, fromDate: "2026-11-01" }, "2026-11-04", false).fromDate,
    ).toMatch(/today or later/);
    expect(
      scheduleProblems({ ...s, fromDate: "2026-11-01" }, "2026-11-04", true).fromDate,
    ).toBeUndefined();
    expect(scheduleProblems({ ...s, toDate: "2026-11-01" }, "2026-11-04", false).toDate).toMatch(
      /before/,
    );
  });

  it("reads a schedule back as a sentence", () => {
    expect(scheduleText([3], [])).toBe("Every Wednesday");
    expect(scheduleText([1, 5], [2, 4])).toBe("2nd and 4th Mondays and Fridays");
    expect(scheduleText([], [])).toBe("No weekday picked");
  });
});

describe("4.0: the words and the clock", () => {
  it("shows a part day's hours on the 12 hour clock", () => {
    expect(partTimesText("09:30 to 14:00")).toBe("9:30 AM to 2:00 PM");
    expect(partTimesText("22:00 to 00:15")).toBe("10:00 PM to 12:15 AM");
    expect(partTimesText(null)).toBe("");
    expect(partTimesText("whenever")).toBe("whenever");
  });

  it("states the policy with 4.0's routes: department managers, the organisation admin", () => {
    const p = {
      enabled: true,
      noticeDays: 1,
      maxDaysPerMonth: 4,
      approver: "MANAGER" as const,
      rule: "server rule",
    };
    expect(policyRuleText(p)).toBe(
      "Ask at least 1 day ahead, up to 4 days a month. Staff go to their department's managers (the organisation admin when it has none).",
    );
    expect(policyRuleText({ ...p, approver: "SUPER_ADMIN", maxDaysPerMonth: null })).toBe(
      "Ask at least 1 day ahead. The organisation admin approves.",
    );
    for (const text of [policyRuleText(p), policyRuleText({ ...p, approver: "SUPER_MANAGER" })]) {
      expect(text).not.toMatch(/report|your team/i);
    }
  });

  it("tells a Manager or an admin where their own requests go, or that they are off", () => {
    const p = { enabled: true, noticeDays: 0, maxDaysPerMonth: null };
    expect(myRuleText(p, "the organisation admin")).toBe(
      "Ask any day from today. Your requests go to the organisation admin.",
    );
    expect(myRuleText(p, null)).toMatch(/approved at once/);
    expect(myRuleText({ ...p, enabled: false }, null)).toBe(
      "Work from home requests are switched off. The organisation admin can turn them on.",
    );
  });

  it("names a person's organisation in the picker only with every organisation in view", () => {
    const u: User = {
      id: "u1",
      name: "Asha Kumar",
      department: "Billing",
      departmentRef: { id: "d1", name: "Billing" },
      companyName: "Org B",
    };
    expect(personOption(u, true)).toEqual({
      value: "u1",
      label: "Asha Kumar",
      description: "Billing · Org B",
    });
    expect(personOption(u, false).description).toBe("Billing");
    // A Manager's answer is brief: name and department only.
    expect(personOption({ id: "u2", email: "x@example.com" }, true)).toEqual({
      value: "u2",
      label: "x@example.com",
      description: undefined,
    });
  });
});
