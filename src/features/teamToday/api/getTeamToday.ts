import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, unwrap } from "@/lib/api/list";
import type {
  GetTeamTodayParams,
  TeamTodayTotals,
  TeamTodayView,
} from "@/features/teamToday/types";

const EMPTY_TOTALS: TeamTodayTotals = {
  people: 0,
  started: 0,
  notStarted: 0,
  onBreak: 0,
  inMeeting: 0,
  ended: 0,
  lateStarts: 0,
  pendingApprovals: 0,
  overdueApprovals: 0,
  focusSec: 0,
  quietHours: 0,
};

/** The query for `GET /team/today`: only the date and manager that are set. */
export function buildTeamTodayQuery(params: GetTeamTodayParams): Record<string, string> {
  return cleanParams({ date: params.date, managerId: params.managerId }) as Record<string, string>;
}

/**
 * `GET /team/today?date=&managerId=`: one row per person with status, focus time,
 * breaks, meetings, pending items and activity by hour. A Manager gets their
 * own reports; a Super Admin everyone, or one manager's team.
 */
export async function getTeamToday(params: GetTeamTodayParams = {}): Promise<TeamTodayView> {
  const { data } = await apiClient.get<ApiResponse<TeamTodayView>>("/api/v1/team/today", {
    params: buildTeamTodayQuery(params),
  });
  const view = unwrap(data, "Failed to load Team today");
  const rows = (Array.isArray(view.rows) ? view.rows : []).filter((row) => row?.user?.id);
  return { ...view, totals: { ...EMPTY_TOTALS, ...(view.totals ?? {}) }, rows };
}
