"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Users } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Select";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { btnGhost, cardBase } from "@/components/ui/classes";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { ROUNDING_NOTE, formatDuration } from "@/lib/format/duration";
import { useNow } from "@/lib/hooks/useNow";
import { withReturnTo } from "@/lib/nav/returnTo";
import { addDaysToKey, formatDayWithWeekday, hmOf, todayKey } from "@/lib/time/businessTime";
import { roleLabel } from "@/constants/roles";
import { useReportsToOptions } from "@/features/users/hooks/useReportsToOptions";
import { useAppSettings } from "@/features/settings/hooks/useSettings";
import { HourlyLegend, HourlyStrip } from "@/features/activity/components/HourlyStrip";
import { liveFocusSec, pendingEffectLines } from "@/features/workday/lib/focus";
import { useTeamToday } from "@/features/teamToday/hooks/useTeamToday";
import { breakCellLook, presenceLook } from "@/features/teamToday/lib/labels";
import { teamFocusSec } from "@/features/teamToday/lib/totals";
import { BREAK_SHORT_LABEL } from "@/features/shifts/lib/draft";
import { BREAK_KINDS } from "@/features/shifts/types";
import type { TeamTodayBreakCell, TeamTodayRow, TeamTodayTotals } from "@/features/teamToday/types";

const EVERYONE = "__everyone__";

/**
 * One column template for the header and every row, so they line up from xl.
 * The minimums (816px, plus 60px of gaps and 48px of padding) fit the card at
 * 1280px with a 17px scrollbar and the sidebar open. The meetings column is
 * wide enough for "1 pending" and each break cell for "Upcoming" on one line;
 * the break cells get the largest share of anything wider, and the activity
 * strip shrinks to fit.
 */
const ROW_GRID =
  "xl:grid-cols-[minmax(8rem,1.2fr)_minmax(4rem,0.5fr)_minmax(7rem,0.9fr)_minmax(16.5rem,2.2fr)_minmax(6rem,0.6fr)_minmax(9.5rem,13.5rem)] xl:gap-x-3";

/** A row's focus time as shown: ticking for today while the person's clock runs. */
function rowFocusSec(row: TeamTodayRow, fetchedAt: number, now: number, live: boolean): number {
  return live && row.focus?.running
    ? liveFocusSec(row.focus, fetchedAt, now)
    : Math.max(0, row.focus?.focusSec ?? 0);
}

