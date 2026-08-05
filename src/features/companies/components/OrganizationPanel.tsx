"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  MoreHorizontal,
} from "lucide-react";

import { Avatar } from "@/app/dashboard/admin/team-management/companies";
import { getUser } from "@/features/users/api/getUser";
import type { User } from "@/features/users/types";
import type { Company, CompanyManager } from "@/features/companies/types";

const LIST_SIZE = 8;

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function roleLabel(role?: string): string {
  switch (role?.toUpperCase()) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "MANAGER":
      return "Manager";
    case "USER":
      return "Member";
    default:
      return role ?? "—";
  }
}

function RolePill({ role }: { role?: string }) {
  if (!role) return null;
  return (
    <span className="rounded-full bg-[rgba(34,34,204,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(34_34_204)]">
      {roleLabel(role)}
    </span>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-center">
      <p className="text-lg font-bold text-[rgb(34_34_204)]">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function CompanyRow({
  company,
  active,
  onSelect,
}: {
  company: Company;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition ${
        active
          ? "border-[rgba(34,34,204,0.4)] bg-[rgba(34,34,204,0.04)] ring-1 ring-[rgba(34,34,204,0.15)]"
          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-[rgb(34_34_204)] text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        <Building2 className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{company.name}</p>
        <p className="text-xs text-slate-400">
          {company.managerCount ?? company.managers?.length ?? 0} managers ·{" "}
          {company.userCount ?? 0} users
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
}

function ManagersTable({
  managers,
  details,
  onOpen,
}: {
  managers: CompanyManager[];
  details: Record<string, User>;
  onOpen: (manager: CompanyManager) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Joined On</th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {managers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                No managers assigned yet.
              </td>
            </tr>
          ) : (
            managers.map((m) => {
              const d = details[m.id];
              return (
                <tr
                  key={m.id}
                  onClick={() => onOpen(m)}
                  className="cursor-pointer hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative shrink-0">
                        <Avatar name={m.name} className="h-9 w-9 text-[11px]" />
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{m.name}</span>
                          <RolePill role={d?.role} />
                        </div>
                        <p className="text-xs text-slate-400">{m.userCount ?? 0} users</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{m.email ?? d?.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(m.joinedOn ?? d?.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export function OrganizationPanel({
  companies,
  loading,
}: {
  companies: Company[];
  loading: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);

  const [details, setDetails] = useState<Record<string, User>>({});

  useEffect(() => {
    if (companies.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !companies.some((c) => c.id === selectedId)) {
      setSelectedId(companies[0].id);
      setListPage(1);
    }
  }, [companies, selectedId]);

  const selected = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? null,
    [companies, selectedId],
  );

  const managers = useMemo(() => selected?.managers ?? [], [selected]);

  useEffect(() => {
    if (managers.length === 0) {
      setDetails({});
      return;
    }
    let active = true;
    setDetails({});
    Promise.allSettled(managers.map((m) => getUser(m.id))).then((results) => {
      if (!active) return;
      const map: Record<string, User> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[managers[i].id] = r.value;
      });
      setDetails(map);
    });
    return () => {
      active = false;
    };
  }, [managers]);

  function openManager(m: CompanyManager) {
    if (!selected) return;
    router.push(
      `/dashboard/admin/team-management/organization/${selected.id}/manager/${m.id}` +
        `?org=${encodeURIComponent(selected.name)}&manager=${encodeURIComponent(m.name)}`,
    );
  }

  const pageCount = Math.max(1, Math.ceil(companies.length / LIST_SIZE));
  const clampedPage = Math.min(listPage, pageCount);
  const start = (clampedPage - 1) * LIST_SIZE;
  const shown = companies.slice(start, start + LIST_SIZE);
  const rangeEnd = Math.min(start + LIST_SIZE, companies.length);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(320px,380px)_1fr]">
      <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">All Companies</h2>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-500">
              {companies.length}
            </span>
          </div>
          <button
            type="button"
            aria-label="Sort companies"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ListFilter className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : companies.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No companies found.</p>
          ) : (
            shown.map((c) => (
              <CompanyRow
                key={c.id}
                company={c}
                active={c.id === selectedId}
                onSelect={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>

        {companies.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-1 pt-3 text-xs text-slate-400">
            <span>
              Showing {start + 1} to {rangeEnd} of {companies.length} companies
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={clampedPage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-[rgba(34,34,204,0.08)] px-2 font-semibold text-[rgb(34_34_204)]">
                {clampedPage}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={clampedPage >= pageCount}
                onClick={() => setListPage((p) => Math.min(pageCount, p + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 enabled:hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {!selected ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-24 text-sm text-slate-400 shadow-sm">
          Select a company to view its details.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.35)]">
                  <Building2 className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-xs text-slate-400">
                    {selected.managerCount ?? 0} managers · {selected.userCount ?? 0} users
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Edit Company
                </button>
                <button
                  type="button"
                  aria-label="More actions"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Managers</h3>
              <ManagersTable managers={managers} details={details} onOpen={openManager} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Company Overview</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile value={String(selected.managerCount ?? 0)} label="Managers" />
              <StatTile value={String(selected.userCount ?? 0)} label="Users" />
              <StatTile
                value={String((selected.managerCount ?? 0) + (selected.userCount ?? 0))}
                label="Total Members"
              />
              <StatTile value={formatDate(selected.createdAt)} label="Created On" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Recent Activity</h3>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
                <Activity className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">Company created</p>
                <p className="text-xs text-slate-500">Company {selected.name} was created</p>
              </div>
              <span className="text-xs text-slate-400">{formatDate(selected.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
