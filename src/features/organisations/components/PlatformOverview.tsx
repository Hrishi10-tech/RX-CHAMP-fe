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

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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
    brand: "bg-brand/8 text-brand",
    success: "bg-working-wash text-working",
    warning: "bg-attention-wash text-attention",
    neutral: "bg-panel text-quiet",
  } as const;
  return (
    <Card className="flex flex-col items-start gap-2 p-4 sm:flex-row sm:items-center sm:gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-primary">{value}</p>
        <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-quiet">
          {label}
        </p>
      </div>
    </Card>
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
      <div className="flex h-2 overflow-hidden rounded-full bg-panel" aria-hidden>
        <span className="bg-working" style={{ width: `${working}%` }} />
        <span className="bg-attention" style={{ width: `${onBreak}%` }} />
        <span className="bg-brand-edge-strong" style={{ width: `${other}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-4 gap-1 text-center">
        {[
          ["Started", org.today.started, "text-primary"],
          ["Working", org.today.working, "text-working"],
          ["On break", org.today.onBreak, "text-attention"],
          ["Not started", org.today.notStarted, "text-quiet"],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="min-w-0">
            <dd className={`text-base font-bold tabular-nums ${tone}`}>{value}</dd>
            <dt className="truncate text-[0.625rem] font-semibold uppercase tracking-wide text-quiet">
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
    <Card as="article" className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand text-on-brand shadow-sm">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-primary">{org.name}</h2>
          {org.admin ? (
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-quiet">
              Admin
              <PersonAvatar
                name={org.admin.name}
                avatarId={org.admin.avatarId}
                userId={org.admin.id}
                size={20}
              />
              <span className="truncate font-semibold text-body">{org.admin.name}</span>
            </p>
          ) : (
            <p className="inline-flex items-center gap-1 text-sm font-semibold text-attention">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              No admin yet
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-soft">
        {org.counts.staff} staff · {org.counts.managers}{" "}
        {org.counts.managers === 1 ? "manager" : "managers"} · {org.counts.departments}{" "}
        {org.counts.departments === 1 ? "department" : "departments"}
      </p>

      <TodayBar org={org} />

      <div className="mt-auto flex flex-wrap gap-2 border-t border-divider pt-3">
        <Button type="button" variant="small" onClick={onOpen}>
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
        {!org.admin && (
          <Button type="button" variant="small" onClick={onCreateAdmin}>
            <ShieldPlus className="h-3.5 w-3.5 text-brand" aria-hidden />
            Create admin
          </Button>
        )}
      </div>
    </Card>
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
            <Button type="button" onClick={() => router.push("/dashboard/organisations")}>
              <Building2 className="h-4 w-4" aria-hidden />
              Manage
            </Button>
            <Button type="button" variant="primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Add organisation
            </Button>
          </>
        }
      />

      {(noAdmin.length > 0 || unassigned > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {noAdmin.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-attention-edge bg-attention-wash p-4 text-sm text-attention-ink"
            >
              <ShieldPlus className="mt-0.5 h-5 w-5 shrink-0 text-attention" aria-hidden />
              <div>
                <p className="font-semibold">
                  {noAdmin.length === 1
                    ? `${noAdmin[0].name} has no admin yet`
                    : `${noAdmin.length} organisations have no admin yet`}
                </p>
                <p className="mt-0.5 text-attention-ink">
                  Create one so someone can run its people, settings and approvals.
                </p>
              </div>
            </div>
          )}
          {unassigned > 0 && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border border-attention-edge bg-attention-wash p-4 text-sm text-attention-ink"
            >
              <UserRoundX className="mt-0.5 h-5 w-5 shrink-0 text-attention" aria-hidden />
              <div>
                <p className="font-semibold">
                  {unassigned} {unassigned === 1 ? "person needs" : "people need"} an organisation
                </p>
                <p className="mt-0.5 text-attention-ink">
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
        <Card>
          <LoadingState label="Loading organisations…" />
        </Card>
      ) : overview.isError ? (
        <Card>
          <ErrorState
            message={errorMessage(overview.error)}
            onRetry={() => void overview.refetch()}
            retrying={overview.isFetching}
          />
        </Card>
      ) : orgs.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No organisations yet"
            message="Add the first organisation, then create its Admin."
            action={
              <Button type="button" variant="primary" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add organisation
              </Button>
            }
          />
        </Card>
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
