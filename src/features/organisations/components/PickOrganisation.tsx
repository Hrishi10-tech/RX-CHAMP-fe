"use client";

import { Building2, ChevronRight } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { Card } from "@/components/ui/Card";
import { errorMessage } from "@/lib/api";
import { selectOrg } from "@/lib/org/selection";
import { useOrgChoices } from "@/features/organisations/hooks/useOrganisations";

/**
 * Shown by the dashboard instead of an organisation's page while a Super Admin
 * or the Super Manager (3.3) has "All organisations" selected (SPEC 1.4: those
 * endpoints need one).
 */
export function PickOrganisation({ superManager = false }: { superManager?: boolean }) {
  const orgs = useOrgChoices(superManager);
  return (
    <Card className="mx-auto max-w-xl overflow-hidden">
      <div className="flex flex-col items-center gap-2 border-b border-divider px-6 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/8 text-brand">
          <Building2 className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-lg font-bold text-primary">Pick an organisation</h1>
        <p className="max-w-sm text-sm text-quiet">
          This page shows one organisation&apos;s data. Choose which one to open; you can switch at
          any time from the header.
        </p>
      </div>
      {orgs.isPending ? (
        <LoadingState label="Loading organisations…" />
      ) : orgs.isError ? (
        <ErrorState message={errorMessage(orgs.error)} onRetry={() => void orgs.refetch()} />
      ) : orgs.data.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-quiet">
          {superManager
            ? "No organisations yet."
            : "No organisations yet. Add one under Organisations."}
        </p>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-divider overflow-y-auto">
          {orgs.data.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => selectOrg({ id: o.id, name: o.name })}
                className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition hover:bg-fill focus-visible:bg-fill focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-strong">{o.name}</span>
                  {o.hint && <span className="block text-xs text-quiet">{o.hint}</span>}
                </span>
                <ChevronRight className="h-4 w-4 text-neutral" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
