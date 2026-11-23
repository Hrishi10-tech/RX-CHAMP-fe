"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  CircleSlash,
  ClipboardCheck,
  Coffee,
  Hourglass,
  Laptop,
  PartyPopper,
  RotateCw,
  ShieldAlert,
  Target,
  UserX,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { offlineText } from "@/lib/format/payroll";
import { dateKeyOf, formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { businessHourOf, formatTime12 } from "@/lib/time/format";
import { formatMonth } from "@/lib/time/months";
import { useOrgScope } from "@/lib/org/selection";
import { canAccess } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { usePresenceRefresh } from "@/features/presence/hooks/usePresenceRefresh";
import { getOverview } from "@/features/overview/api/overview";
import { HourlyWorkingChart } from "@/features/overview/components/HourlyWorkingChart";
import type { OverviewAttention, OverviewView as Overview } from "@/features/overview/types";

export const overviewKeys = {
  all: ["overview"] as const,
  org: (org: string) => [...overviewKeys.all, org] as const,
};

function share(part: number, whole: number): number {
  return whole > 0 ? Math.max(0, Math.min(100, (part / whole) * 100)) : 0;
}

function greeting(): string {
  const h = businessHourOf(new Date());
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const TILE_TONE = {
  emerald: { icon: "bg-working-wash text-working", value: "text-working" },
  amber: { icon: "bg-attention-wash text-attention", value: "text-attention" },
  meeting: { icon: "bg-meeting-wash text-meeting", value: "text-meeting" },
  rose: { icon: "bg-attention-wash text-attention", value: "text-attention" },
  slate: { icon: "bg-panel text-quiet", value: "text-strong" },
} as const;

function LiveTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
  tone: keyof typeof TILE_TONE;
  href?: string;
}) {
  const t = TILE_TONE[tone];
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.icon}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        {href && (
          <ArrowRight
            className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-neutral"
            aria-hidden
          />
        )}
      </div>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${value > 0 ? t.value : "text-quiet"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-body">{label}</p>
      <p className="truncate text-xs text-quiet">{sub}</p>
    </>
  );
  const cls = `${cardBase} group block min-w-0 p-4 transition`;
  return href ? (
    <Link href={href} className={`${cls} hover:border-edge-strong hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function ProgressBar({
  value,
  marker,
  tone = "brand",
  label,
}: {
  value: number;
  /** A tick at this share (e.g. where the month should be by now). */
  marker?: number;
  tone?: "brand" | "emerald";
  label: string;
}) {
  return (
    <div className="relative h-2.5 rounded-full bg-panel" role="img" aria-label={label}>
      <div
        className={`h-full rounded-full ${tone === "emerald" ? "bg-working" : "bg-brand"}`}
        style={{ width: `${value}%` }}
      />
      {marker !== undefined && marker > 0 && marker < 100 && (
        <span
          aria-hidden
          className="absolute -top-1 w-0.5 rounded bg-quiet"
          style={{ left: `${marker}%`, height: 18 }}
        />
      )}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card as="section" className={`flex min-w-0 flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-strong">
          <Icon className="h-4 w-4 text-brand" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

const ATTENTION: Record<string, { icon: LucideIcon; label: (n: number) => string; href: string }> =
  {
    AWAY_UNEXPLAINED: {
      icon: Hourglass,
      label: (n) => `${n} away without a reason`,
      href: "/dashboard/team",
    },
    LATE_START: {
      icon: AlarmClock,
      label: (n) => `${n} started late today`,
      href: "/dashboard/team",
    },
    NO_AGENT: {
      icon: Laptop,
      label: (n) => `${n} ${n === 1 ? "has" : "have"} no RX Vision app signed in`,
      href: "/dashboard/people",
    },
    NO_DEPARTMENT: {
      icon: UserX,
      label: (n) => `${n} not in a department`,
      href: "/dashboard/people",
    },
    NO_ADMIN: {
      icon: ShieldAlert,
      label: () => "This organisation has no admin yet",
      href: "/dashboard/organisations",
    },
  };

function AttentionList({
  items,
  canOpen,
}: {
  items: OverviewAttention[];
  canOpen: (href: string) => boolean;
}) {
  const shown = items.filter((a) => a.count > 0);
  if (shown.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-working-wash text-working">
          <PartyPopper className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm font-semibold text-body">Nothing needs a look</p>
        <p className="text-xs text-quiet">Everyone is set up and accounted for.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {shown.map((a) => {
        const meta = ATTENTION[a.kind] ?? {
          icon: CircleSlash,
          label: (n: number) => `${n} ${a.kind.toLowerCase().replace(/_/g, " ")}`,
          href: "",
        };
        const Icon = meta.icon;
        const names = a.people
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ");
        const more = a.count - Math.min(3, a.people.length);
        const content = (
          <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-wash text-attention">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-strong">{meta.label(a.count)}</span>
              {names && (
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-quiet">
                  {/* 3.6: the first few people, as they show everywhere else. */}
                  <span className="flex shrink-0 -space-x-1.5">
                    {a.people.slice(0, 3).map((p) => (
                      <PersonAvatar
                        key={p.id}
                        name={p.name}
                        avatarId={p.avatarId}
                        userId={p.id}
                        size={18}
                        className="ring-2 ring-card"
                      />
                    ))}
                  </span>
                  <span className="truncate">
                    {names}
                    {more > 0 ? ` and ${more} more` : ""}
                  </span>
                </span>
              )}
            </span>
          </>
        );
        return (
          <li key={a.kind}>
            {meta.href && canOpen(meta.href) ? (
              <Link
                href={meta.href}
                className="flex items-center gap-3 rounded-xl border border-divider p-2.5 transition hover:border-card hover:bg-fill"
              >
                {content}
                <ArrowRight className="h-4 w-4 shrink-0 text-faint" aria-hidden />
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-divider p-2.5">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Under a focus figure: paid time when the server sends it, and offline time
 * without activity data when there is some (it is not in focus).
 */
function PayrollLine({
  paidSec,
  unverifiedSec,
}: {
  paidSec: number | null;
  unverifiedSec: number;
}) {
  const offline = offlineText(unverifiedSec);
  if (paidSec === null && !offline) return null;
  return (
    <p className="mt-1.5 text-xs text-quiet">
      {paidSec !== null && (
        <>
          Paid time{" "}
          <span className="font-semibold tabular-nums text-body">{formatDuration(paidSec)}</span>
        </>
      )}
      {paidSec !== null && offline ? " · " : ""}
      {offline ? `${offline}, not counted` : ""}
    </p>
  );
}

function daysUntil(date: string, today: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

function OverviewBody({ data, updatedAt }: { data: Overview; updatedAt: number }) {
  const { user, role, me } = useSession();
  const today = todayKey();
  const t = data.today;
  const canOpen = (href: string) => canAccess(role, href, { grants: me?.grants });
  const teamHref = canOpen("/dashboard/team") ? "/dashboard/team" : undefined;
  const scopeName =
    role === "MANAGER"
      ? data.scope.departments.map((d) => d.name).join(", ") || "Your departments"
      : (data.scope.organisation?.name ?? me?.organisation?.name ?? "");
  const firstName = (user?.name ?? "").split(" ")[0];
  const focusPct = share(t.focusSec, t.targetSec);
  const m = data.month;
  const monthPct = share(m.focusSec, m.targetSec);
  const pace = m.workingDays > 0 ? (m.elapsedWorkingDays / m.workingDays) * 100 : undefined;
  const oldest = data.approvals.oldestDueAt;
  const oldestOverdue = oldest ? Date.parse(oldest) < updatedAt : false;
  const oldestDay = oldest ? formatDayWithWeekday(dateKeyOf(new Date(oldest))) : "";

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-quiet">{formatDayWithWeekday(today)}</p>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {scopeName && <p className="mt-0.5 truncate text-sm text-quiet">{scopeName}</p>}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-quiet">
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Live · updated {formatTime12(updatedAt)}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <LiveTile
          icon={Zap}
          label="Working"
          value={t.working}
          sub={`of ${t.people} people`}
          tone="emerald"
          href={teamHref}
        />
        <LiveTile
          icon={Coffee}
          label="On a break"
          value={t.onBreak}
          sub="Scheduled or quick"
          tone="amber"
          href={teamHref}
        />
        <LiveTile
          icon={Video}
          label="In a meeting"
          value={t.inMeeting}
          sub="Live meetings"
          tone="meeting"
          href={teamHref}
        />
        <LiveTile
          icon={Hourglass}
          label="Away"
          value={t.away}
          sub="Idle past their limit"
          tone="rose"
          href={teamHref}
        />
        <LiveTile
          icon={Users}
          label="Not started"
          value={t.notStarted}
          sub={`${t.ended} ended the day`}
          tone="slate"
          href={teamHref}
        />
        <LiveTile
          icon={AlarmClock}
          label="Late starts"
          value={t.lateStarts}
          sub="Reported only"
          tone="rose"
          href={teamHref}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Focus today" icon={Target}>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {formatDuration(t.focusSec)}
          </p>
          <p className="mt-0.5 text-sm text-quiet">
            of {formatDuration(t.targetSec)} target · {Math.round(focusPct)}%
          </p>
          <div className="mt-4">
            <ProgressBar
              value={focusPct}
              label={`${Math.round(focusPct)}% of today's focus target`}
              tone={focusPct >= 100 ? "emerald" : "brand"}
            />
          </div>
          <p className="mt-3 text-xs text-quiet">
            {t.started} of {t.people} started their day · {t.ended} ended it
          </p>
          <PayrollLine paidSec={t.paidSec} unverifiedSec={t.unverifiedSec} />
        </Panel>

        <Panel
          title="Approvals"
          icon={ClipboardCheck}
          action={
            canOpen("/dashboard/approvals") ? (
              <Link
                href="/dashboard/approvals"
                className={buttonClass("ghost", "px-2 py-1 text-xs")}
              >
                Open
              </Link>
            ) : undefined
          }
        >
          <div className="flex items-end gap-6">
            <div>
              <p className="text-3xl font-bold tabular-nums text-primary">
                {data.approvals.pending}
              </p>
              <p className="text-sm text-quiet">pending</p>
            </div>
            <div>
              <p
                className={`text-3xl font-bold tabular-nums ${
                  data.approvals.overdue > 0 ? "text-attention" : "text-quiet"
                }`}
              >
                {data.approvals.overdue}
              </p>
              <p className="text-sm text-quiet">overdue</p>
            </div>
          </div>
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-xs ${
              oldestOverdue ? "bg-attention-wash text-attention" : "bg-fill text-soft"
            }`}
          >
            {oldest
              ? `${oldestOverdue ? "Oldest was due" : "Next due"} ${oldestDay}, ${formatTime12(oldest)}`
              : data.approvals.pending > 0
                ? `${data.approvals.pending} ${data.approvals.pending === 1 ? "item is" : "items are"} waiting for a decision.`
                : "Nothing waiting for a decision."}
          </p>
        </Panel>

        <Panel title={m.month ? formatMonth(m.month) : "This month"} icon={CalendarDays}>
          <p className="text-3xl font-bold tabular-nums text-primary">
            {formatDuration(m.focusSec)}
          </p>
          <p className="mt-0.5 text-sm text-quiet">
            of {formatDuration(m.targetSec)} · day {m.elapsedWorkingDays} of {m.workingDays} working
            days
          </p>
          <div className="mt-4">
            <ProgressBar
              value={monthPct}
              marker={pace}
              label={`${Math.round(monthPct)}% of the month's focus target`}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <Chip tone="success">{m.full} full</Chip>
            <Chip tone="warning">{m.half} half</Chip>
            <Chip tone="danger">{m.absent} absent</Chip>
          </div>
          <PayrollLine paidSec={m.paidSec} unverifiedSec={m.unverifiedSec} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {data.hourly && data.hourly.length > 0 ? (
          <Panel title="Working by hour, today" icon={Zap} className="lg:col-span-2">
            <HourlyWorkingChart data={data.hourly} currentHour={businessHourOf(updatedAt)} />
          </Panel>
        ) : (
          <Panel title="Working by hour, today" icon={Zap} className="lg:col-span-2">
            <p className="flex flex-1 items-center justify-center py-10 text-center text-sm text-quiet">
              {data.hourly === null
                ? "Hourly activity is shared with managers who have the activity grant."
                : "No one has worked yet today."}
            </p>
          </Panel>
        )}
        <Panel title="Needs attention" icon={ShieldAlert}>
          <AttentionList items={data.attention} canOpen={canOpen} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Departments"
          icon={Users}
          className="lg:col-span-2"
          action={
            canOpen("/dashboard/departments") ? (
              <Link
                href="/dashboard/departments"
                className={buttonClass("ghost", "px-2 py-1 text-xs")}
              >
                Manage
              </Link>
            ) : undefined
          }
        >
          {data.departments.length === 0 ? (
            <p className="py-6 text-center text-sm text-quiet">No departments yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.departments.map((d) => {
                const pct = share(d.focusSec, d.targetSec);
                return (
                  <li key={d.id} className="rounded-xl border border-divider p-3">
                    <div className="flex items-center gap-3">
                      <DepartmentIcon icon={d.icon} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">{d.name}</p>
                        <p className="text-xs text-quiet">
                          <span className="font-semibold text-working">{d.working}</span> working ·{" "}
                          {d.staff} staff
                        </p>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-quiet">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <ProgressBar
                        value={pct}
                        label={`${d.name}: ${Math.round(pct)}% of focus target`}
                      />
                    </div>
                    <p className="mt-1.5 text-[0.6875rem] tabular-nums text-quiet">
                      {formatDuration(d.focusSec)} of {formatDuration(d.targetSec)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Next holidays"
          icon={PartyPopper}
          action={
            canOpen("/dashboard/calendar") ? (
              <Link
                href="/dashboard/calendar"
                className={buttonClass("ghost", "px-2 py-1 text-xs")}
              >
                Calendar
              </Link>
            ) : undefined
          }
        >
          {data.nextHolidays.length === 0 ? (
            <p className="py-6 text-center text-sm text-quiet">No holidays coming up.</p>
          ) : (
            <ul className="space-y-2">
              {data.nextHolidays.slice(0, 5).map((h) => {
                const inDays = daysUntil(h.date, today);
                const [, , d] = h.date.split("-");
                return (
                  <li key={h.date} className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-meeting-wash text-meeting">
                      <span className="text-[0.6875rem] font-bold uppercase leading-none">
                        {formatDayWithWeekday(h.date).split(" ")[2]}
                      </span>
                      <span className="text-base font-bold leading-tight">{Number(d)}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-strong">
                        {h.label || "Holiday"}
                      </span>
                      <span className="block text-xs text-quiet">
                        {formatDayWithWeekday(h.date)} ·{" "}
                        {inDays <= 0 ? "today" : inDays === 1 ? "tomorrow" : `in ${inDays} days`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * SPEC 7.2 Overview (Admin, Manager, Super Admin inside an organisation): one
 * request, refreshed every 60 seconds and on presence changes.
 */
export function OverviewView() {
  const org = useOrgScope();
  const queryClient = useQueryClient();
  const key = overviewKeys.org(org);
  const overview = useQuery({
    queryKey: key,
    queryFn: () => getOverview(),
    refetchInterval: 60_000,
  });
  usePresenceRefresh(() => void queryClient.invalidateQueries({ queryKey: key }));

  if (overview.isPending) {
    return (
      <Card>
        <LoadingState label="Loading the overview…" />
      </Card>
    );
  }
  if (overview.isError && !overview.data) {
    return (
      <Card>
        <ErrorState
          message={errorMessage(overview.error)}
          onRetry={() => void overview.refetch()}
          retrying={overview.isFetching}
        />
      </Card>
    );
  }
  // The server caches for 15 s, so its own timestamp is the honest "updated".
  const generated = overview.data.generatedAt ? Date.parse(overview.data.generatedAt) : NaN;
  const updatedAt = Number.isFinite(generated) ? generated : overview.dataUpdatedAt;
  return <OverviewBody data={overview.data} updatedAt={updatedAt} />;
}