function Totals({
  totals,
  live,
  focusSec,
}: {
  totals: TeamTodayTotals;
  live: boolean;
  /** The team's focus time in exact seconds, kept running with the rows' clocks. */
  focusSec: number;
}) {
  const started = Math.max(0, totals.started);
  const perPerson = started > 0 ? formatDuration(focusSec / started) : "0m";
  const tiles: { label: string; value: string; sub: string; tone?: string; href?: string }[] = [
    live
      ? {
          label: "Started the day",
          value: `${started} of ${totals.people}`,
          sub: `${totals.notStarted} not started · ${totals.ended} ended the day`,
        }
      : {
          label: "Started the day",
          value: `${started} of ${totals.people}`,
          sub: `${totals.notStarted} did not start`,
        },
    // A past day has no "right now": how many closed their day instead.
    live
      ? {
          label: "Right now",
          value: `${totals.onBreak + totals.inMeeting} away`,
          sub: `${totals.onBreak} on a break · ${totals.inMeeting} in a meeting`,
        }
      : {
          label: "Ended the day",
          value: `${totals.ended} of ${started}`,
          sub: "With End Day, or closed automatically",
        },
    {
      label: "Late starts",
      value: String(totals.lateStarts),
      sub: "Reported only, focus time is not changed",
      tone: totals.lateStarts ? "text-amber-700" : undefined,
    },
    {
      label: live ? "Focus time so far" : "Focus time",
      value: formatDuration(focusSec),
      sub: `${perPerson} a person who started`,
    },
    // The rows' own pending items (dated on the day shown), added up. Overdue
    // counts every date, and says so.
    {
      label: live ? "Pending from today" : "Pending from this day",
      value: String(totals.pendingApprovals),
      sub: totals.overdueApprovals ? `${totals.overdueApprovals} overdue in all` : "None overdue",
      tone: totals.overdueApprovals ? "text-rose-600" : undefined,
      href: "/dashboard/approvals",
    },
    {
      label: "Quiet hours",
      value: String(totals.quietHours),
      sub: "Activity only, never focus time",
      tone: totals.quietHours ? "text-amber-700" : undefined,
    },
  ];
  return (
    <dl
      aria-label="Team totals"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:grid-cols-6"
    >
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.label}
          </dt>
          <dd className={`mt-0.5 text-xl font-bold tabular-nums ${t.tone ?? "text-slate-900"}`}>
            {t.href ? (
              <Link
                href={t.href}
                className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
              >
                {t.value}
              </Link>
            ) : (
              t.value
            )}
          </dd>
          <dd className="mt-0.5 text-xs leading-snug text-slate-500">{t.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Focus time, ticking for today while the person's clock runs. */
function FocusCell({
  row,
  fetchedAt,
  now,
  live,
}: {
  row: TeamTodayRow;
  fetchedAt: number;
  /** The page's clock, shared with the totals so the two always agree. */
  now: number;
  live: boolean;
}) {
  const focus = rowFocusSec(row, fetchedAt, now, live);
  const expected = Math.max(0, row.expectedSec || 0);
  const pct = expected ? Math.min(100, Math.round((focus / expected) * 100)) : 0;
  const lines = pendingEffectLines(row.focus);
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-sm font-bold tabular-nums text-slate-900">
        {/* Each part stays whole; a narrow column moves "of 8h 00m" to its own line. */}
        <span className="whitespace-nowrap">{formatDuration(focus)}</span>
        {expected > 0 && (
          <>
            {" "}
            <span className="whitespace-nowrap text-xs font-normal text-slate-500">
              of {formatDuration(expected)}
            </span>
          </>
        )}
      </p>
      {expected > 0 && (
        <span aria-hidden className="block h-1.5 w-24 overflow-hidden rounded-full bg-indigo-100">
          <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
        </span>
      )}
      {lines.map((l) => (
        <p
          key={l.text}
          className={`text-xs font-semibold ${l.tone === "plus" ? "text-emerald-700" : "text-rose-700"}`}
        >
          {l.text}
        </p>
      ))}
    </div>
  );
}

const CELL_TEXT: Record<string, { text: string; dot: string }> = {
  success: { text: "text-emerald-700", dot: "bg-emerald-500" },
  violet: { text: "text-violet-700", dot: "bg-violet-500" },
  info: { text: "text-sky-700", dot: "bg-sky-500" },
  brand: { text: "text-indigo-700", dot: "bg-indigo-600" },
  warning: { text: "text-amber-700", dot: "bg-amber-500" },
  danger: { text: "text-rose-700", dot: "bg-rose-500" },
  neutral: { text: "text-slate-600", dot: "bg-slate-400" },
};

/** The three breaks of the day, each with its state and, once taken, when and how long. */
function BreakCells({ cells }: { cells: TeamTodayBreakCell[] }) {
  if (!cells.length) return <p className="text-xs text-slate-500">No breaks on this day</p>;
  return (
    <ul className="grid grid-cols-3 gap-1.5" aria-label="Breaks">
      {BREAK_KINDS.map((kind) => {
        const cell = cells.find((c) => c.kind === kind);
        const label = cell?.label?.replace(/ break$/i, "") || BREAK_SHORT_LABEL[kind];
        if (!cell) {
          return (
            <li key={kind} className="rounded-lg bg-slate-50 px-1.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {BREAK_SHORT_LABEL[kind]}
              </p>
              <p className="text-xs text-slate-400">Off</p>
            </li>
          );
        }
        const look = breakCellLook(cell.status);
        const color = CELL_TEXT[look.tone] ?? CELL_TEXT.neutral;
        const r = cell.record;
        const skip = r?.outcome === "SKIPPED" || r?.outcome === "AUTO_SKIPPED";
        const when = r
          ? skip
            ? hmOf(r.startedAt)
            : `${hmOf(r.startedAt)} · ${formatDuration(r.tookSec ?? 0)}`
          : "";
        return (
          <li key={kind} className="min-w-0 rounded-lg bg-slate-50 px-1.5 py-1.5">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p
              className={`flex items-start gap-1 text-xs font-semibold leading-snug ${color.text}`}
            >
              <span
                aria-hidden
                className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${color.dot} ${
                  cell.status === "IN_PROGRESS" ? "animate-pulse" : ""
                }`}
              />
              <span className="min-w-0 break-words">{look.label}</span>
            </p>
            {when && (
              <p className="mt-0.5 break-words text-[11px] tabular-nums text-slate-500">{when}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function StatusLine({ row }: { row: TeamTodayRow }) {
  const look = presenceLook(row.status);
  const since =
    row.status === "DAY_ENDED"
      ? row.endedAt
        ? `Ended ${hmOf(row.endedAt)}`
        : ""
      : row.statusSince && row.status !== "NOT_STARTED"
        ? `Since ${hmOf(row.statusSince)}`
        : "";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip tone={look.tone} dot={row.status !== "NOT_STARTED" && row.status !== "DAY_ENDED"}>
        {look.label}
      </Chip>
      {since && <span className="text-xs text-slate-500">{since}</span>}
      {row.autoClosed && (
        <Chip
          tone="neutral"
          icon={Lock}
          title="Nobody pressed End Day; it closed at the last input"
          wrap
        >
          Closed automatically
        </Chip>
      )}
    </div>
  );
}

function PersonRow({
  row,
  date,
  fetchedAt,
  now,
  live,
}: {
  row: TeamTodayRow;
  date: string;
  fetchedAt: number;
  now: number;
  live: boolean;
}) {
  const name = row.user?.name || row.user?.email || "Someone";
  // The row's own day: a night shift that began yesterday reports on yesterday.
  const href = withReturnTo(
    `/dashboard/reports/person/${encodeURIComponent(row.user.id)}?date=${row.date ?? date}`,
    "/dashboard/team-today",
    "Team today",
  );
  const meetings = row.meetings ?? { count: 0, sec: 0 };
  const quiet = Math.max(0, row.quietHours ?? 0);

  return (
    <li
      className={`relative grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-slate-50/80 sm:px-6 xl:items-start ${ROW_GRID}`}
    >
      <div className="col-span-2 min-w-0 space-y-1.5 xl:col-span-1">
        <Link
          href={href}
          aria-label={`${name}, open the day report`}
          className="block break-words font-semibold text-[rgb(34_34_204)] underline-offset-2 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-[rgba(34,34,204,0.35)]"
        >
          {name}
        </Link>
        <p className="break-words text-xs text-slate-500">
          {[row.user?.department, roleLabel(row.user?.role)].filter(Boolean).join(" · ")}
        </p>
        <StatusLine row={row} />
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:sr-only">
          Started
        </p>
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {row.startedAt ? hmOf(row.startedAt) : live ? "Not yet" : "Did not start"}
        </p>
        {row.lateStart && row.lateStart.minutes > 0 && (
          <p className="text-xs font-semibold text-amber-700">
            {row.lateStart.minutes} min late start
          </p>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:sr-only">
          Focus time
        </p>
        <FocusCell row={row} fetchedAt={fetchedAt} now={now} live={live} />
      </div>

      <div className="col-span-2 min-w-0 xl:col-span-1">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:sr-only">
          Breaks
        </p>
        <BreakCells cells={Array.isArray(row.breaks) ? row.breaks : []} />
      </div>

      <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:col-span-1 sm:block sm:space-y-1 xl:col-span-1">
        <p className="sr-only">Meetings and approvals</p>
        <p className="text-slate-700">
          {meetings.count > 0 ? (
            <>
              {meetings.count} {meetings.count === 1 ? "meeting" : "meetings"} ·{" "}
              {/* "1h 00m" stays on one line in a narrow column. */}
              <span className="whitespace-nowrap">{formatDuration(meetings.sec)}</span>
            </>
          ) : (
            "No meetings"
          )}
        </p>
        {row.pending > 0 ? (
          <Chip tone="warning" dot wrap>
            {row.pending} pending
          </Chip>
        ) : (
          <p className="text-xs text-slate-500">Nothing pending</p>
        )}
      </div>

      <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1 xl:col-span-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:sr-only">
          Activity by hour
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <HourlyStrip
            hours={row.hourly}
            name={name}
            startedAt={row.startedAt}
            // A day still running ends "now", so a night shift wraps once it is past midnight.
            endedAt={
              row.endedAt ??
              (live && row.startedAt && row.status !== "DAY_ENDED"
                ? new Date(now).toISOString()
                : null)
            }
          />
          {quiet > 0 && (
            <Chip tone="warning">
              {quiet} quiet {quiet === 1 ? "hour" : "hours"}
            </Chip>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Team today: everyone's day at a glance. Status now, Start Day, focus time with
 * what pending approvals could still change, the three breaks, meetings,
 * pending items and keyboard and mouse minutes by hour. A Manager sees their
 * own staff; a Super Admin everyone or one manager's team. Refreshes every 60 s
 * while it shows today.
 */
export function TeamTodayView({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [team, setTeam] = useState(EVERYONE);
  const managers = useReportsToOptions(isSuperAdmin);
  const settings = useAppSettings();
  const isToday = date === today;

  const params = useMemo(
    () => ({
      date: isToday ? undefined : date,
      managerId: isSuperAdmin && team !== EVERYONE ? team : undefined,
    }),
    [date, isToday, team, isSuperAdmin],
  );
  const query = useTeamToday(params, isToday);
  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData, dataUpdatedAt } =
    query;

  const teamOptions = useMemo<SelectOption[]>(
    () => [
      { value: EVERYONE, label: "Everyone", icon: Users },
      ...managers.options.map((o) => ({ ...o, label: `${o.label}'s team` })),
    ],
    [managers.options],
  );

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const quietBelow = settings.data?.quietHourActiveMin ?? 20;
  const shownDate = data?.date ?? date;
  // One clock for every row and the totals, so they tick together. The tile is
  // the exact total, rounded once; each row is rounded on its own.
  const now = useNow(30_000, isToday && rows.some((r) => r.focus?.running));
  const focusShown = teamFocusSec(data?.totals.focusSec ?? 0, rows, dataUpdatedAt, now, isToday);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team today</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            {isToday && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
                Live
              </span>
            )}
            <span>
              {formatDayWithWeekday(shownDate)}
              {data?.serverNow && isToday ? ` · updated ${hmOf(data.serverNow)}` : ""}
              {data
                ? ` · ${data.totals.people} ${data.totals.people === 1 ? "person" : "people"}`
                : ""}
            </span>
          </p>
        </header>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isSuperAdmin && (
            <div className="sm:w-64">
              <Select
                value={team}
                onValueChange={setTeam}
                options={teamOptions}
                aria-label="Team"
                searchable
                searchPlaceholder="Search managers…"
                className="!mt-0 h-11 !py-0"
              />
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDate(addDaysToKey(date, -1))}
              className={btnGhost}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <label className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm">
              <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="sr-only">Day</span>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) =>
                  setDate(e.target.value && e.target.value <= today ? e.target.value : today)
                }
                className="min-w-0 bg-transparent font-semibold text-slate-900 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setDate(addDaysToKey(date, 1))}
              disabled={isToday}
              className={btnGhost}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            {!isToday && (
              <button type="button" onClick={() => setDate(today)} className={btnGhost}>
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {isError && data && (
        <RefreshFailedNotice
          what="Team today"
          updatedAt={dataUpdatedAt}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {data && <Totals totals={data.totals} live={isToday} focusSec={focusShown} />}

      <section className={cardBase} aria-labelledby="team-today-people">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h2 id="team-today-people" className="text-base font-semibold text-slate-900">
            {isToday ? "Everyone right now" : `Everyone on ${formatDayWithWeekday(date)}`}
          </h2>
          <HourlyLegend quietBelow={quietBelow} />
        </div>

        {isLoading ? (
          <LoadingState label="Loading Team today…" />
        ) : isError && !data ? (
          <ErrorState
            title="Couldn't load Team today"
            message={errorMessage(error)}
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nobody in this team"
            message={
              isSuperAdmin
                ? "Pick another team, or add people under Team Management."
                : "Staff who report to you will appear here."
            }
          />
        ) : (
          <div
            className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}
          >
            <div
              aria-hidden
              className={`hidden border-b border-slate-200 bg-slate-50/70 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 xl:grid ${ROW_GRID}`}
            >
              <span>Person</span>
              <span>Started</span>
              <span>Focus time</span>
              <span>Breaks</span>
              <span>Meetings</span>
              <span>Activity by hour</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => (
                <PersonRow
                  key={row.user.id}
                  row={row}
                  date={shownDate}
                  fetchedAt={dataUpdatedAt}
                  now={now}
                  live={isToday}
                />
              ))}
            </ul>
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-6">
              {ROUNDING_NOTE}
            </p>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        Activity is never added to or taken from focus time. A quiet hour is an hour with under{" "}
        {quietBelow} minutes of keyboard and mouse activity and no meeting or break logged in it.
        Only managers and Super Admins see activity.
      </p>
    </div>
  );
}
