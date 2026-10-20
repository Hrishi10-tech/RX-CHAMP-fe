"use client";

import { Building2, ChevronRight } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { selectOrg } from "@/lib/org/selection";
import { useOrganisations } from "@/features/organisations/hooks/useOrganisations";

/**
 * Shown by the dashboard instead of an organisation's page while a Super Admin
 * has "All organisations" selected (SPEC 1.4: those endpoints need one).
 */
export function PickOrganisation() {
  const orgs = useOrganisations();
  return (
    <div className={`${cardBase} mx-auto max-w-xl overflow-hidden`}>
      <div className="flex flex-col items-center gap-2 border-b border-slate-100 px-6 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]">
          <Building2 className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-lg font-bold text-slate-900">Pick an organisation</h1>
        <p className="max-w-sm text-sm text-slate-500">
          This page shows one organisation&apos;s data. Choose which one to open; you can switch at
          any time from the header.
        </p>
      </div>
      {orgs.isPending ? (
        <LoadingState label="Loading organisations…" />
      ) : orgs.isError ? (
        <ErrorState message={errorMessage(orgs.error)} onRetry={() => void orgs.refetch()} />
      ) : orgs.data.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">
          No organisations yet. Add one under Organisations.
        </p>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">
          {orgs.data.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => selectOrg({ id: o.id, name: o.name })}
                className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-800">{o.name}</span>
                  <span className="block text-xs text-slate-400">
                    {o.counts.staff} staff · {o.counts.managers}{" "}
                    {o.counts.managers === 1 ? "manager" : "managers"}
                    {o.admin ? "" : " · no admin yet"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
