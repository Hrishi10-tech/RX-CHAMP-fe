import { Avatar, type Status } from "@/app/dashboard/admin/team-management/companies";
import type { Column } from "@/components/ui/types";
import type { User } from "@/features/users/types";
import type { AgentStatus, TeamMember } from "@/types";

export function toStatus(value?: string): Status {
  switch (value?.toUpperCase()) {
    case "INVITED":
      return "Invited";
    case "INACTIVE":
    case "DISABLED":
      return "Inactive";
    default:
      return "Active";
  }
}

export function formatJoined(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
}

export function mapUserToMember(u: User): TeamMember {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return {
    id: u.id,
    name: u.name || full || u.email || "—",
    email: u.email ?? "",
    role: u.role ?? "—",
    team: u.department ?? "—",
    company: u.company ?? "—",
    status: toStatus(u.status),
    // Default on, matching the backend: an older API that omits the field must not
    // make the toggle read as off.
    screenshotsEnabled: u.screenshotsEnabled ?? true,
    // Default OFFLINE, not LIVE: an older API that omits the field must not claim
    // someone is being tracked when we have no idea.
    agentStatus: u.agentStatus ?? "OFFLINE",
    agentLastSeenAt: u.agentLastSeenAt ?? null,
    joined: formatJoined(u.createdAt),
  };
}

export function RolePill({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[rgba(34,34,204,0.25)] bg-[rgba(34,34,204,0.06)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[rgb(34_34_204)]">
      {role}
    </span>
  );
}

const AGENT_STATUS_STYLE: Record<
  AgentStatus,
  { label: string; className: string; dot: string; hint: string }
> = {
  LIVE: {
    label: "Activated",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    hint: "Recording now",
  },
  DAY_ENDED: {
    label: "End day",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    hint: "They ended their working day — nothing more is recorded today",
  },
  NOT_SIGNED_IN: {
    label: "Not signed in",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    hint: "Signed out, or the saved session expired — they need to sign in again",
  },
  OFFLINE: {
    label: "Offline",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    hint: "Signed in but not reporting — the machine may be asleep, closed or the agent stopped",
  },
  NOT_ACTIVATED: {
    label: "Not activated",
    className: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
    hint: "The agent has never been installed for this member",
  },
};

/**
 * Whether this person's agent is set up and reporting. Deliberately separate from
 * the avatar's dot, which is only whether the account may sign in — someone can be
 * a perfectly active user with no agent installed, or blocked with one still running.
 *
 * "Offline" covers asleep, closed, broken and uninstalled alike. The server cannot
 * tell those apart, and to whoever is reading the table they mean the same thing:
 * nothing is being recorded. The tooltip gives the last report so a long silence is
 * distinguishable from a lunch break.
 */
export function AgentStatusPill({
  status,
  lastSeenAt,
}: {
  status: AgentStatus;
  lastSeenAt: string | null;
}) {
  const { label, className, dot, hint } = AGENT_STATUS_STYLE[status];
  // The last report turns "quiet" into something you can judge — a lunch break
  // reads very differently from five days.
  const seen =
    status === "NOT_ACTIVATED"
      ? null
      : lastSeenAt
        ? `Last reported ${new Date(lastSeenAt).toLocaleString()}`
        : "No activity has ever been reported";

  return (
    <span
      title={[hint, seen].filter(Boolean).join(" · ")}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

const STATUS_DOT: Record<Status, string> = {
  Active: "bg-emerald-500",
  Invited: "bg-amber-500",
  Inactive: "bg-slate-400",
};

export function MemberAvatar({ name, status }: { name: string; status: Status }) {
  return (
    <span className="relative shrink-0">
      <Avatar name={name} />
      <span
        title={status}
        aria-label={status}
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${STATUS_DOT[status]}`}
      />
    </span>
  );
}

export const memberColumns: Column<TeamMember>[] = [
  {
    key: "name",
    header: "Member",
    render: (m) => (
      <div className="flex items-center gap-3">
        <MemberAvatar name={m.name} status={m.status} />
        <div>
          <p className="font-medium text-slate-900">{m.name}</p>
          <p className="text-xs text-slate-400">{m.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (m) => <RolePill role={m.role} />,
  },
  { key: "team", header: "Team" },
  { key: "company", header: "Company" },
  {
    key: "agentStatus",
    header: "Status",
    render: (m) => <AgentStatusPill status={m.agentStatus} lastSeenAt={m.agentLastSeenAt} />,
  },
  { key: "joined", header: "Joined", align: "right" },
];
