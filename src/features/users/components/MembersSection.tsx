"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, MoreHorizontal, Plus, Search, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/DataTable";
import { LoadingOverlay } from "@/components/ui/Loader";
import type { Column, SelectOption } from "@/components/ui/types";
import { getCompanies } from "@/features/companies/api/getCompanies";
import { getUsers } from "@/features/users/api/getUsers";
import {
  EMPTY_MEMBER_FILTERS,
  asRoleFilter,
  countActiveFilters,
} from "@/features/users/lib/memberQuery";
import {
  formatJoined,
  mapUserToMember,
  memberColumns,
  toStatus,
} from "@/features/users/lib/memberTable";
import { useMemberActions } from "@/features/users/hooks/useMemberActions";
import { MemberFiltersModal } from "@/features/users/components/MemberFiltersModal";
import { MemberSortPopover } from "@/features/users/components/MemberSortPopover";
import type {
  MemberFilters,
  MemberSortKey,
  MembersSectionProps,
  User,
} from "@/features/users/types";
import type { TeamMember } from "@/types";

const MEMBERS_PAGE_SIZE = 10;

function StatItem({
  icon,
  iconBg,
  value,
  label,
  caption,
  valueClass = "text-xl",
}: {
  icon: ReactNode;
  iconBg: string;
  value: string;
  label: string;
  caption: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`font-bold leading-tight text-slate-900 ${valueClass}`}>{value}</p>
        <p className="text-[13px] font-medium text-slate-600">{label}</p>
        <p className="text-[11px] text-slate-400">{caption}</p>
      </div>
    </div>
  );
}

/**
 * Note: total comes from the server, but active/newest are computed from the
 * loaded page only — so on a multi-page list they describe this page, not everyone.
 */
function MembersStats({ total, users }: { total: number; users: User[] }) {
  const active = users.filter((u) => toStatus(u.status) === "Active").length;
  const newest = users.reduce<string | undefined>((latest, u) => {
    if (!u.createdAt) return latest;
    if (!latest) return u.createdAt;
    return new Date(u.createdAt) > new Date(latest) ? u.createdAt : latest;
  }, undefined);

  return (
    <div className="grid grid-cols-1 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <StatItem
        icon={<UsersRound className="h-4 w-4 text-[rgb(34_34_204)]" />}
        iconBg="bg-[rgba(34,34,204,0.1)]"
        value={String(total)}
        label="Total Members"
        caption="All members"
      />
      <StatItem
        icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
        iconBg="bg-emerald-50"
        value={String(active)}
        label="Active Members"
        caption="Currently active"
      />
      <StatItem
        icon={<CalendarDays className="h-4 w-4 text-[rgb(34_34_204)]" />}
        iconBg="bg-[rgba(34,34,204,0.1)]"
        value={formatJoined(newest)}
        label="Newest Member"
        caption="Joined recently"
        valueClass="text-base"
      />
    </div>
  );
}

/**
 * The members list — stat cards, search, add button, filter/sort, table and the
 * row-action dialogs. Shared so the admin and manager screens stay in step; only
 * the query scope and the add-member route differ.
 */
export function MembersSection({
  managerId,
  defaultRole,
  pending = false,
  enabled = true,
  addMemberHref,
  tableTitle = "Members",
  emptyMessage = "No team members found.",
  showCompanyFilter = false,
  onRowClick,
}: MembersSectionProps) {
  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [filters, setFilters] = useState<MemberFilters>(EMPTY_MEMBER_FILTERS);
  const [sort, setSort] = useState<MemberSortKey | null>(null);
  const [companyOptions, setCompanyOptions] = useState<SelectOption[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(showCompanyFilter);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (pending) {
      setLoading(true);
      return;
    }
    if (!enabled) {
      setUsers([]);
      setTotal(0);
      setPageCount(1);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getUsers({
      page,
      limit: MEMBERS_PAGE_SIZE,
      managerId,
      // An explicit Role filter overrides the screen's default scope.
      role: asRoleFilter(filters.role) ?? defaultRole,
      search: debouncedSearch,
      department: filters.department || undefined,
      companyId: filters.companyId || undefined,
      joinedFrom: filters.joinedFrom || undefined,
      joinedTo: filters.joinedTo || undefined,
      // Omitted when null, which gives the server default (joined_desc).
      sort: sort ?? undefined,
    })
      .then((res) => {
        if (!active) return;
        setUsers(res.users);
        setTotal(res.meta?.total ?? res.users.length);
        setPageCount(res.meta?.totalPages ?? 1);
      })
      .catch(() => {
        if (!active) return;
        setUsers([]);
        setTotal(0);
        setPageCount(1);
        toast.error("Couldn't load members", { description: "Please try again." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    pending,
    enabled,
    managerId,
    defaultRole,
    page,
    debouncedSearch,
    refreshIndex,
    filters,
    sort,
  ]);

  useEffect(() => {
    if (!showCompanyFilter || pending || !enabled) return;
    let active = true;
    setCompaniesLoading(true);
    getCompanies({ page: 1, limit: 100 })
      .then((res) => {
        if (!active) return;
        setCompanyOptions(res.companies.map((c) => ({ value: c.id, label: c.name })));
      })
      .catch(() => {
        if (active) setCompanyOptions([]);
      })
      .finally(() => {
        if (active) setCompaniesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showCompanyFilter, pending, enabled]);

  const members = useMemo<TeamMember[]>(() => users.map(mapUserToMember), [users]);

  const { renderActions, dialogs } = useMemberActions({
    onChanged: (change) => {
      // Deleting the last row on a page would otherwise leave it empty.
      if (change === "deleted") {
        setPage((p) => (members.length <= 1 && p > 1 ? p - 1 : p));
      }
      setRefreshIndex((i) => i + 1);
    },
  });

  const columns = useMemo<Column<TeamMember>[]>(
    () => [
      ...memberColumns,
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: renderActions,
      },
    ],
    [renderActions],
  );

  function applyFilters(next: MemberFilters) {
    setFilters(next);
    setPage(1);
  }

  function applySort(next: MemberSortKey | null) {
    setSort(next);
    setPage(1);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members…"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[rgb(34_34_204)] sm:w-72"
            />
          </div>
          <Link
            href={addMemberHref}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Add member
          </Link>
        </div>
      </div>

      {loading ? <LoadingOverlay label="Loading members…" /> : null}

      <div className="space-y-5">
        <MembersStats total={total} users={users} />
        <DataTable
          data={members}
          columns={columns}
          getRowKey={(m) => m.id}
          onRowClick={onRowClick}
          countNoun="member"
          emptyMessage={
            countActiveFilters(filters) > 0 ? "No members match these filters." : emptyMessage
          }
          title={`${tableTitle} (${total})`}
          action={
            <div className="flex items-center gap-2">
              <MemberFiltersModal
                value={filters}
                onApply={applyFilters}
                companyOptions={companyOptions}
                companiesLoading={companiesLoading}
                showCompanyFilter={showCompanyFilter}
              />
              <MemberSortPopover value={sort} onApply={applySort} />
              <button
                type="button"
                aria-label="More actions"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
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
      </div>

      {dialogs}
    </>
  );
}
