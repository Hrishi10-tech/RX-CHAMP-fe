import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";
import { daySummaryOf } from "@/features/reports/api/reports";
import type { MyDayReport } from "@/features/myday/types";

/**
 * 4.1, Staff's own pages (any role may call these; they answer for the caller):
 *
 *   GET  /reports/me/day?date=        one day: summary, timeline, breaks, meetings, punches
 *   POST /workday/me/late-reason      { reason, date? }  why the day started late
 *   POST /workday/me/wfh/start        a remote day (biometric staff, approved work from home)
 *   POST /workday/me/wfh/end          ends it; Start again resumes it
 */

function list<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export async function getMyDayReport(date: string): Promise<MyDayReport> {
  const { data } = await apiClient.get<ApiResponse<MyDayReport>>("/api/v1/reports/me/day", {
    params: { date },
  });
  const r = unwrap(data, "Failed to load your day");
  if (!r.summary) throw new Error("Your day came back incomplete.");
  return {
    ...r,
    summary: daySummaryOf(r.summary),
    timeline: list(r.timeline),
    breaks: list(r.breaks),
    meetings: list(r.meetings),
    adjustments: list(r.adjustments),
    punches: list(r.punches),
  };
}

/**
 * 4.1: start (or resume) a remote day: biometric staff on an approved or scheduled work-from-home
 * day, from the portal as from the phone. 409 ATTENDANCE_BY_AGENT, WFH_NOT_APPROVED, WFH_PENDING,
 * CHECKED_IN_AT_OFFICE, with the reason in words.
 */
export async function startRemoteDay(): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>("/api/v1/workday/me/wfh/start");
  unwrap(data, "Couldn't start your remote day");
}

/** 4.1: end the remote day now (409 WFH_NOT_RUNNING when none is running). */
export async function endRemoteDay(): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>("/api/v1/workday/me/wfh/end");
  unwrap(data, "Couldn't end your remote day");
}

/** Why the day started late: today, or an earlier day by date (3.2). */
export async function submitLateReason(input: { reason: string; date?: string }): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    "/api/v1/workday/me/late-reason",
    input,
  );
  unwrap(data, "Couldn't save the reason");
}
