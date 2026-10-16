"use client";

import { useQuery } from "@tanstack/react-query";

import { getAgentVersion } from "@/features/agent/api/getAgentVersion";
import { getSetupCode } from "@/features/agent/api/getSetupCode";
import type { AgentPlatform } from "@/features/agent/types";

export const agentKeys = {
  version: (platform: AgentPlatform) => ["agent", "version", platform] as const,
  setupCode: (userId: string) => ["agent", "setup-code", userId] as const,
};

export function useAgentVersion(platform: AgentPlatform, enabled = true) {
  return useQuery({
    queryKey: agentKeys.version(platform),
    queryFn: () => getAgentVersion(platform),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetched only while the Mac instructions are on screen, and never cached past
 * the dialog: it is a sign-in credential for someone else.
 */
export function useSetupCode(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: agentKeys.setupCode(userId),
    queryFn: () => getSetupCode(userId),
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
