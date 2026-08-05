"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MoreHorizontal } from "lucide-react";

import { Avatar } from "../../../../companies";
import { LoadingOverlay } from "@/components/ui/Loader";
import { DataTable } from "@/components/ui/DataTable";
import { getUsers } from "@/features/users/api/getUsers";
import type { User } from "@/features/users/types";
import { mapUserToMember, memberColumns } from "@/features/users/lib/memberTable";
import type { TeamMember } from "@/types";

const LIST_ROUTE = "/dashboard/admin/team-management";

const PAGE_SIZE = 10;

export default function ManagerUsersPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const managerId = String(params.mid);

  function openActivity(m: TeamMember) {
    router.push(`/dashboard/manager/activity/${m.id}?name=${encodeURIComponent(m.name)}`);
  }
  const orgName = search.get("org") ?? "Organization";
  const managerName = search.get("manager") ?? "Manager";

  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getUsers({ managerId, page, limit: PAGE_SIZE })
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
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [managerId, page]);

  const members = useMemo<TeamMember[]>(() => users.map(mapUserToMember), [users]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href={LIST_ROUTE}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {orgName}
      </Link>

      <div className="flex flex-col items-center">
        <div className="w-full max-w-sm rounded-2xl border border-[rgba(34,34,204,0.25)] bg-white p-5 text-center shadow-sm ring-1 ring-[rgba(34,34,204,0.06)]">
          <Avatar name={managerName} className="mx-auto h-14 w-14 text-base" />
          <p className="mt-3 text-base font-bold tracking-tight text-slate-900">{managerName}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-[rgb(34_34_204)]">
            Manager
          </p>
          <p className="mt-1 text-xs text-slate-400">{total} reports</p>
        </div>
        {total > 0 && (
          <>
            <span className="h-6 w-px bg-slate-200" />
            <span className="h-px w-2/3 bg-slate-200" />
          </>
        )}
      </div>

      {loading ? (
        <LoadingOverlay label="Loading users…" />
      ) : (
        <DataTable
          data={members}
          columns={memberColumns}
          getRowKey={(m) => m.id}
          selectable
          onRowClick={openActivity}
          countNoun="user"
          emptyMessage="No users assigned to this manager yet."
          serverPagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            pageCount,
            onPageChange: setPage,
          }}
          rowActions={() => (
            <button
              type="button"
              aria-label="Row actions"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
        />
      )}
    </div>
  );
}
