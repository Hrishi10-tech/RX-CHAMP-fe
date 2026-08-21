import { Avatar, type Status } from "@/app/dashboard/admin/team-management/companies";
import type { Column } from "@/components/ui/types";
import type { User } from "@/features/users/types";
import type { TeamMember } from "@/types";

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
  { key: "joined", header: "Joined", align: "right" },
];
