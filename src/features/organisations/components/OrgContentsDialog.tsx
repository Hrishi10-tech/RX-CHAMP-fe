"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Network, Search, Users } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, btnSecondary } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { getOrgDepartments, getOrgPeople } from "@/features/organisations/api/orgContents";
import { mapUserToMember, RolePill } from "@/features/users/lib/memberTable";
import type { OrganisationView } from "@/features/organisations/types";

/** Keys carry the organisation's id: these answers are about that one organisation. */
export const orgContentsKeys = {
  departments: (orgId: string) => ["org-contents", orgId, "departments"] as const,
  people: (orgId: string, page: number) => ["org-contents", orgId, "people", page] as const,
};

/**
 * Inside one organisation without switching to it (SPEC 1.2): its departments
 * with their staff and managers, and its people with role and department.
 * "Open" switches to the organisation to change anything.
 */
export function OrgContentsDialog({
  organisation,
  onClose,
  onOpen,
}: {
  organisation: OrganisationView | null;
  onClose: () => void;
  onOpen: (org: OrganisationView) => void;
}) {
  const orgId = organisation?.id ?? "";
  const [tab, setTab] = useState<"departments" | "people">("departments");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const departments = useQuery({
    queryKey: orgContentsKeys.departments(orgId),
    queryFn: () => getOrgDepartments(orgId),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  });
  const people = useQuery({
    queryKey: orgContentsKeys.people(orgId, page),
    queryFn: () => getOrgPeople(orgId, page),
    enabled: Boolean(orgId) && tab === "people",
    staleTime: 30_000,
  });

  const members = useMemo(() => {
    const list = (people.data?.users ?? []).map(mapUserToMember);
    const needle = q.trim().toLowerCase();
    return needle
      ? list.filter(
          (m) =>
            m.name.toLowerCase().includes(needle) ||
            m.email.toLowerCase().includes(needle) ||
            m.departments.some((d) => d.name.toLowerCase().includes(needle)),
        )
      : list;
  }, [people.data, q]);

  if (!organisation) return null;

  const tabBtn = (value: "departments" | "people", label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none ${
        tab === value ? "bg-[rgb(34_34_204)] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label} <span className="tabular-nums opacity-80">{count}</span>
    </button>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={organisation.name}
      description={
        organisation.admin
          ? `Admin ${organisation.admin.name} · ${organisation.admin.email}`
          : "No admin yet"
      }
      className="max-w-2xl"
    >
      <div className="space-y-4 px-6 py-5">
        <div
          role="tablist"
          aria-label="Inside this organisation"
          className="flex gap-1 rounded-xl border border-slate-200 p-1"
        >
          {tabBtn("departments", "Departments", organisation.counts.departments)}
          {tabBtn(
            "people",
            "People",
            organisation.counts.staff + organisation.counts.managers + (organisation.admin ? 1 : 0),
          )}
        </div>

        {tab === "departments" ? (
          departments.isPending ? (
            <LoadingState label="Loading departments…" />
          ) : departments.isError ? (
            <ErrorState
              message={errorMessage(departments.error)}
              onRetry={() => void departments.refetch()}
              retrying={departments.isFetching}
            />
          ) : departments.data.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No departments yet.
            </p>
          ) : (
            <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {departments.data.map((d) => (
                <li key={d.id} className="flex items-start gap-3 px-3 py-2.5">
                  <DepartmentIcon icon={d.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{d.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {d.managers.length
                        ? `Managers: ${d.managers.map((m) => m.name).join(", ")}`
                        : "No manager"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-600">
                    <Users className="mr-1 inline h-3.5 w-3.5 text-slate-400" aria-hidden />
                    {d.staffCount} staff
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : people.isPending ? (
          <LoadingState label="Loading people…" />
        ) : people.isError ? (
          <ErrorState
            message={errorMessage(people.error)}
            onRetry={() => void people.refetch()}
            retrying={people.isFetching}
          />
        ) : (
          <div className="space-y-2">
            <label className="relative block">
              <span className="sr-only">Search people</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email or department"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[rgb(34_34_204)]"
              />
            </label>
            <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {members.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-slate-500">Nobody matches.</li>
              ) : (
                members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {m.email}
                        {m.departments.length
                          ? ` · ${m.departments.map((d) => d.name).join(", ")}`
                          : ""}
                        {m.status === "Inactive" ? " · blocked" : ""}
                      </p>
                    </div>
                    <RolePill role={m.role} />
                  </li>
                ))
              )}
            </ul>
            {(people.data?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {page} of {people.data?.totalPages} · {people.data?.total} people
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={page >= (people.data?.totalPages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
          <button type="button" className={btnPrimary} onClick={() => onOpen(organisation)}>
            <Network className="h-4 w-4" aria-hidden />
            Work in {organisation.name}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </Modal>
  );
}
