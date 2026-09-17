"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/app/dashboard/admin/team-management/companies";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteCompany } from "@/features/companies/api/deleteCompany";
import { getUser } from "@/features/users/api/getUser";
import { errorMessage } from "@/lib/api";
import { withReturnTo } from "@/lib/nav/returnTo";
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
  checked,
  onSelect,
  onCheck,
}: {
  company: Company;
  active: boolean;
  checked: boolean;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border pl-3 pr-1 transition ${
        active
          ? "border-[rgba(34,34,204,0.4)] bg-[rgba(34,34,204,0.04)] ring-1 ring-[rgba(34,34,204,0.15)]"
          : checked
            ? "border-[rgba(34,34,204,0.25)] bg-slate-50"
            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      {/* Outside the button: a checkbox nested in one could never be clicked on its own. */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheck(e.target.checked)}
        aria-label={`Select ${company.name}`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[rgb(34_34_204)] accent-[rgb(34_34_204)] focus:ring-[rgba(34,34,204,0.35)]"
      />
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 text-left"
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
    </div>
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
  onDeleted,
}: {
  companies: Company[];
  loading: boolean;
  /** Reload the list after a delete, so the page owning the data stays the source. */
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Company[] | null>(null);
  const [typedName, setTypedName] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    // Carry this page along, so the manager's list — and the activity view beyond it
    // — can offer a back link that actually returns here instead of jumping to the
    // top of Team Management.
    router.push(
      withReturnTo(
        `/dashboard/admin/team-management/organization/${selected.id}/manager/${m.id}` +
          `?org=${encodeURIComponent(selected.name)}&manager=${encodeURIComponent(m.name)}`,
        "/dashboard/admin/team-management/organization",
        selected.name,
      ),
    );
  }

  const checkedCompanies = useMemo(
    () => companies.filter((c) => checkedIds.includes(c.id)),
    [companies, checkedIds],
  );

  // A company with people in it takes more than a click to delete: the confirm box
  // makes you type its name. Empty ones — the test companies this mostly exists for
  // — just ask once.
  const membersAtRisk = useMemo(
    () => (pendingDelete ?? []).reduce((sum, c) => sum + (c.userCount ?? 0), 0),
    [pendingDelete],
  );
  const needsTyping = membersAtRisk > 0 && (pendingDelete?.length ?? 0) === 1;
  const typingSatisfied = !needsTyping || typedName.trim() === pendingDelete?.[0]?.name;

  function askDelete(targets: Company[]) {
    if (targets.length === 0) return;
    setTypedName("");
    setPendingDelete(targets);
  }

  async function confirmDelete() {
    const targets = pendingDelete;
    if (!targets?.length) return;

    setDeleting(true);
    // Settled, not all: one failure must not hide the ones that did go.
    const results = await Promise.allSettled(targets.map((c) => deleteCompany(c.id)));
    setDeleting(false);

    const done = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - done;
    const members = results.reduce(
      (sum, r) => sum + (r.status === "fulfilled" ? r.value.membersRemoved : 0),
      0,
    );

    if (done > 0) {
      toast.success(done === 1 ? `Deleted ${targets[0].name}` : `Deleted ${done} companies`, {
        description:
          members > 0
            ? `${members} ${members === 1 ? "member" : "members"} removed with it. Records are kept.`
            : undefined,
      });
    }
    if (failed > 0) {
      const first = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      toast.error(failed === 1 ? "Couldn't delete the company" : `${failed} companies failed`, {
        description: first ? errorMessage(first.reason) : undefined,
      });
    }

    setPendingDelete(null);
    setTypedName("");
    setCheckedIds((ids) => ids.filter((id) => !targets.some((t) => t.id === id)));
    if (done > 0) onDeleted?.();
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
          {checkedCompanies.length > 0 ? (
            <button
              type="button"
              onClick={() => askDelete(checkedCompanies)}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({checkedCompanies.length})
            </button>
          ) : (
            <button
              type="button"
              aria-label="Sort companies"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <ListFilter className="h-4 w-4" />
            </button>
          )}
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
                checked={checkedIds.includes(c.id)}
                onSelect={() => setSelectedId(c.id)}
                onCheck={(on) =>
                  setCheckedIds((ids) =>
                    on ? [...ids, c.id] : ids.filter((id) => id !== c.id),
                  )
                }
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
                <ActionMenu
                  label="Company actions"
                  items={[
                    {
                      label: "Delete company",
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => askDelete([selected]),
                    },
                  ]}
                />
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => {
          setPendingDelete(null);
          setTypedName("");
        }}
        onConfirm={confirmDelete}
        title={
          (pendingDelete?.length ?? 0) === 1
            ? `Delete ${pendingDelete?.[0]?.name}?`
            : `Delete ${pendingDelete?.length ?? 0} companies?`
        }
        destructive
        icon={Trash2}
        loading={deleting}
        confirmDisabled={!typingSatisfied}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        description={
          <div className="space-y-3 text-left">
            {membersAtRisk > 0 ? (
              <p>
                <span className="font-semibold text-slate-700">
                  {membersAtRisk} {membersAtRisk === 1 ? "member" : "members"}
                </span>{" "}
                will be removed from the app along with{" "}
                {(pendingDelete?.length ?? 0) === 1 ? "it" : "them"}. Their records are kept
                and can be restored.
              </p>
            ) : (
              <p>
                {(pendingDelete?.length ?? 0) === 1 ? "It has" : "They have"} no members. The
                record is kept and can be restored.
              </p>
            )}

            {(pendingDelete?.length ?? 0) > 1 && (
              <ul className="list-inside list-disc text-slate-600">
                {pendingDelete?.map((c) => (
                  <li key={c.id}>
                    {c.name}
                    {(c.userCount ?? 0) > 0 ? ` — ${c.userCount} members` : ""}
                  </li>
                ))}
              </ul>
            )}

            {needsTyping && (
              <label className="block">
                <span className="text-xs font-semibold text-slate-600">
                  Type {pendingDelete?.[0]?.name} to confirm
                </span>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  autoComplete="off"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[rgb(34_34_204)]"
                />
              </label>
            )}
          </div>
        }
      />
    </div>
  );
}
