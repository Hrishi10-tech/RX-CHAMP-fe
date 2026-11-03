import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, unwrap } from "@/lib/api/list";
import type {
  AgentHealthSummary,
  AgentHealthView,
  GetAgentHealthParams,
} from "@/features/agentHealth/types";

export const agentHealthKeys = {
  all: ["agent-health"] as const,
  list: (params: GetAgentHealthParams) => [...agentHealthKeys.all, params] as const,
};

const EMPTY_SUMMARY: AgentHealthSummary = {
  people: 0,
  tracking: 0,
  offline: 0,
  notStarted: 0,
  ended: 0,
  screenshotsOff: 0,
  noScreenshots: 0,
  refused: 0,
};

/** The query for `GET /agent-health`: only the filters that are set. */
export function buildAgentHealthQuery(
  params: GetAgentHealthParams,
): Record<string, string | number | boolean> {
  return cleanParams({
    companyId: params.companyId,
    departmentId: params.departmentId,
    problemsOnly: params.problemsOnly === true ? true : undefined,
  });
}

/**
 * `GET /agent-health` (3.3 on 4.0): a Manager the Staff of their departments, an
 * Admin their organisation, a Super Admin or the Super Manager the organisation in
 * view (X-Org-Id, sent by the API client) or every organisation at once.
 */
export async function getAgentHealth(params: GetAgentHealthParams = {}): Promise<AgentHealthView> {
  const { data } = await apiClient.get<ApiResponse<AgentHealthView>>("/api/v1/agent-health", {
    params: buildAgentHealthQuery(params),
  });
  const view = unwrap(data, "Failed to load agent health");
  return {
    ...view,
    organisationId: view.organisationId ?? null,
    summary: { ...EMPTY_SUMMARY, ...(view.summary ?? {}) },
    rows: Array.isArray(view.rows) ? view.rows.filter((r) => r?.userId) : [],
  };
}

/**
 * For other screens (the Overview's "agents that need a look"):
 * `fetchAgentHealth({ problemsOnly: true })`.
 */
export function fetchAgentHealth(params: GetAgentHealthParams = {}): Promise<AgentHealthView> {
  return getAgentHealth(params);
}
