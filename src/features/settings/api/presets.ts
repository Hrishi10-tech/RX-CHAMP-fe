import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";

/** The kinds of comment box that offer quick answers (3.2, fix 12). */
export type PresetKind =
  | "LATE_DAY_START"
  | "BREAK_EARLY"
  | "BREAK_LATE"
  | "BREAK_SKIP"
  | "SKIP_COMMENT"
  | "BREAK_OVERRUN"
  | "MEETING_AGENDA"
  | "DECISION_NOTE";

export interface ReasonPresetsView {
  presets: Record<PresetKind, string[]>;
  kinds: { kind: PresetKind; label: string; asked: string }[];
  limits: { perKind: number; textMax: number };
}

/**
 *   GET /settings/reason-presets   (any role)
 *   PUT /settings/reason-presets   (Super Admin) { presets: { KIND: string[] | null } }
 */
export async function getReasonPresets(): Promise<ReasonPresetsView> {
  const { data } = await apiClient.get<ApiResponse<ReasonPresetsView>>(
    "/api/v1/settings/reason-presets",
  );
  return unwrap(data, "Failed to load the quick answers");
}

export async function putReasonPresets(
  presets: Partial<Record<PresetKind, string[] | null>>,
): Promise<ReasonPresetsView> {
  const { data } = await apiClient.put<ApiResponse<ReasonPresetsView>>(
    "/api/v1/settings/reason-presets",
    { presets },
  );
  return unwrap(data, "Failed to save the quick answers");
}
