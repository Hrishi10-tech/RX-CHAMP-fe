"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Coffee,
  Plus,
  ShieldPlus,
  UserRoundX,
  Users,
  Zap,
} from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, btnSecondary, btnSmall, cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { selectOrg } from "@/lib/org/selection";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { usePlatformOverview } from "@/features/organisations/hooks/useOrganisations";
import { CreateAdminDialog, OrgNameDialog } from "@/features/organisations/components/OrgDialogs";
import type { OrganisationView } from "@/features/organisations/types";

function Tile({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: "brand" | "success" | "warning" | "neutral";
}) {
  const tones = {
    brand: "bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    neutral: "bg-slate-100 text-slate-500",
  } as const;
  return (
    <div
      className={`${cardBase} flex flex-col items-start gap-2 p-4 sm:flex-row sm:items-center sm:gap-3`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

/** Started / working / on a break as one bar, out of everyone who could start. */
function TodayBar({ org }: { org: OrganisationView }) {
  const people = Math.max(
    org.counts.staff + org.counts.managers,
    org.today.started + org.today.notStarted,
    1,
  );
  const working = (org.today.working / people) * 100;
  const onBreak = (org.today.onBreak / people) * 100;
  const other = Math.max(
    0,
    ((org.today.started - org.today.working - org.today.onBreak) / people) * 100,
  );
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <span className="bg-emerald-500" style={{ width: `${working}%` }} />
        <span className="bg-amber-400" style={{ width: `${onBreak}%` }} />
        <span className="bg-sky-300" style={{ width: `${other}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-4 gap-1 text-center">
        {[
          ["Started", org.today.started, "text-slate-900"],
          ["Working", org.today.working, "text-emerald-700"],
          ["On break", org.today.onBreak, "text-amber-700"],
          ["Not started", org.today.notStarted, "text-slate-500"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="min-w-0">
            <dd className={`text-base font-bold tabular-nums ${tone}`}>{value}</dd>
            <dt className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OrgCard({
  org,
  onOpen,
  onCreateAdmin,
}: {
  org: OrganisationView;
  onOpen: () => void;
  onCreateAdmin: () => void;
}) {
  return (
    <article className={`${cardBase} flex flex-col gap-4 p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] text-white shadow-sm">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-slate-900">{org.name}</h2>
          {org.admin ? (
            <p className="truncate text-sm text-slate-500">
              Admin <span className="font-semibold text-slate-700">{org.admin.name}</span>
            </p>
          ) : (
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              No admin yet
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-600">
        {org.counts.staff} staff · {org.counts.managers}{" "}
        {org.counts.managers === 1 ? "manager" : "managers"} · {org.counts.departments}{" "}
        {org.counts.departments === 1 ? "department" : "departments"}
      </p>

      <TodayBar org={org} />

      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button type="button" className={btnSmall} onClick={onOpen}>
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        {!org.admin && (
          <button type="button" className={btnSmall} onClick={onCreateAdmin}>
            <ShieldPlus className="h-3.5 w-3.5 text-[rgb(34_34_204)]" aria-hidden />
            Create admin
          </button>
        )}
      </div>
    </article>
  );
}

/**
 * SPEC 7.2 Overview (Super Admin, platform): every organisation with today's
 * summary, "No admin yet" and "Needs an organisation" alerts, Add organisation
 * and Create admin.
 */
export function PlatformOverview() {
  const router = useRouter();
  const overview = usePlatformOverview();
  const [adding, setAdding] = useState(false);
  const [adminFor, setAdminFor] = useState<OrganisationView | null>(null);
  const orgs = overview.data?.organisations ?? [];
  const noAdmin = orgs.filter((o) => !o.admin);
  const unassigned = overview.data?.unassignedPeople ?? 0;

  const totals = orgs.reduce(
    (t, o) => ({
      people: t.people + o.counts.staff + o.counts.managers,
      working: t.working + o.today.working,
      onBreak: t.onBreak + o.today.onBreak,
    }),
    { people: 0, working: 0, onBreak: 0 },
  );

  function open(org: OrganisationView) {
    selectOrg({ id: org.id, name: org.name });
    router.push("/dashboard/overview");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        subtitle="Every organisation at a glance. Pick one to work inside it."
        actions={
          <>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => router.push("/dashboard/organisations")}
            >
              <Building2 className="h-4 w-4" aria-hidden />
              Manage
            </button>
            <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add organisation
            </button>
          </>
        }
      />

      {(noAdmin.length > 0 || unassigned > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {noAdmin.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <ShieldPlus className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
              <div>
                <p className="font-semibold">
                  {noAdmin.length === 1
                    ? `${noAdmin[0].name} has no admin yet`
                    : `${noAdmin.length} organisations have no admin yet`}
                </p>
                <p className="mt-0.5 text-amber-800">
                  Create one so someone can run its people, settings and approvals.
                </p>
              </div>
            </div>
          )}
          {unassigned > 0 && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
            >
              <UserRoundX className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
              <div>
                <p className="font-semibold">
                  {unassigned} {unassigned === 1 ? "person needs" : "people need"} an organisation
                </p>
                <p className="mt-0.5 text-rose-800">
                  They were left without one when organisations arrived. Add them to one to track
                  their days.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Building2} label="Organisations" value={orgs.length} />
        <Tile icon={Users} label="People" value={totals.people} tone="neutral" />
        <Tile icon={Zap} label="Working now" value={totals.working} tone="success" />
        <Tile icon={Coffee} label="On a break" value={totals.onBreak} tone="warning" />
      </div>

      {overview.isPending ? (
        <div className={cardBase}>
          <LoadingState label="Loading organisations…" />
        </div>
      ) : overview.isError ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(overview.error)}
            onRetry={() => void overview.refetch()}
            retrying={overview.isFetching}
          />
        </div>
      ) : orgs.length === 0 ? (
        <div className={cardBase}>
          <EmptyState
            icon={Building2}
            title="No organisations yet"
            message="Add the first organisation, then create its Admin."
            action={
              <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add organisation
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orgs.map((o) => (
            <OrgCard
              key={o.id}
              org={o}
              onOpen={() => open(o)}
              onCreateAdmin={() => setAdminFor(o)}
            />
          ))}
        </div>
      )}

      <OrgNameDialog
        open={adding}
        organisation={null}
        onClose={() => setAdding(false)}
        onCreated={(org) => setAdminFor(org)}
      />
      <CreateAdminDialog organisation={adminFor} onClose={() => setAdminFor(null)} />
    </div>
  );
}
