import { apiClient, type ApiResponse } from "@/lib/api";
import { cleanParams, readItems, unwrap } from "@/lib/api/list";
import type {
  AdjustFocusInput,
  FocusAdjustmentView,
  ListAdjustmentsParams,
} from "@/features/adjustments/types";

const BASE = "/api/v1/focus-adjustments";

/**
 * `GET /focus-adjustments`: the organisation in view (Admin, Super Admin, Super
 * Manager; X-Org-Id goes with every request); a Manager the Staff of their
 * departments.
 */
export async function getAdjustments(
  params: ListAdjustmentsParams = {},
): Promise<FocusAdjustmentView[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: FocusAdjustmentView[] }>>(BASE, {
    params: cleanParams({
      userId: params.userId,
      month: params.month,
      companyId: params.companyId,
      includeVoided: params.includeVoided === false ? "false" : undefined,
      limit: params.limit,
    }),
  });
  return readItems<FocusAdjustmentView>(unwrap(data, "Failed to load adjustments"));
}

/** `GET /focus-adjustments/me`: the signed-in person's own live adjustments. */
export async function getMyAdjustments(month?: string): Promise<FocusAdjustmentView[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: FocusAdjustmentView[] }>>(
    `${BASE}/me`,
    { params: cleanParams({ month }) },
  );
  return readItems<FocusAdjustmentView>(unwrap(data, "Failed to load your adjustments"));
}

/** `POST /focus-adjustments` (Super Manager). */
export async function createAdjustment(input: AdjustFocusInput): Promise<FocusAdjustmentView> {
  const { data } = await apiClient.post<ApiResponse<FocusAdjustmentView>>(BASE, input);
  return unwrap(data, "Failed to adjust focus time");
}

/** `DELETE /focus-adjustments/:id` (Super Manager): undoes one; the trail keeps it. */
export async function voidAdjustment(id: string): Promise<FocusAdjustmentView> {
  const { data } = await apiClient.delete<ApiResponse<FocusAdjustmentView>>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  return unwrap(data, "Failed to undo the adjustment");
}
