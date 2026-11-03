import type { ApiResponse } from "@/lib/api";
import { apiClient, ORG_HEADER } from "@/lib/api/client";
import { readItems } from "@/lib/api/list";
import type { OrganisationView } from "@/features/organisations/types";

/** One organisation the switcher and "Pick an organisation" offer. */
export interface OrgChoice {
  id: string;
  name: string;
  /** A short second line ("Admin Asha Raman", "12 staff"). */
  hint: string;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** The Super Admin's list comes from GET /organisations (platform data): one row as a choice. */
export function choiceOf(o: OrganisationView): OrgChoice {
  return { id: o.id, name: o.name, hint: o.admin ? `Admin ${o.admin.name}` : "No admin yet" };
}

/**
 * The Super Manager's list (3.3): GET /companies, which answers every live
 * organisation to her on the combined view. `X-Org-Id: all` keeps the
 * organisation currently picked from narrowing it to that one.
 */
export async function getSuperManagerOrgChoices(): Promise<OrgChoice[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/api/v1/companies", {
    params: { limit: 100 },
    headers: { [ORG_HEADER]: "all" },
  });
  if (!data?.success) throw new Error(data?.message ?? "Failed to load organisations");
  return readItems<unknown>(data.data)
    .map((raw) => {
      const r = rec(raw);
      if (typeof r.id !== "string") return null;
      const staff = typeof r.userCount === "number" ? r.userCount : null;
      return {
        id: r.id,
        name: typeof r.name === "string" ? r.name : "",
        hint: staff === null ? "" : `${staff} staff`,
      };
    })
    .filter((o): o is OrgChoice => o !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
