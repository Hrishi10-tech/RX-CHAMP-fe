"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { agentHealthKeys, getAgentHealth } from "@/features/agentHealth/api/agentHealth";
import type { GetAgentHealthParams } from "@/features/agentHealth/types";

/** Polled every minute: it is a live board. Cached per organisation in view. */
export function useAgentHealth(params: GetAgentHealthParams = {}, enabled = true) {
  return useQuery({
    queryKey: agentHealthKeys.list(params),
    queryFn: () => getAgentHealth(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
