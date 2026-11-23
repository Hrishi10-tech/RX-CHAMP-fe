import type { WfhListParams } from "@/features/wfh/types";

export const wfhKeys = {
  all: ["wfh"] as const,
  me: () => [...wfhKeys.all, "me"] as const,
  policy: () => [...wfhKeys.all, "policy"] as const,
  preview: (draft: unknown) => [...wfhKeys.all, "preview", draft] as const,
  list: (params: WfhListParams) => [...wfhKeys.all, "requests", params] as const,
  summary: (companyId?: string) => [...wfhKeys.all, "summary", companyId ?? ""] as const,
  schedules: (params: Record<string, unknown>) => [...wfhKeys.all, "schedules", params] as const,
};
