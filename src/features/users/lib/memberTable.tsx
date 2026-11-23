import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import type { Status } from "@/components/ui/StatusBadge";
import { roleLabel } from "@/constants/roles";
import type { Column } from "@/components/ui/types";
import { readGrants } from "@/features/auth/api/getMe";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { formatDay, dateKeyOf } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import type { User, UserDepartment } from "@/features/users/types";
import type { AgentStatus, MemberDepartment, TeamMember } from "@/types";

/** An empty value in the members table (W-35: words, not an em dash). */
export const NOT_SET = "Not set";

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

/** 3.6 (W-34): "17 Nov 2026", the order every other page uses, in the business zone. */
export function formatJoined(iso?: string): string {
  if (!iso) return NOT_SET;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_SET;
  const key = dateKeyOf(d);
  return `${formatDay(key)} ${key.slice(0, 4)}`;
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
    name: u.name || full || u.email || NOT_SET,
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
    companyId: u.companyId ?? null,
    companyName: u.companyName ?? u.company ?? null,
    avatarId: u.avatarId ?? null,
    // Left out of the answer for a viewer who may not set it: kept undefined, not null.
    ...(u.gender !== undefined ? { gender: u.gender } : {}),
  };
}

export function RolePill({ role }: { role: string }) {
  const admin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPER_MANAGER";
  const manager = role === "MANAGER";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${
        admin
          ? "border-meeting-edge bg-meeting-wash text-meeting"
          : manager
            ? "border-brand/25 bg-brand/6 text-brand"
            : "border-card bg-fill text-soft"
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
    className: "border-working-edge bg-working-wash text-working",
    dot: "bg-working",
    hint: "Recording now",
  },
  DAY_ENDED: {
    label: "Day ended",
    className: "border-brand-edge bg-brand-wash text-brand",
    dot: "bg-brand",
    hint: "They ended their working day. Nothing more is recorded today.",
  },
  NOT_SIGNED_IN: {
    label: "Not signed in",
    className: "border-attention-edge bg-attention-wash text-attention",
    dot: "bg-attention",
    hint: "Signed out, or the saved session expired. They need to sign in again.",
  },
  OFFLINE: {
    label: "Offline",
    className: "border-attention-edge bg-attention-wash text-attention",
    dot: "bg-attention",
    hint: "Signed in but not reporting. The computer may be asleep or closed, or the app stopped.",
  },
  NOT_ACTIVATED: {
    label: "Not activated",
    className: "border-card bg-fill text-quiet",
    dot: "bg-neutral",
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
          className: "border-card bg-card text-soft",
          dot: "bg-edge-strong",
          hint: "Signed in, but has not pressed Start Day yet. Nothing is recorded before that.",
        }
      : { ...AGENT_STATUS_STYLE.OFFLINE, label: raw || "Unknown" });
  // The last report turns "quiet" into something you can judge, a lunch break
  // reads very differently from five days.
  const seen =
    status === "NOT_ACTIVATED"
      ? null
      : lastSeenAt
        ? `Last reported ${lastReported(lastSeenAt)}`
        : "No activity has ever been reported";

  return (
    <span
      title={[hint, seen].filter(Boolean).join(" · ")}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// 3.6 (W-13): green means online everywhere else, so an account that may sign in gets no dot.
const STATUS_DOT: Record<Status, string | null> = {
  Active: null,
  Invited: "bg-attention",
  Inactive: "bg-neutral",
};

export function MemberAvatar({ member }: { member: TeamMember }) {
  const { name, status } = member;
  return (
    <span className="relative flex shrink-0">
      <PersonAvatar name={name} avatarId={member.avatarId} userId={String(member.id)} size={36} />
      {STATUS_DOT[status] && (
        <span
          title={status}
          aria-label={status}
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${STATUS_DOT[status]}`}
        />
      )}
    </span>
  );
}

/** Department icon and name; a manager's extra departments as "+2". */
export function MemberDepartments({ member }: { member: TeamMember }) {
  const first = member.departments[0];
  if (!first) {
    return (
      <span className="text-sm text-quiet">
        {member.role === "USER" ? "No department" : NOT_SET}
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
      <span className="truncate text-sm font-medium text-body">{first.name}</span>
      {more > 0 && (
        <span className="shrink-0 rounded-full bg-panel px-1.5 py-0.5 text-[0.625rem] font-bold text-quiet">
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
        <MemberAvatar member={m} />
        <div className="min-w-0">
          <p className="truncate font-medium text-primary">{m.name}</p>
          <p className="truncate text-xs text-quiet">{m.designation || m.email}</p>
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
  { key: "joined", header: "Joined", align: "right", className: "whitespace-nowrap" },
];

/** 3.3: the person's organisation, a column only on the combined view ("All organisations"). */
export const memberOrgColumn: Column<TeamMember> = {
  key: "organisation",
  header: "Organisation",
  render: (m) =>
    m.companyName ? (
      <OrgChip name={m.companyName} />
    ) : (
      <span className="text-sm text-quiet">{NOT_SET}</span>
    ),
};
