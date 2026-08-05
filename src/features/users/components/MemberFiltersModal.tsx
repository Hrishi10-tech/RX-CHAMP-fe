"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Filter, Loader2, RotateCcw, UsersRound, X } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { departmentSelectOptions, withDepartment } from "@/constants/departments";
import { DateRangeField } from "@/features/users/components/DateRangeField";
import {
  EMPTY_MEMBER_FILTERS,
  countActiveFilters,
  roleFilterOptions,
} from "@/features/users/lib/memberQuery";
import type { MemberFilters, MemberFiltersModalProps } from "@/features/users/types";

const fieldLabel = "text-sm font-semibold text-slate-700";

export function MemberFiltersModal({
  value,
  onApply,
  companyOptions,
  companiesLoading,
  showCompanyFilter = true,
}: MemberFiltersModalProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MemberFilters>(value);

  // Reopening always starts from what's actually applied, so an abandoned edit
  // doesn't linger.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const activeCount = countActiveFilters(value);
  const draftDirty = JSON.stringify(draft) !== JSON.stringify(value);

  function set<K extends keyof MemberFilters>(key: K, next: MemberFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: next }));
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium outline-none transition-colors ${
          activeCount > 0
            ? "border-[rgb(34_34_204)] bg-[rgba(34,34,204,0.06)] text-[rgb(34_34_204)] ring-1 ring-[rgba(34,34,204,0.25)]"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Filter className="h-4 w-4" />
        Filter
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(34_34_204)] px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-xl">
        <div className="flex items-start justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
              <Filter className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Filter members</h2>
              <p className="text-sm text-slate-400">Narrow the list by role, team or join date.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 pb-5 sm:grid-cols-2">
          <div>
            <label className={fieldLabel} htmlFor="filter-role">
              Role
            </label>
            <Select
              id="filter-role"
              value={draft.role}
              onValueChange={(v) => set("role", v)}
              options={roleFilterOptions}
              placeholder="Select role"
              aria-label="Role"
              leadingIcon={UsersRound}
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="filter-team">
              Team
            </label>
            <Select
              id="filter-team"
              value={draft.department}
              onValueChange={(v) => set("department", v)}
              options={withDepartment(draft.department, departmentSelectOptions)}
              placeholder="Select team"
              aria-label="Team"
            />
          </div>

          {showCompanyFilter && (
            <div>
              <label className={fieldLabel} htmlFor="filter-company">
                Company
              </label>
              {companiesLoading ? (
                <div className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <Select
                  id="filter-company"
                  value={draft.companyId}
                  onValueChange={(v) => set("companyId", v)}
                  options={companyOptions}
                  placeholder="Select company"
                  aria-label="Company"
                  leadingIcon={Building2}
                />
              )}
            </div>
          )}

          <div>
            <label className={fieldLabel} htmlFor="filter-joined">
              Joined date
            </label>
            <DateRangeField
              id="filter-joined"
              from={draft.joinedFrom}
              to={draft.joinedTo}
              onChange={({ from, to }) =>
                setDraft((prev) => ({ ...prev, joinedFrom: from, joinedTo: to }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => setDraft(EMPTY_MEMBER_FILTERS)}
            disabled={countActiveFilters(draft) === 0}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(34_34_204)] transition hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
          >
            <RotateCcw className="h-4 w-4" />
            Clear all
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDraft(value)}
              disabled={!draftDirty}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 rounded-lg bg-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgb(28_28_180)]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply filters
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
