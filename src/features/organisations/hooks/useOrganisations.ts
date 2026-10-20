"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganisation,
  createOrganisationAdmin,
  deleteOrganisation,
  getOrganisations,
  getPlatformOverview,
  renameOrganisation,
} from "@/features/organisations/api/organisations";
import type { CreateAdminInput } from "@/features/organisations/types";
import { getSelectedOrg, selectOrg } from "@/lib/org/selection";

/** Platform data: not tied to one organisation (QueryProvider leaves these unscoped). */
export const organisationKeys = {
  all: ["organisations"] as const,
  platform: ["platform-overview"] as const,
};

export function useOrganisations(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.all,
    queryFn: getOrganisations,
    enabled,
    staleTime: 60_000,
  });
}

/** The Super Admin's platform overview, refreshed every minute. */
export function usePlatformOverview(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.platform,
    queryFn: getPlatformOverview,
    enabled,
    refetchInterval: 60_000,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: organisationKeys.all }),
      queryClient.invalidateQueries({ queryKey: organisationKeys.platform }),
    ]);
}

export function useCreateOrganisation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (name: string) => createOrganisation(name),
    onSuccess: () => invalidate(),
  });
}

export function useRenameOrganisation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameOrganisation(id, name),
    onSuccess: (_data, { id, name }) => {
      // Keep the switcher's label in step with the new name.
      if (getSelectedOrg()?.id === id) selectOrg({ id, name });
      return invalidate();
    },
  });
}

export function useDeleteOrganisation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => deleteOrganisation(id),
    onSuccess: (_data, id) => {
      if (getSelectedOrg()?.id === id) selectOrg(null);
      return invalidate();
    },
  });
}

export function useCreateOrganisationAdmin() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateAdminInput }) =>
      createOrganisationAdmin(id, input),
    onSuccess: () => invalidate(),
  });
}
