"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Coffee,
  Globe2,
  HeartPulse,
} from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnSmall, cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { selectOrg } from "@/lib/org/selection";
import { useSession } from "@/features/auth/hooks/useSession";
import { useAgentHealth } from "@/features/agentHealth/hooks/useAgentHealth";
import { FLAG_COPY } from "@/features/agentHealth/lib/labels";
import type { AgentHealthRow } from "@/features/agentHealth/types";
import { effectChip } from "@/features/approvals/lib/labels";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import {
  getOrganisationsOverview,
  organisationsOverviewKeys,
  type OrgCard as OrgCardData,
} from "@/features/overview/api/organisationsOverview";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Tile({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  href?: string;
}) {
  const inner = (
    <>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-bold tabular-nums ${tone ?? "text-slate-900"}`}>
        {value}
      </dd>
      <dd className="truncate text-xs text-slate-500">{sub}</dd>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="block min-w-0 bg-white px-4 py-3 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(34,34,204,0.35)]"
    >
      {inner}
    </Link>
  ) : (
    <div className="min-w-0 bg-white px-4 py-3">{inner}</div>
  );
}

function OrgCard({
  org,
  agentIssues,
  onOpen,
}: {
  org: OrgCardData;
  /** From Agent health; null while it loads or when it is unavailable. */
  agentIssues: number | null;
  onOpen: (href: string) => void;
}) {
  const t = org.today;
  const { pending, overdue } = org.approvals;
  return (
    <section
      aria-labelledby={`org-${org.id}`}
      className={`${cardBase} flex min-w-0 flex-col gap-3 p-4 sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          id={`org-${org.id}`}
          className="flex min-w-0 items-center gap-2 text-base font-bold text-slate-900"
        >
          <Building2 className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
          <span className="truncate">{org.name}</span>
        </h3>
        {overdue > 0 ? (
          <Chip tone="danger" dot>
            {overdue} overdue
          </Chip>
        ) : agentIssues ? (
          <Chip tone="warning" dot>
            {agentIssues} agent {agentIssues === 1 ? "issue" : "issues"}
          </Chip>
        ) : (
          <Chip tone="success" dot>
            All clear
          </Chip>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Started today</dt>
          <dd className="font-semibold text-slate-900">{`${t.started} of ${t.people}`}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Away now</dt>
          <dd className="font-semibold text-slate-900">{t.onBreak + t.inMeeting + t.away}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Focus so far</dt>
          <dd className="font-semibold text-slate-900">{formatDuration(t.focusSec)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Pending approvals</dt>
          <dd className={`font-semibold ${pending ? "text-amber-700" : "text-slate-900"}`}>
            {pending}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-2">
        <button type="button" onClick={() => onOpen("/dashboard/team")} className={btnSmall}>
          <Activity className="h-3.5 w-3.5" aria-hidden />
          Team
        </button>
        <button type="button" onClick={() => onOpen("/dashboard/approvals")} className={btnSmall}>
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
          Approvals
        </button>
        <button
          type="button"
          onClick={() => onOpen("/dashboard/agent-health")}
          className={btnSmall}
        >
          <HeartPulse className="h-3.5 w-3.5" aria-hidden />
          Agent health
        </button>
      </div>
    </section>
  );
}

/** Agent issues per organisation, from the rows Agent health flags. */
export function issuesByOrg(rows: AgentHealthRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.companyId || !r.flags.length) continue;
    out.set(r.companyId, (out.get(r.companyId) ?? 0) + 1);
  }
  return out;
}

/**
 * The Super Manager's home (3.3 on 4.0; the Super Admin's on "All organisations"):
 * totals in view, one card per organisation with quick links that pick the
 * organisation and open the page, what waits for a decision, and agents that need
 * a look. The header switch narrows everything to one organisation.
 */
export function SuperOverview() {
  const { user } = useSession();
  const { mixed, org } = useOrgsInView();
  const router = useRouter();
  const overview = useQuery({
    queryKey: organisationsOverviewKeys.all,
    queryFn: getOrganisationsOverview,
    refetchInterval: 60_000,
  });
  const health = useAgentHealth({ problemsOnly: true });
  const data = overview.data;
  const t = data?.totals;
  const problems = useMemo(() => health.data?.rows ?? [], [health.data]);
  const issues = useMemo(() => issuesByOrg(problems), [problems]);
  const first = (user?.name ?? "").split(" ")[0] || "there";
  const items = data?.waiting.items ?? [];

  function openFor(card: OrgCardData, href: string) {
    selectOrg({ id: card.id, name: card.name });
    router.push(href);
  }

  if (overview.isLoading) return <LoadingState label="Loading the overview…" />;
  if (overview.isError && !data) {
    return (
      <ErrorState
        title="Couldn't load the overview"
        message={errorMessage(overview.error)}
        onRetry={() => overview.refetch()}
        retrying={overview.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {greeting(new Date())}, {first}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
          <Globe2 className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
          <span>
            {org ? org.name || data?.organisation?.name : "Every organisation"} ·{" "}
            {formatDayWithWeekday(todayKey())}
            {data?.generatedAt ? ` · updated ${formatTime12(data.generatedAt)}` : ""}
          </span>
        </p>
      </header>

      <dl
        aria-label="Totals in view"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:grid-cols-5"
      >
        <Tile
          label="Started the day"
          value={t ? `${t.started} of ${t.people}` : "…"}
          sub={t ? `${t.notStarted} not started · ${t.ended} ended` : "Loading"}
        />
        <Tile
          label="Away right now"
          value={t ? String(t.onBreak + t.inMeeting + t.away) : "…"}
          sub={t ? `${t.onBreak} on a break · ${t.inMeeting} in a meeting` : "Loading"}
          href="/dashboard/breaks/team"
        />
        <Tile
          label="Focus time so far"
          value={t ? formatDuration(t.focusSec) : "…"}
          sub={
            t && t.started
              ? `${formatDuration(t.focusSec / t.started)} a person`
              : "Nobody started yet"
          }
        />
        <Tile
          label="Waiting for a decision"
          value={t ? String(t.pendingApprovals) : "…"}
          sub={t?.overdueApprovals ? `${t.overdueApprovals} overdue` : "None overdue"}
          tone={
            t?.overdueApprovals
              ? "text-rose-600"
              : t?.pendingApprovals
                ? "text-amber-700"
                : undefined
          }
          href="/dashboard/approvals"
        />
        <Tile
          label="Agent issues"
          value={health.data ? String(problems.length) : health.isError ? "–" : "…"}
          sub={
            health.data
              ? `${health.data.summary.people} people checked`
              : health.isError
                ? "Agent health unavailable"
                : "Loading"
          }
          tone={problems.length ? "text-rose-600" : undefined}
          href="/dashboard/agent-health"
        />
      </dl>

      {mixed && (data?.organisations.length ?? 0) > 0 && (
        <section aria-labelledby="by-org" className="space-y-3">
          <h2 id="by-org" className="text-base font-bold text-slate-900">
            By organisation
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {data!.organisations.map((c) => (
              <OrgCard
                key={c.id}
                org={c}
                agentIssues={health.data ? (issues.get(c.id) ?? 0) : null}
                onOpen={(href) => openFor(c, href)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section aria-labelledby="decide-now" className={`${cardBase} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
            <h2 id="decide-now" className="text-base font-bold text-slate-900">
              Waiting for a decision
            </h2>
            <Link
              href="/dashboard/approvals"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[rgb(34_34_204)] hover:underline"
            >
              All approvals
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-slate-500 sm:px-5">
              Nothing is waiting. Every break, skip, meeting and away time in view has been decided.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((it) => {
                const effect = effectChip(it);
                return (
                  <li key={`${it.type}-${it.id}`} className="px-4 py-3 sm:px-5">
                    <Link href="/dashboard/approvals" className="group block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-[rgb(34_34_204)]">
                            {it.user?.name ?? "Someone"}
                            <span className="font-normal text-slate-500"> · {it.title}</span>
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                            <span>{formatDayWithWeekday(it.date)}</span>
                            <OrgChip name={it.user?.companyName} show={mixed} />
                            {it.overdue && (
                              <Chip tone="danger" dot>
                                overdue
                              </Chip>
                            )}
                          </p>
                        </div>
                        <Chip tone={effect.tone}>{effect.text}</Chip>
                      </div>
                    </Link>
                  </li>
                );
              })}
              {(data?.waiting.total ?? 0) > items.length && (
                <li className="px-4 py-2.5 text-xs text-slate-500 sm:px-5">
                  and {(data?.waiting.total ?? 0) - items.length} more on Approvals
                </li>
              )}
            </ul>
          )}
        </section>

        <section aria-labelledby="look-now" className={`${cardBase} overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5">
            <h2 id="look-now" className="text-base font-bold text-slate-900">
              Agents that need a look
            </h2>
            <Link
              href="/dashboard/agent-health"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[rgb(34_34_204)] hover:underline"
            >
              Agent health
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {health.isLoading ? (
            <p className="px-4 pb-5 text-sm text-slate-500 sm:px-5">Checking…</p>
          ) : health.isError ? (
            <p className="px-4 pb-5 text-sm text-slate-500 sm:px-5">
              Agent health could not be read just now.
            </p>
          ) : problems.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-slate-500 sm:px-5">
              Every agent in view is calling in, days are running, screenshots are arriving.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {problems.slice(0, 6).map((r) => (
                <li key={r.userId} className="px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{r.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                        <span>{r.department ?? "No department"}</span>
                        <OrgChip name={r.companyName} show={mixed} />
                      </p>
                    </div>
                    <span className="flex max-w-[60%] flex-wrap justify-end gap-1">
                      {r.flags.slice(0, 2).map((f) => (
                        <Chip
                          key={f}
                          tone={FLAG_COPY[f]?.tone ?? "neutral"}
                          title={FLAG_COPY[f]?.help}
                        >
                          {FLAG_COPY[f]?.label ?? f}
                        </Chip>
                      ))}
                      {r.flags.length > 2 && <Chip tone="neutral">+{r.flags.length - 2}</Chip>}
                    </span>
                  </div>
                </li>
              ))}
              {problems.length > 6 && (
                <li className="px-4 py-2.5 text-xs text-slate-500 sm:px-5">
                  and {problems.length - 6} more on Agent health
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      <nav aria-label="Everything else" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/dashboard/team", label: "Team", icon: Activity },
          { href: "/dashboard/breaks/team", label: "Team breaks", icon: Coffee },
          { href: "/dashboard/approvals", label: "Approvals", icon: ClipboardCheck },
          { href: "/dashboard/reports", label: "Reports", icon: ArrowRight },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`${cardBase} flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-[rgba(34,34,204,0.35)] hover:text-[rgb(34_34_204)]`}
          >
            <l.icon className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
