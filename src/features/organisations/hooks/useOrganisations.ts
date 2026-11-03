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
import {
  choiceOf,
  getSuperManagerOrgChoices,
  type OrgChoice,
} from "@/features/organisations/api/orgChoices";
import type { CreateAdminInput, OrganisationView } from "@/features/organisations/types";
import { getSelectedOrg, selectOrg } from "@/lib/org/selection";

/** Platform data: not tied to one organisation (QueryProvider leaves these unscoped). */
export const organisationKeys = {
  all: ["organisations"] as const,
  platform: ["platform-overview"] as const,
  /** 3.3: the Super Manager's switcher list (unscoped: the head is "organisations"). */
  choices: ["organisations", "choices"] as const,
};

export function useOrganisations(enabled = true) {
  return useQuery({
    queryKey: organisationKeys.all,
    queryFn: getOrganisations,
    enabled,
    staleTime: 60_000,
  });
}

const toChoices = (list: OrganisationView[]): OrgChoice[] => list.map(choiceOf);

/**
 * The organisations the switcher offers: the Super Admin's from GET /organisations
 * (shared with the Organisations page), the Super Manager's (3.3) from GET
 * /companies on the combined view.
 */
export function useOrgChoices(superManager: boolean, enabled = true) {
  const admin = useQuery({
    queryKey: organisationKeys.all,
    queryFn: getOrganisations,
    enabled: enabled && !superManager,
    staleTime: 60_000,
    select: toChoices,
  });
  const manager = useQuery({
    queryKey: organisationKeys.choices,
    queryFn: getSuperManagerOrgChoices,
    enabled: enabled && superManager,
    staleTime: 60_000,
  });
  return superManager ? manager : admin;
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
