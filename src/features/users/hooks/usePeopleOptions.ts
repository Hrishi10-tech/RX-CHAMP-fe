"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SelectOption } from "@/components/ui/types";
import { getUsers } from "@/features/users/api/getUsers";
import type { User } from "@/features/users/types";

/** GET /users takes at most 100 a page (4.0, SPEC 5.3). */
const PAGE = 100;
const MAX_PAGES = 5;

/**
 * Everyone the caller may see, active, by name (4.0 `GET /users`): an Admin, or a
 * Super Admin or the Super Manager inside an organisation, its people (Super Admins
 * left out); on "All organisations" everyone in every organisation, each with
 * their organisation; a Manager the Staff of their departments. The organisation
 * travels as X-Org-Id, and the query cache is kept per organisation.
 */
async function getPeople(): Promise<User[]> {
  const out: User[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { users, meta } = await getUsers({
      page,
      limit: PAGE,
      sort: "name_asc",
      status: "ACTIVE",
    });
    out.push(...users);
    const last = meta?.totalPages ? page >= meta.totalPages : users.length < PAGE;
    if (last) break;
  }
  // A Manager's answer has no status (few fields); the filter above already applied.
  return out.filter((u) => (u.status ?? "ACTIVE").toUpperCase() === "ACTIVE");
}

export function personName(u: User): string {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return u.name || full || u.email || "Unnamed";
}

/** The department's name, whichever way 4.0 sent it (text, or `{ id, name }`). */
function departmentName(u: User): string | null {
  if (u.departmentRef?.name) return u.departmentRef.name;
  if (typeof u.department === "string") return u.department || null;
  return u.department?.name ?? null;
}

/**
 * One person as a picker option: the name, and the department under it; with
 * several organisations in view, the organisation too.
 */
export function personOption(u: User, showOrg = false): SelectOption {
  const org = showOrg ? (u.companyName ?? u.company ?? null) : null;
  return {
    value: u.id,
    label: personName(u),
    description: [departmentName(u), org].filter(Boolean).join(" · ") || undefined,
  };
}

/**
 * People as select options: a person picker for dialogs (3.5 on 4.0).
 * `excludeId` leaves someone out (usually the caller); `showOrg` names each
 * person's organisation ("All organisations").
 */
export function usePeopleOptions(
  enabled: boolean,
  opts: { excludeId?: string; showOrg?: boolean } = {},
) {
  const { excludeId, showOrg = false } = opts;
  const query = useQuery({
    queryKey: ["users", "people-options"],
    queryFn: getPeople,
    enabled,
    staleTime: 60_000,
  });
  const people = useMemo(() => query.data ?? [], [query.data]);
  const options = useMemo<SelectOption[]>(
    () => people.filter((u) => u.id !== excludeId).map((u) => personOption(u, showOrg)),
    [people, excludeId, showOrg],
  );
  return { options, people, isLoading: query.isLoading, isError: query.isError };
}
