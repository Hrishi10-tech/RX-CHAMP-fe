"use client";

import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Layers, Plus, Search, UserRound, UsersRound } from "lucide-react";

import { DataTable } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/Select";
import { ErrorState } from "@/components/ui/StatePanel";
import { btnPrimary, cardBase } from "@/components/ui/classes";
import type { Column, SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrgScope } from "@/lib/org/selection";
import { departmentIcon } from "@/features/departments/lib/icons";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { getUsers } from "@/features/users/api/getUsers";
import {
  ANY,
  EMPTY_MEMBER_FILTERS,
  asDepartmentFilter,
  asRoleFilter,
  asStatusFilter,
  countActiveFilters,
  roleFilterOptions,
  statusFilterOptions,
} from "@/features/users/lib/memberQuery";
import { mapUserToMember, memberColumns } from "@/features/users/lib/memberTable";
import { useMemberActions } from "@/features/users/hooks/useMemberActions";
import { canChangeMember } from "@/features/users/lib/memberAccess";
import { useSession } from "@/features/auth/hooks/useSession";
import { MemberFormDialog } from "@/features/users/components/MemberFormDialog";
import { MemberSortPopover } from "@/features/users/components/MemberSortPopover";
import type { GetUsersParams, MemberFilters, MemberSortKey } from "@/features/users/types";
import type { TeamMember } from "@/types";

const MEMBERS_PAGE_SIZE = 10;

export const userKeys = {
  all: ["users"] as const,
  list: (org: string, params: GetUsersParams) => [...userKeys.all, org, "list", params] as const,
};

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof UsersRound;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-xl font-bold leading-tight text-slate-900">{value}</p>
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/**
 * Team management (SPEC 7.2): everyone in the organisation, with filters and
 * the row actions only an Admin or Super Admin has. One request per page of
 * the table (React Query, cached per organisation).
 */
/** How many people of one role match the filters (the server's `meta.total`). */
function useRoleTotal(
  org: string,
  role: "MANAGER" | "USER",
  filters: Pick<GetUsersParams, "q" | "departmentId" | "status">,
): number | undefined {
  const params: GetUsersParams = { ...filters, role, page: 1, limit: 1 };
  const query = useQuery({
    queryKey: userKeys.list(org, params),
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
    select: (r) => r.meta?.total ?? r.users.length,
  });
  return query.data;
}

export function MembersSection() {
  const org = useOrgScope();
  const { user: me, role } = useSession();
  const myId = me?.id;
  const queryClient = useQueryClient();
  const departments = useDepartments();
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim(), 300);
  const [filters, setFilters] = useState<MemberFilters>(EMPTY_MEMBER_FILTERS);
  const [sort, setSort] = useState<MemberSortKey | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; member: TeamMember | null }>({
    open: false,
    member: null,
  });

  const params: GetUsersParams = useMemo(
    () => ({
      page,
      limit: MEMBERS_PAGE_SIZE,
      q: q || undefined,
      role: asRoleFilter(filters.role),
      departmentId: asDepartmentFilter(filters.departmentId),
      status: asStatusFilter(filters.status),
      sort: sort ?? undefined,
    }),
    [page, q, filters, sort],
  );

  const list = useQuery({
    queryKey: userKeys.list(org, params),
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
  });

  const users = useMemo(() => list.data?.users ?? [], [list.data]);
  const members = useMemo<TeamMember[]>(() => users.map(mapUserToMember), [users]);
  const total = list.data?.meta?.total ?? users.length;
  const pageCount = list.data?.meta?.totalPages ?? 1;

  const refresh = useCallback(
    (change: "updated" | "deleted") => {
      // Deleting the last row on a page would otherwise leave it empty.
      if (change === "deleted") setPage((p) => (members.length <= 1 && p > 1 ? p - 1 : p));
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["departments"] });
      void queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    [members.length, queryClient],
  );

  const openEdit = useCallback((member: TeamMember) => setForm({ open: true, member }), []);
  const { renderActions, dialogs } = useMemberActions({ onChanged: refresh, onEdit: openEdit });

  const columns = useMemo<Column<TeamMember>[]>(
    () => [
      ...memberColumns,
      { key: "actions", header: "Actions", align: "right", render: renderActions },
    ],
    [renderActions],
  );

  const departmentOptions: SelectOption[] = useMemo(
    () => [
      { value: ANY, label: "All departments", icon: Layers },
      ...(departments.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
        icon: departmentIcon(d.icon),
      })),
    ],
    [departments.data],
  );

  function filter<K extends keyof MemberFilters>(key: K, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  // The role counts come from the server (`meta.total` of a one-row page per
  // role, with the same search, department and status), not from this page.
  const countParams = useMemo(
    () => ({ q: params.q, departmentId: params.departmentId, status: params.status }),
    [params.q, params.departmentId, params.status],
  );
  const managerCount = useRoleTotal(org, "MANAGER", countParams);
  const staffCount = useRoleTotal(org, "USER", countParams);
  const narrowed = Boolean(countParams.q || countParams.departmentId || countParams.status);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            aria-label="Search members"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[rgb(34_34_204)]"
          />
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setForm({ open: true, member: null })}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add member
        </button>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat
          icon={UsersRound}
          value={total}
          label={countActiveFilters(filters) || q ? "Matching" : "Members"}
        />
        <Stat
          icon={Crown}
          value={managerCount ?? "…"}
          label={narrowed ? "Managers matching" : "Managers"}
        />
        <Stat
          icon={UserRound}
          value={staffCount ?? "…"}
          label={narrowed ? "Staff matching" : "Staff"}
        />
      </div>

      {list.isError && !list.data ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(list.error)}
            onRetry={() => void list.refetch()}
            retrying={list.isFetching}
          />
        </div>
      ) : (
        <DataTable
          data={members}
          columns={columns}
          getRowKey={(m) => m.id}
          onRowClick={(m) => {
            if (canChangeMember(role, myId, m)) openEdit(m);
          }}
          countNoun="member"
          minWidth={980}
          emptyMessage={
            list.isPending
              ? "Loading members…"
              : countActiveFilters(filters) > 0 || q
                ? "No members match these filters."
                : "No members yet. Add the first one."
          }
          title={`Members (${total})`}
          action={
            <div className="flex flex-wrap items-center gap-2 [&_button[role=combobox]]:mt-0 [&_button[role=combobox]]:whitespace-nowrap [&_button[role=combobox]]:py-2">
              <div className="w-36">
                <Select
                  value={filters.role}
                  onValueChange={(v) => filter("role", v)}
                  options={roleFilterOptions}
                  aria-label="Role"
                />
              </div>
              <div className="w-52">
                <Select
                  value={filters.departmentId}
                  onValueChange={(v) => filter("departmentId", v)}
                  options={departmentOptions}
                  aria-label="Department"
                />
              </div>
              <div className="w-36">
                <Select
                  value={filters.status}
                  onValueChange={(v) => filter("status", v)}
                  options={statusFilterOptions}
                  aria-label="Status"
                />
              </div>
              <MemberSortPopover
                value={sort}
                onApply={(next) => {
                  setSort(next);
                  setPage(1);
                }}
              />
            </div>
          }
          serverPagination={{
            page,
            pageSize: MEMBERS_PAGE_SIZE,
            total,
            pageCount,
            onPageChange: setPage,
          }}
        />
      )}

      {dialogs}
      <MemberFormDialog
        open={form.open}
        member={form.member}
        onClose={() => setForm({ open: false, member: null })}
        onSaved={() => refresh("updated")}
      />
    </>
  );
}
