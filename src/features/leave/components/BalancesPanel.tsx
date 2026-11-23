"use client";

import { useState } from "react";
import { Eye, Search, SlidersHorizontal, UserCog } from "lucide-react";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnSmall, cardBase, inputBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { todayKey } from "@/lib/time/businessTime";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { useLeaveBalances, useLeavePolicy } from "@/features/leave/hooks/useLeave";
import { daysNumber, daysText } from "@/features/leave/lib/format";
import type { CategoryBalanceView, PersonBalanceRow } from "@/features/leave/types";

import { AdjustLeaveDialog, PersonLeaveDialog, QuotaDialog } from "./AdjustLeaveDialogs";

function Pool({ b, own }: { b: CategoryBalanceView; own: boolean }) {
  return (
    <span className="block whitespace-nowrap">
      <span
        className={`text-base font-bold tabular-nums ${b.availableDays <= 0 ? "text-rose-600" : "text-slate-900"}`}
      >
        {daysNumber(b.availableDays)}
      </span>
      <span className="text-xs text-slate-400">
        {" "}
        of {daysNumber(b.grantedDays + b.carriedDays + b.adjustedDays)}
      </span>
      {(own || b.pendingDays > 0) && (
        <span className="block text-[11px] text-slate-500">
          {own ? "own yearly days" : ""}
          {own && b.pendingDays > 0 ? ", " : ""}
          {b.pendingDays > 0 ? `${daysText(b.pendingDays)} waiting` : ""}
        </span>
      )}
    </span>
  );
}

/**
 * Everyone's balances for a year (3.4). Managers read their team's; the Super
 * Manager and Super Admins also change balances and yearly days.
 */
export function BalancesPanel() {
  // 4.0: the API client sends the organisation in view; the combined view tags rows.
  const org = { companyId: undefined as string | undefined, mixed: useOrgsInView().mixed };
  const policy = useLeavePolicy();
  const thisYear = Number(todayKey().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const list = useLeaveBalances({ year, companyId: org.companyId, search: q || undefined });
  const [adjusting, setAdjusting] = useState<PersonBalanceRow | null>(null);
  const [quota, setQuota] = useState<PersonBalanceRow | null>(null);
  const [viewing, setViewing] = useState<PersonBalanceRow | null>(null);
  const canAdjust = list.data?.canAdjust ?? false;
  const rows = list.data?.rows ?? [];

  return (
    <section className={cardBase} aria-labelledby="leave-balances">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <h2 id="leave-balances" className="text-sm font-bold text-slate-900">
          Balances
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedTabs
            label="Year"
            size="sm"
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            tabs={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({
              value: String(y),
              label: String(y),
            }))}
          />
          <label className="relative block">
            <span className="sr-only">Search people</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className={`${inputBase} !py-2 pl-9 sm:w-56`}
            />
          </label>
        </div>
      </div>

      {list.isLoading ? (
        <LoadingState label="Loading balances…" />
      ) : list.isError ? (
        <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : !rows.length ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">Nobody here.</p>
      ) : (
        <>
          {/* Phones: one card per person. */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((r) => (
              <li key={r.user.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.user.name}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      {r.user.department ?? "No department"}
                      <OrgChip name={r.user.companyName} show={org.mixed} />
                    </p>
                  </div>
                  <button
                    type="button"
                    className={btnSmall}
                    onClick={() => setViewing(r)}
                    aria-label={`Open ${r.user.name}'s leave`}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                      CL/SL left
                    </p>
                    <Pool b={r.clsl} own={r.quota.clslDaysPerYear !== null} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                      EL/PL left
                    </p>
                    <Pool b={r.elpl} own={r.quota.elplDaysPerYear !== null} />
                  </div>
                </div>
                {canAdjust && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className={btnSmall} onClick={() => setAdjusting(r)}>
                      <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                      Change balance
                    </button>
                    <button type="button" className={btnSmall} onClick={() => setQuota(r)}>
                      <UserCog className="h-3.5 w-3.5" aria-hidden />
                      Yearly days
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Wider screens: a table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">Person</th>
                  <th className="px-3 py-2.5">CL/SL left</th>
                  <th className="px-3 py-2.5">EL/PL left</th>
                  <th className="px-3 py-2.5">Taken</th>
                  <th className="px-3 py-2.5">Coming up</th>
                  <th className="px-5 py-2.5 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.user.id} className="align-top">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-900">{r.user.name}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {[
                          r.user.department,
                          r.user.managerName ? `reports to ${r.user.managerName}` : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No department"}
                        <OrgChip name={r.user.companyName} show={org.mixed} />
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Pool b={r.clsl} own={r.quota.clslDaysPerYear !== null} />
                    </td>
                    <td className="px-3 py-3">
                      <Pool b={r.elpl} own={r.quota.elplDaysPerYear !== null} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">
                      {daysText(r.clsl.takenDays + r.elpl.takenDays)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">
                      {r.upcomingDays ? daysText(r.upcomingDays) : "None"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <button type="button" className={btnSmall} onClick={() => setViewing(r)}>
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          Open
                        </button>
                        {canAdjust && (
                          <>
                            <button
                              type="button"
                              className={btnSmall}
                              onClick={() => setAdjusting(r)}
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                              Change
                            </button>
                            <button type="button" className={btnSmall} onClick={() => setQuota(r)}>
                              <UserCog className="h-3.5 w-3.5" aria-hidden />
                              Yearly days
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdjustLeaveDialog person={adjusting} year={year} onClose={() => setAdjusting(null)} />
      <QuotaDialog
        person={quota}
        defaults={{
          clsl: policy.data?.clslDaysPerYear ?? 12,
          elpl: policy.data?.elplDaysPerYear ?? 12,
        }}
        onClose={() => setQuota(null)}
      />
      <PersonLeaveDialog
        userId={viewing?.user.id ?? null}
        name={viewing?.user.name ?? ""}
        year={year}
        onClose={() => setViewing(null)}
      />
    </section>
  );
}
