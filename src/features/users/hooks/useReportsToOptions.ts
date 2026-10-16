"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, ShieldCheck } from "lucide-react";

import { ROLE_LABEL } from "@/constants/roles";
import type { SelectOption } from "@/components/ui/types";
import { getUsers } from "@/features/users/api/getUsers";
import type { User } from "@/features/users/types";

/** Everyone who can have reports: active Managers and Super Admins. */
async function getPossibleManagers(): Promise<User[]> {
  // limit 100 is the API's maximum page size; teams large enough to need more
  // managers than that would need a search-as-you-type picker instead.
  const [managers, superAdmins] = await Promise.all([
    getUsers({ role: "MANAGER", limit: 100, sort: "name_asc" }),
    getUsers({ role: "SUPER_ADMIN", limit: 100, sort: "name_asc" }),
  ]);
  return [...managers.users, ...superAdmins.users].filter(
    (u) => (u.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
  );
}

function displayName(u: User): string {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return u.name || full || u.email || "Unnamed";
}

/**
 * "Reports to" choices for the Super Admin's member forms. `excludeId` drops the
 * person being edited (nobody reports to themselves).
 */
export function useReportsToOptions(enabled: boolean, excludeId?: string) {
  const query = useQuery({
    queryKey: ["users", "possible-managers"],
    queryFn: getPossibleManagers,
    enabled,
    staleTime: 60_000,
  });

  const options = useMemo<SelectOption[]>(
    () =>
      (query.data ?? [])
        .filter((u) => u.id !== excludeId)
        .map((u) => {
          const superAdmin = (u.role ?? "").toUpperCase() === "SUPER_ADMIN";
          return {
            value: u.id,
            label: displayName(u),
            description: [superAdmin ? ROLE_LABEL.SUPER_ADMIN : ROLE_LABEL.MANAGER, u.department]
              .filter(Boolean)
              .join(" · "),
            icon: superAdmin ? ShieldCheck : Crown,
          };
        }),
    [query.data, excludeId],
  );

  return { options, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
