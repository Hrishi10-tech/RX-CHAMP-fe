"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useOrgScope } from "@/lib/org/selection";
import {
  clearWorkWeek,
  getCalendar,
  getPersonYear,
  setSaturdays,
  setWorkWeek,
  type WeekScope,
} from "@/features/calendar/api/calendar";
import { getUsers } from "@/features/users/api/getUsers";
import type { User } from "@/features/users/types";
import type { SaturdayRule, WorkWeekInput } from "@/features/calendar/types";

export const calendarKeys = {
  all: ["calendar"] as const,
  year: (org: string, year: number) => [...calendarKeys.all, org, year] as const,
  person: (org: string, userId: string, year: number) =>
    [...calendarKeys.all, org, "person", userId, year] as const,
  people: (org: string, q: string) => [...calendarKeys.all, org, "people", q] as const,
};

/** The organisation's calendar for a year (`GET /calendar`). */
export function useCalendarYear(year: number) {
  const org = useOrgScope();
  return useQuery({ queryKey: calendarKeys.year(org, year), queryFn: () => getCalendar(year) });
}

/** Every calendar change re-reads the calendar and any person's year shown. */
function useInvalidateCalendar() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: calendarKeys.all });
}

export function useSaveSaturdays() {
  const invalidate = useInvalidateCalendar();
  return useMutation({
    mutationFn: ({ rule, anchor }: { rule: SaturdayRule; anchor?: string | null }) =>
      setSaturdays(rule, anchor),
    onSuccess: () => invalidate(),
  });
}

export function useSaveWorkWeek() {
  const invalidate = useInvalidateCalendar();
  return useMutation({
    mutationFn: ({
      scope,
      ids,
      input,
    }: {
      scope: WeekScope;
      ids: string[];
      input: WorkWeekInput;
    }) => setWorkWeek(scope, ids, input),
    onSuccess: () => invalidate(),
  });
}

export function useClearWorkWeek() {
  const invalidate = useInvalidateCalendar();
  return useMutation({
    mutationFn: ({ scope, ids }: { scope: WeekScope; ids: string[] }) => clearWorkWeek(scope, ids),
    onSuccess: () => invalidate(),
  });
}

/** One person's year with what decides each day (`GET /calendar/people/:userId/year`). */
export function usePersonYear(userId: string | null, year: number) {
  const org = useOrgScope();
  return useQuery({
    queryKey: calendarKeys.person(org, userId ?? "", year),
    queryFn: () => getPersonYear(userId ?? "", year),
    enabled: Boolean(userId),
  });
}

export const PEOPLE_PAGE = 50;

/** A person's name as the members list shows it. */
export function nameOf(u: User): string {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return u.name || full || u.email || "Unnamed";
}

/** A person's one department, whichever shape the members list sends it in. */
export function departmentIdOf(u: User): string | null {
  if (u.departmentId) return u.departmentId;
  if (u.departmentRef?.id) return u.departmentRef.id;
  if (u.department && typeof u.department === "object") return u.department.id ?? null;
  return null;
}

/**
 * Active people the viewer may see (`GET /users`, a Manager's: their team), by
 * name, one page of them; the search narrows it on the server.
 */
export function useCalendarPeople(q: string, enabled = true) {
  const org = useOrgScope();
  return useQuery({
    queryKey: calendarKeys.people(org, q),
    queryFn: async () => {
      const { users, meta } = await getUsers({
        page: 1,
        limit: PEOPLE_PAGE,
        q: q || undefined,
        status: "ACTIVE",
        sort: "name_asc",
      });
      return { users, total: meta?.total ?? users.length };
    },
    enabled,
    staleTime: 30_000,
  });
}
