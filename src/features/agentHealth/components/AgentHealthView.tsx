"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Camera, HeartPulse, Info, Search, Users } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { cardBase, inputBase, thBase } from "@/components/ui/classes";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { formatTime12 } from "@/lib/time/format";
import { useNow } from "@/lib/hooks/useNow";
import { withReturnTo } from "@/lib/nav/returnTo";
import { roleLabel, seesEveryOrg } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { departmentIcon } from "@/features/departments/lib/icons";
import { useSelectedOrg } from "@/lib/org/selection";
import { useAgentHealth } from "@/features/agentHealth/hooks/useAgentHealth";
import {
  DAY_COPY,
  FLAG_COPY,
  STATUS_COPY,
  refusalText,
  sortRows,
} from "@/features/agentHealth/lib/labels";
import type { AgentHealthRow, AgentHealthSummary } from "@/features/agentHealth/types";

const EVERYONE = "__everyone__";
const HREF = "/dashboard/agent-health";

/** The person's organisation, shown only when every organisation is in view. */
function OrgChip({ name, show }: { name: string | null; show: boolean }) {
  if (!show || !name) return null;
  return (
    <Chip tone="neutral" icon={Building2} title="Organisation">
      {name}
    </Chip>
  );
}

/** "just now", "4 min ago", "2 h ago", "yesterday 18:02", or "never". */
export function agoText(iso: string | null, now: number): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "never";
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago, ${formatTime12(iso)}`;
}

function Tiles({
  s,
  problemsOnly,
  onProblems,
}: {
  s: AgentHealthSummary;
  problemsOnly: boolean;
  onProblems: () => void;
}) {
  const tiles: { label: string; value: string; sub: string; tone?: string; action?: boolean }[] = [
    { label: "People", value: String(s.people), sub: `${s.tracking} tracking right now` },
    {
      label: "Day not started",
      value: String(s.notStarted),
      sub: `${s.ended} ended the day`,
      tone: s.notStarted ? "text-amber-700" : undefined,
    },
    {
      label: "Agent offline",
      value: String(s.offline),
      sub: "Day open, agent quiet 5 min+",
      tone: s.offline ? "text-rose-600" : undefined,
    },
    {
      label: "Screenshots missing",
      value: String(s.noScreenshots),
      sub: `${s.screenshotsOff} switched off`,
      tone: s.noScreenshots ? "text-rose-600" : undefined,
    },
    {
      label: "Uploads refused",
      value: String(s.refused),
      sub: problemsOnly ? "Showing problems only" : "Tap to show problems only",
      tone: s.refused ? "text-rose-600" : undefined,
      action: true,
    },
  ];
  return (
    <dl
      aria-label="Agent health totals"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:grid-cols-5"
    >
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.label}
          </dt>
          <dd className={`mt-0.5 text-xl font-bold tabular-nums ${t.tone ?? "text-slate-900"}`}>
            {t.action ? (
              <button
                type="button"
                onClick={onProblems}
                className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
              >
                {t.value}
              </button>
            ) : (
              t.value
            )}
          </dd>
          <dd className="truncate text-xs text-slate-500">{t.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

function Flags({ row }: { row: AgentHealthRow }) {
  if (row.flags.length === 0) {
    return (
      <Chip tone="success" dot>
        Fine
      </Chip>
    );
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {row.flags.map((f) => {
        const c = FLAG_COPY[f] ?? { label: f, tone: "neutral" as const, help: "" };
        return (
          <Chip key={f} tone={c.tone} title={c.help}>
            {c.label}
          </Chip>
        );
      })}
    </span>
  );
}

function AgentCell({ row, now }: { row: AgentHealthRow; now: number }) {
  const s = STATUS_COPY[row.agent.status];
  const seen = row.agent.lastContactAt ?? row.agent.lastSampleAt;
  return (
    <div className="space-y-1">
      <Chip tone={s.tone} dot pulse={row.agent.status === "ACTIVE"}>
        {s.label}
      </Chip>
      <p className="text-xs text-slate-500">
        {row.agent.version ? `v${row.agent.version}` : "no version"} · last call{" "}
        {agoText(seen, now)}
        {!row.agent.signedIn ? " · signed out" : ""}
      </p>
    </div>
  );
}

function DayCell({ row }: { row: AgentHealthRow }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-slate-800">{DAY_COPY[row.day.state]}</p>
      <p className="text-xs text-slate-500">
        {row.day.state === "NOT_STARTED"
          ? row.day.workday
            ? row.day.shiftStart
              ? `shift from ${formatTime12(row.day.shiftStart)}`
              : "no shift"
            : "day off"
          : `${formatTime12(row.day.startedAt)}${row.day.endedAt ? ` to ${formatTime12(row.day.endedAt)}` : " onward"}`}
      </p>
    </div>
  );
}

function ShotsCell({ row, now }: { row: AgentHealthRow; now: number }) {
  const s = row.screenshots;
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-800">
        {s.enabled ? `${s.today} today` : "Off"}
        {s.enabled && s.lastAt ? (
          <span className="font-normal text-slate-500"> · last {agoText(s.lastAt, now)}</span>
        ) : null}
      </p>
      {s.lastRefusal && (
        <p className="text-xs text-rose-700" title={s.lastRefusal.reason}>
          Refused {agoText(s.lastRefusal.at, now)}: {refusalText(s.lastRefusal)}
        </p>
      )}
    </div>
  );
}

/**
 * Agent health (3.3 on 4.0): one row per person. Problems sort first; the tiles
 * count them; a tap on a name opens the day report. Follows the organisation in
 * view (X-Org-Id); a Super Admin or the Super Manager on "All organisations" sees
 * every organisation, with each person's organisation on the row.
 */
export function AgentHealthView() {
  const { role } = useSession();
  const selected = useSelectedOrg();
  const everyOrg = seesEveryOrg(role);
  // Departments belong to one organisation: the filter shows when one is in view.
  const oneOrg = !everyOrg || Boolean(selected);
  const departments = useDepartments(oneOrg);
  const [team, setTeam] = useState(EVERYONE);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => setTeam(EVERYONE), [selected?.id]);
  const now = useNow(30_000);

  const params = useMemo(
    () => ({ departmentId: oneOrg && team !== EVERYONE ? team : undefined }),
    [oneOrg, team],
  );
  const query = useAgentHealth(params);
  const data = query.data;
  const mixed = data ? data.organisationId === null : false;
  const scopeLabel = everyOrg ? (selected ? `${selected.name}. ` : "All organisations. ") : "";

  const teamOptions = useMemo<SelectOption[]>(
    () => [
      { value: EVERYONE, label: "Every department", icon: Users },
      ...(departments.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
        icon: departmentIcon(d.icon),
      })),
    ],
    [departments.data],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortRows(data?.rows ?? []).filter(
      (r) =>
        (!problemsOnly || r.flags.length > 0) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.department ?? "").toLowerCase().includes(q) ||
          (r.companyName ?? "").toLowerCase().includes(q)),
    );
  }, [data, problemsOnly, search]);

  const personHref = (r: AgentHealthRow) =>
    withReturnTo(
      `/dashboard/reports/person/${encodeURIComponent(r.userId)}?date=${data?.date ?? ""}`,
      HREF,
      "Agent health",
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agent health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Is each person&apos;s agent calling in, is their day running, are screenshots arriving.{" "}
            {scopeLabel}
            {data ? `Updated ${formatTime12(data.asOf)}.` : ""}
          </p>
        </header>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {oneOrg && (departments.data?.length ?? 0) > 1 && (
            <div className="sm:w-64">
              <Select
                value={team}
                onValueChange={setTeam}
                options={teamOptions}
                aria-label="Department"
                searchable
                searchPlaceholder="Search departments…"
                className="!mt-0 h-11 !py-0"
              />
            </div>
          )}
          <label className="relative block sm:w-64">
            <span className="sr-only">Search people</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people…"
              className={`${inputBase} pl-9`}
            />
          </label>
        </div>
      </div>

      {data && (
        <Tiles
          s={data.summary}
          problemsOnly={problemsOnly}
          onProblems={() => setProblemsOnly((v) => !v)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs
          label="Which people"
          size="sm"
          value={problemsOnly ? "problems" : "all"}
          onChange={(v) => setProblemsOnly(v === "problems")}
          tabs={[
            { value: "all", label: "Everyone" },
            { value: "problems", label: "Problems only" },
          ]}
        />
        <p className="text-sm text-slate-500">
          {rows.length} {rows.length === 1 ? "person" : "people"}
          {problemsOnly ? " with something to look at" : ""}
        </p>
      </div>

      {query.isLoading ? (
        <LoadingState label="Checking every agent…" />
      ) : query.isError && !data ? (
        <ErrorState
          title="Couldn't load agent health"
          message={errorMessage(query.error)}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : rows.length === 0 ? (
        <div className={cardBase}>
          <EmptyState
            icon={HeartPulse}
            title={problemsOnly ? "Nothing to look at" : "Nobody here"}
            message={
              problemsOnly
                ? "Every agent in view is calling in, days are running, screenshots are arriving."
                : "No people in this scope."
            }
          />
        </div>
      ) : (
        <>
          {/* Phone: cards. */}
          <ul className={`${cardBase} divide-y divide-slate-100 overflow-hidden lg:hidden`}>
            {rows.map((r) => (
              <li key={r.userId} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={personHref(r)}
                      className="block truncate font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                    >
                      {r.name}
                    </Link>
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                      <span>{[r.department, roleLabel(r.role)].filter(Boolean).join(" · ")}</span>
                      <OrgChip name={r.companyName} show={mixed} />
                    </p>
                  </div>
                  <Flags row={r} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <AgentCell row={r} now={now} />
                  <DayCell row={r} />
                  <ShotsCell row={r} now={now} />
                </div>
              </li>
            ))}
          </ul>

          {/* Wider screens: a table. */}
          <div className={`${cardBase} hidden overflow-x-auto lg:block`}>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={thBase}>Person</th>
                  {mixed && <th className={thBase}>Organisation</th>}
                  <th className={thBase}>Agent</th>
                  <th className={thBase}>Day</th>
                  <th className={thBase}>
                    <span className="inline-flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5" aria-hidden />
                      Screenshots
                    </span>
                  </th>
                  <th className={thBase}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.userId} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link
                        href={personHref(r)}
                        className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                        <span>{[r.department, roleLabel(r.role)].filter(Boolean).join(" · ")}</span>
                      </p>
                    </td>
                    {mixed && (
                      <td className="px-4 py-3">
                        <OrgChip name={r.companyName} show />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <AgentCell row={r} now={now} />
                    </td>
                    <td className="px-4 py-3">
                      <DayCell row={r} />
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <ShotsCell row={r} now={now} />
                    </td>
                    <td className="px-4 py-3">
                      <Flags row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(34_34_204)]" aria-hidden />
        <p>
          A 3.1 or newer agent tracks and captures only after Start Day, so &quot;No Start Day&quot;
          is the first thing to check when someone has no screenshots. &quot;Upload refused&quot;
          shows the server&apos;s reason for the last refused screenshot; the limit is now 32 MB and
          images are shrunk on arrival, so a refusal after the 3.3 update points at the agent
          itself. Hover a chip for what it means.
        </p>
      </div>
    </div>
  );
}
