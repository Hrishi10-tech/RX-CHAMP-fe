"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Layers, Lock, Search, Users, Wifi, WifiOff } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { Avatar } from "@/components/ui/Avatar";
import { cardBase } from "@/components/ui/classes";
import type { SelectOption } from "@/components/ui/types";
import { errorCode, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { offlineText } from "@/lib/format/payroll";
import { formatTime12 } from "@/lib/time/format";
import { roleLabel } from "@/constants/roles";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { departmentIcon } from "@/features/departments/lib/icons";
import { useTeam } from "@/features/team/hooks/useTeam";
import { filterTeam, focusShare, teamCounts, teamStatusLook } from "@/features/team/lib/team";
import type { TeamFilterView, TeamPerson } from "@/features/team/types";

/** Select value for every department (Radix needs a non-empty value). */
const ALL = "__all__";

const ROW_GRID =
  "md:grid md:grid-cols-[minmax(12rem,1.6fr)_minmax(8rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1.2fr)_2rem] md:items-center md:gap-4";

/** Focus today against the person's target, as a bar and words. */
export function FocusBar({ focusSec, targetSec }: { focusSec: number; targetSec: number }) {
  const share = focusShare(focusSec, targetSec);
  const met = targetSec > 0 && focusSec >= targetSec;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold tabular-nums text-slate-800">
          {formatDuration(focusSec)}
        </span>
        <span className="tabular-nums text-slate-400">
          {targetSec > 0 ? `of ${formatDuration(targetSec)}` : "no target"}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${formatDuration(focusSec)} focus of ${formatDuration(targetSec)} target`}
      >
        <div
          className={`h-full rounded-full ${met ? "bg-emerald-500" : "bg-[rgb(34_34_204)]"}`}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

function StatusCell({ person }: { person: TeamPerson }) {
  const look = teamStatusLook(person.status);
  const since =
    person.status === "NOT_STARTED"
      ? null
      : person.status === "ENDED"
        ? person.since
          ? `at ${formatTime12(person.since)}`
          : null
        : person.since
          ? `since ${formatTime12(person.since)}`
          : null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      <Chip tone={look.tone} dot pulse={person.status === "WORKING"}>
        {look.label}
      </Chip>
      {since && <span className="text-xs text-slate-500">{since}</span>}
      {person.lateStartMin > 0 && (
        <span className="text-xs font-medium text-orange-600">
          started {formatDuration(person.lateStartMin * 60)} late
        </span>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: TeamPerson }) {
  const href = `/dashboard/team/${encodeURIComponent(person.id)}?name=${encodeURIComponent(person.name)}`;
  return (
    <li>
      <Link
        href={href}
        className={`group block px-4 py-3.5 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:px-5 ${ROW_GRID}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative shrink-0">
            <Avatar name={person.name} />
            <span
              aria-hidden
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                person.online ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{person.name}</p>
            <p className="truncate text-xs text-slate-500">
              {[person.designation, person.role !== "USER" ? roleLabel(person.role) : null]
                .filter(Boolean)
                .join(" · ") || "Staff"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 md:hidden" aria-hidden />
        </div>

        <div className="mt-2 flex min-w-0 items-center gap-2 md:mt-0">
          {person.department ? (
            <>
              <DepartmentIcon icon={person.department.icon} size="xs" />
              <span className="truncate text-sm text-slate-600">{person.department.name}</span>
            </>
          ) : (
            <span className="text-sm text-slate-400">No department</span>
          )}
        </div>

        <div className="mt-2 md:mt-0">
          <StatusCell person={person} />
        </div>

        <div className="mt-2 md:mt-0">
          <FocusBar focusSec={person.focusSec} targetSec={person.targetSec} />
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Paid time{" "}
            <span className="font-semibold tabular-nums text-slate-700">
              {formatDuration(person.paidSec)}
            </span>
            {offlineText(person.unverifiedSec) && (
              <span className="block">{offlineText(person.unverifiedSec)}</span>
            )}
          </p>
        </div>

        <span
          className="hidden justify-end md:flex"
          title={person.online ? "Agent online" : "Agent offline"}
        >
          {person.online ? (
            <Wifi className="h-4 w-4 text-emerald-500" aria-label="Agent online" />
          ) : (
            <WifiOff className="h-4 w-4 text-slate-300" aria-label="Agent offline" />
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * SPEC 7.2 Team: who is working now. Active / All, counts, search and
 * department filter; a row opens the person's productivity dashboard.
 */
export function TeamView() {
  const team = useTeam();
  const [view, setView] = useState<TeamFilterView>("active");
  const [departmentChoice, setDepartmentChoice] = useState(ALL);
  const departmentId = departmentChoice === ALL ? "" : departmentChoice;
  const [q, setQ] = useState("");

  const people = useMemo(() => team.data?.people ?? [], [team.data]);

  const departments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon: string }>();
    for (const p of people) if (p.department) map.set(p.department.id, p.department);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  const departmentOptions: SelectOption[] = useMemo(
    () => [
      { value: ALL, label: "All departments", icon: Layers },
      ...departments.map((d) => ({ value: d.id, label: d.name, icon: departmentIcon(d.icon) })),
    ],
    [departments],
  );

  // Counts follow the department and search, so the tabs and tiles match the rows.
  const scoped = useMemo(
    () => filterTeam(people, { view: "all", departmentId, q }),
    [people, departmentId, q],
  );
  const counts = useMemo(() => teamCounts(scoped), [scoped]);
  const rows = useMemo(
    () => filterTeam(people, { view, departmentId, q }),
    [people, view, departmentId, q],
  );

  const tiles: { label: string; value: number; dot: string }[] = [
    { label: "Working", value: counts.working, dot: "bg-emerald-500" },
    { label: "On a break", value: counts.onBreak, dot: "bg-amber-500" },
    { label: "In a meeting", value: counts.inMeeting, dot: "bg-[rgb(34_34_204)]" },
    { label: "Away", value: counts.away, dot: "bg-rose-500" },
    { label: "Not started", value: counts.notStarted, dot: "bg-slate-300" },
    { label: "Day ended", value: counts.ended, dot: "bg-sky-500" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team"
        subtitle="Who is working right now and how today's focus is going. Open someone for their day."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedTabs
          label="Show"
          value={view}
          onChange={setView}
          tabs={[
            { value: "active", label: "Active", badge: counts.active },
            { value: "all", label: "All", badge: counts.all },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-[rgb(34_34_204)]"
            />
          </div>
          <div className="sm:w-60 [&>button]:mt-0">
            <Select
              value={departmentChoice}
              onValueChange={setDepartmentChoice}
              options={departmentOptions}
              aria-label="Department"
            />
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 bg-white px-3 py-2.5 sm:px-4">
            <dt className="flex items-center gap-1.5 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} />
              {t.label}
            </dt>
            <dd className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{t.value}</dd>
          </div>
        ))}
      </dl>

      {team.isError && team.data && (
        <RefreshFailedNotice
          what="the team"
          updatedAt={team.dataUpdatedAt}
          onRetry={() => void team.refetch()}
          retrying={team.isFetching}
        />
      )}

      <section className={`${cardBase} overflow-hidden`} aria-label="People">
        <div
          className={`hidden border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${ROW_GRID}`}
          aria-hidden
        >
          <span>Person</span>
          <span>Department</span>
          <span>Status</span>
          <span>Focus today</span>
          <span />
        </div>
        {team.isPending ? (
          <LoadingState label="Loading the team…" />
        ) : team.isError && !team.data && errorCode(team.error) === "GRANT_REQUIRED" ? (
          <EmptyState
            icon={Lock}
            title="Not shared with you"
            message="Ask your Admin for access to screenshots, timelines or activity to see your team here."
          />
        ) : team.isError && !team.data ? (
          <ErrorState
            message={errorMessage(team.error)}
            onRetry={() => void team.refetch()}
            retrying={team.isFetching}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              view === "active" && !q && !departmentId
                ? "Nobody is working right now"
                : "Nobody matches"
            }
            message={
              view === "active" && !q && !departmentId
                ? "People appear here once they start their day in the RX Vision app."
                : "Try another department or search, or show All."
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
