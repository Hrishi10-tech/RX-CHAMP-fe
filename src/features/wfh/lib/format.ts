import { formatTime12 } from "@/lib/time/format";
import type { ApproverRoute } from "@/features/leave/types";
import type { WfhDraft, WfhPolicyView, WfhScheduleInput } from "@/features/wfh/types";
import { REASON_MAX, REASON_MIN } from "@/features/leave/lib/format";

/**
 * Who each policy route sends Staff requests to, in 4.0 words (backend
 * `leave/domain/routing.ts`). The route names are 3.5's: "SUPER_ADMIN" means the
 * organisation's admin in 4.0, and the manager route is the department's
 * managers, not a reporting line. The API's own labels still read the 3.5 way.
 */
export const ROUTE_TEXT: Record<ApproverRoute, { label: string; rule: string }> = {
  MANAGER: {
    label: "The department's managers",
    rule: "Staff go to their department's managers (the organisation admin when it has none).",
  },
  SUPER_MANAGER: {
    label: "The Super Manager",
    rule: "The Super Manager approves (the organisation admin when there is none).",
  },
  SUPER_ADMIN: {
    label: "The organisation admin",
    rule: "The organisation admin approves.",
  },
};

/** "Ask at least 1 day ahead, up to 4 days a month". */
function limitsText(p: Pick<WfhPolicyView, "noticeDays" | "maxDaysPerMonth">): string {
  const notice =
    p.noticeDays === 0
      ? "Ask any day from today"
      : `Ask at least ${p.noticeDays} ${p.noticeDays === 1 ? "day" : "days"} ahead`;
  const cap =
    p.maxDaysPerMonth === null
      ? ""
      : `, up to ${p.maxDaysPerMonth} ${p.maxDaysPerMonth === 1 ? "day" : "days"} a month`;
  return `${notice}${cap}`;
}

/** The organisation's rule, as the policy tab states it (4.0 routing words). */
export function policyRuleText(
  p: Pick<WfhPolicyView, "enabled" | "noticeDays" | "maxDaysPerMonth" | "approver" | "rule">,
): string {
  const route = ROUTE_TEXT[p.approver];
  if (!route) return p.rule;
  return `${limitsText(p)}. ${route.rule}`;
}

/**
 * The rule as it applies to the signed-in person (4.0). The policy's route is
 * the Staff route; a Manager's or an admin's own request goes elsewhere, so the
 * notice and cap are read from the policy and the approver from `waitingFor`.
 */
export function myRuleText(
  policy: Pick<WfhPolicyView, "enabled" | "noticeDays" | "maxDaysPerMonth">,
  waitingFor: string | null,
): string {
  if (!policy.enabled) {
    return "Work from home requests are switched off. The organisation admin can turn them on.";
  }
  const who = waitingFor
    ? `Your requests go to ${waitingFor}.`
    : "Nobody else approves yours: they are approved at once.";
  return `${limitsText(policy)}. ${who}`;
}

export const WEEKDAY_OPTIONS: { value: number; label: string; long: string }[] = [
  { value: 1, label: "Mon", long: "Monday" },
  { value: 2, label: "Tue", long: "Tuesday" },
  { value: 3, label: "Wed", long: "Wednesday" },
  { value: 4, label: "Thu", long: "Thursday" },
  { value: 5, label: "Fri", long: "Friday" },
  { value: 6, label: "Sat", long: "Saturday" },
  { value: 7, label: "Sun", long: "Sunday" },
];

export const WEEK_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: 5, label: "5th" },
];

export const NOTE_MAX = 300;

/** The draft's own problems (the server checks the rest). */
export function wfhDraftProblems(
  d: WfhDraft,
): Partial<Record<"part" | "startDate" | "endDate" | "reason", string>> {
  const out: Partial<Record<"part" | "startDate" | "endDate" | "reason", string>> = {};
  if (d.kind !== "FULL_DAY" && !d.part) {
    out.part = d.kind === "HALF_DAY" ? "Pick the first or the second half." : "Pick which quarter.";
  }
  if (!d.startDate) out.startDate = "Pick the first day.";
  if (d.kind === "FULL_DAY" && d.endDate && d.startDate && d.endDate < d.startDate) {
    out.endDate = "The last day is before the first day.";
  }
  const reason = d.reason.trim();
  if (reason.length < REASON_MIN) out.reason = `Give a reason, at least ${REASON_MIN} characters.`;
  else if (reason.length > REASON_MAX) out.reason = `Keep it under ${REASON_MAX} characters.`;
  return out;
}

/** The schedule form's own problems. */
export function scheduleProblems(
  s: WfhScheduleInput,
  today: string,
  editing: boolean,
): Partial<Record<"userId" | "weekdays" | "part" | "fromDate" | "toDate" | "note", string>> {
  const out: Partial<
    Record<"userId" | "weekdays" | "part" | "fromDate" | "toDate" | "note", string>
  > = {};
  if (!s.userId) out.userId = "Pick a person.";
  if (!s.weekdays.length) out.weekdays = "Pick at least one weekday.";
  if (s.kind !== "FULL_DAY" && !s.part) {
    out.part = s.kind === "HALF_DAY" ? "Pick the first or the second half." : "Pick which quarter.";
  }
  if (!s.fromDate) out.fromDate = "Pick the first day.";
  else if (!editing && s.fromDate < today) out.fromDate = "A schedule starts today or later.";
  if (s.toDate && s.fromDate && s.toDate < s.fromDate)
    out.toDate = "The last day is before the first day.";
  if (s.note.trim().length > NOTE_MAX) out.note = `Keep it under ${NOTE_MAX} characters.`;
  return out;
}

/** "Every Wednesday", "1st and 3rd Fridays" (the form's own preview; the server labels the saved one). */
export function scheduleText(weekdays: number[], weeks: number[]): string {
  const names = [...weekdays]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_OPTIONS.find((o) => o.value === d)?.long ?? "")
    .filter(Boolean);
  const join = (items: string[]) =>
    items.length <= 1
      ? items.join("")
      : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  if (!names.length) return "No weekday picked";
  if (!weeks.length) return `Every ${join(names)}`;
  const ordinals = [...weeks]
    .sort((a, b) => a - b)
    .map((w) => WEEK_OPTIONS.find((o) => o.value === w)?.label ?? "");
  return `${join(ordinals)} ${join(names.map((n) => `${n}s`))}`;
}

/**
 * A part day's hours on the 12 hour clock (4.0, SPEC 2.10): the API sends
 * "09:30 to 14:00" (24-hour); people read "9:30 AM to 2:00 PM". Anything else is
 * shown as it came.
 */
export function partTimesText(partTimes: string | null | undefined): string {
  if (!partTimes) return "";
  const m = /^\s*(\d{1,2}:\d{2})\s+to\s+(\d{1,2}:\d{2})\s*$/.exec(partTimes);
  if (!m) return partTimes;
  const from = formatTime12(m[1]);
  const to = formatTime12(m[2]);
  return from && to ? `${from} to ${to}` : partTimes;
}
