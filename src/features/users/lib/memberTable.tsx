import { Avatar } from "@/components/ui/Avatar";
import { STATUS_DOT, type Status } from "@/components/ui/StatusBadge";
import { roleLabel } from "@/constants/roles";
import type { Column } from "@/components/ui/types";
import { readGrants } from "@/features/auth/api/getMe";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { formatDay, dateKeyOf } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import type { User, UserDepartment } from "@/features/users/types";
import type { AgentStatus, MemberDepartment, TeamMember } from "@/types";

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
  return Number.isNaN(d.getTime()) ? "—" : `${formatDay(dateKeyOf(d))} ${d.getFullYear()}`;
}

function toDept(d: UserDepartment | null | undefined): MemberDepartment | null {
  if (!d || typeof d.id !== "string") return null;
  return { id: d.id, name: d.name ?? "", icon: d.icon || "briefcase" };
}

/**
 * The person's departments, whichever way the API sent them: a list for a
 * manager, an object or a bare id plus name for staff.
 */
export function departmentsOf(u: User): MemberDepartment[] {
  if (Array.isArray(u.departments) && u.departments.length) {
    return u.departments.map(toDept).filter((d): d is MemberDepartment => d !== null);
  }
  // 4.0 sends a staff member's department as `departmentRef: {id, name, icon}`
  // beside the text `department`; without it the icon fell back to a briefcase.
  const ref = toDept(u.departmentRef);
  if (ref) return [ref];
  if (u.department && typeof u.department === "object") {
    const d = toDept(u.department);
    return d ? [d] : [];
  }
  if (u.departmentId) {
    return [
      {
        id: u.departmentId,
        name: typeof u.department === "string" ? u.department : "",
        icon: "briefcase",
      },
    ];
  }
  return [];
}

export function mapUserToMember(u: User): TeamMember {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  const departments = departmentsOf(u);
  return {
    id: u.id,
    name: u.name || full || u.email || "—",
    firstName: u.firstName ?? (u.name ?? "").split(" ")[0] ?? "",
    lastName: u.lastName ?? (u.name ?? "").split(" ").slice(1).join(" "),
    email: u.email ?? "",
    role: (u.role ?? "USER").toUpperCase(),
    designation: u.designation ?? "",
    department: departments[0] ?? null,
    departments,
    status: toStatus(u.status),
    // Default on, matching the backend: an older API that omits the field must not
    // make the toggle read as off.
    screenshotsEnabled: u.screenshotsEnabled ?? true,
    idleEnabled: typeof u.idleEnabled === "boolean" ? u.idleEnabled : null,
    idleMinutes: typeof u.idleMinutes === "number" ? u.idleMinutes : null,
    grants: readGrants(u.grants, u as unknown as Record<string, unknown>),
    shiftId: u.shiftId ?? null,
    // Default OFFLINE, not LIVE: an older API that omits the field must not claim
    // someone is being tracked when we have no idea.
    agentStatus: u.agentStatus ?? "OFFLINE",
    agentLastSeenAt: u.agentLastSeenAt ?? null,
    joined: formatJoined(u.createdAt),
  };
}

export function RolePill({ role }: { role: string }) {
  const admin = role === "ADMIN" || role === "SUPER_ADMIN";
  const manager = role === "MANAGER";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        admin
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : manager
            ? "border-[rgba(34,34,204,0.25)] bg-[rgba(34,34,204,0.06)] text-[rgb(34_34_204)]"
            : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {roleLabel(role)}
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
    label: "Day ended",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    hint: "They ended their working day. Nothing more is recorded today.",
  },
  NOT_SIGNED_IN: {
    label: "Not signed in",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    hint: "Signed out, or the saved session expired. They need to sign in again.",
  },
  OFFLINE: {
    label: "Offline",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    hint: "Signed in but not reporting. The computer may be asleep or closed, or the app stopped.",
  },
  NOT_ACTIVATED: {
    label: "Not activated",
    className: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
    hint: "The agent has never been installed for this member",
  },
};

/** "13 Oct, 9:05 AM": when the agent last reported. */
function lastReported(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDay(dateKeyOf(d))}, ${formatTime12(d)}`;
}

/**
 * Whether this person's agent is set up and reporting. Deliberately separate from
 * the avatar's dot, which is only whether the account may sign in.
 */
export function AgentStatusPill({
  status,
  lastSeenAt,
}: {
  status: AgentStatus;
  lastSeenAt: string | null;
}) {
  // A value this portal does not know yet (3.1 may report NOT_STARTED) must not crash the table.
  const raw: string = status;
  const { label, className, dot, hint } =
    (AGENT_STATUS_STYLE as Record<string, (typeof AGENT_STATUS_STYLE)[AgentStatus]>)[raw] ??
    (raw === "NOT_STARTED"
      ? {
          ...AGENT_STATUS_STYLE.DAY_ENDED,
          label: "Not started",
          className: "border-slate-200 bg-white text-slate-600",
          dot: "bg-slate-300",
          hint: "Signed in, but has not pressed Start Day yet. Nothing is recorded before that.",
        }
      : { ...AGENT_STATUS_STYLE.OFFLINE, label: raw || "Unknown" });
  const seen =
    status === "NOT_ACTIVATED"
      ? null
      : lastSeenAt
        ? `Last reported ${lastReported(lastSeenAt)}`
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

/** Department icon and name; a manager's extra departments as "+2". */
export function MemberDepartments({ member }: { member: TeamMember }) {
  const first = member.departments[0];
  if (!first) {
    return (
      <span className="text-sm text-slate-400">
        {member.role === "USER" ? "No department" : "—"}
      </span>
    );
  }
  const more = member.departments.length - 1;
  return (
    <span
      className="inline-flex min-w-0 items-center gap-2"
      title={member.departments.map((d) => d.name).join(", ")}
    >
      <DepartmentIcon icon={first.icon} size="xs" />
      <span className="truncate text-sm font-medium text-slate-700">{first.name}</span>
      {more > 0 && (
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
          +{more}
        </span>
      )}
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
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{m.name}</p>
          <p className="truncate text-xs text-slate-400">{m.designation || m.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    render: (m) => <RolePill role={m.role} />,
  },
  {
    key: "department",
    header: "Department",
    render: (m) => <MemberDepartments member={m} />,
  },
  {
    key: "agentStatus",
    header: "Status",
    render: (m) => <AgentStatusPill status={m.agentStatus} lastSeenAt={m.agentLastSeenAt} />,
  },
  { key: "joined", header: "Joined", align: "right" },
];
