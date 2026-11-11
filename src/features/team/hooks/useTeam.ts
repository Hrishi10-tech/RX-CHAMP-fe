"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { useOrgScope } from "@/lib/org/selection";
import { getTeam } from "@/features/team/api/team";
import { usePresenceRefresh } from "@/features/presence/hooks/usePresenceRefresh";
import type { TeamQuery } from "@/features/team/types";

export const teamKeys = {
  all: ["team"] as const,
  list: (org: string, query: TeamQuery) => [...teamKeys.all, org, "list", query] as const,
};

/**
 * One page of the team with today's status (SPEC 7.5): refreshed every 60
 * seconds and on presence changes (at most every 15 seconds). The previous page
 * stays on screen while the next one loads.
 */
export function useTeam(query: TeamQuery, enabled = true) {
  const org = useOrgScope();
  const queryClient = useQueryClient();
  usePresenceRefresh(
    () => void queryClient.invalidateQueries({ queryKey: [...teamKeys.all, org] }),
    { enabled },
  );
  return useQuery({
    queryKey: teamKeys.list(org, query),
    queryFn: () => getTeam(query),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}
