"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useOrgScope } from "@/lib/org/selection";
import { getTeam } from "@/features/team/api/team";
import { usePresenceRefresh } from "@/features/presence/hooks/usePresenceRefresh";

export const teamKeys = {
  all: ["team"] as const,
  list: (org: string) => [...teamKeys.all, org, "list"] as const,
};

/**
 * Everyone in scope with today's status, in one request (SPEC 7.5): refreshed
 * every 60 seconds and on presence changes (at most every 15 seconds).
 */
export function useTeam(enabled = true) {
  const org = useOrgScope();
  const queryClient = useQueryClient();
  const key = teamKeys.list(org);
  usePresenceRefresh(() => void queryClient.invalidateQueries({ queryKey: key }), { enabled });
  return useQuery({
    queryKey: key,
    queryFn: () => getTeam({ view: "all" }),
    enabled,
    refetchInterval: 60_000,
  });
}
