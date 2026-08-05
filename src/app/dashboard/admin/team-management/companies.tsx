export type Status = "Active" | "Invited" | "Inactive";

export interface ManagerAssignment {
  name: string;
  users: string[];
}

export interface Company {
  id: number;
  name: string;
  managers: ManagerAssignment[];
  status: Status;
  created: string;
}

const FIRST_NAMES = [
  "Aarav",
  "Priya",
  "Daniel",
  "Mei",
  "Omar",
  "Sofia",
  "Liam",
  "Hana",
  "Noah",
  "Isabella",
  "Ethan",
  "Yuki",
  "Carlos",
  "Amara",
  "Lucas",
  "Fatima",
  "James",
  "Olivia",
  "Mohammed",
  "Wei",
  "Ananya",
  "Diego",
  "Nina",
  "Tariq",
];
const LAST_NAMES = [
  "Sharma",
  "Menon",
  "Cruz",
  "Lin",
  "Haddad",
  "Rossi",
  "O'Brien",
  "Kim",
  "Williams",
  "Garcia",
  "Brown",
  "Tanaka",
  "Mendez",
  "Okafor",
  "Müller",
  "Khan",
  "Carter",
  "Novak",
  "Ali",
  "Chen",
];
const MANAGER_NAMES = [
  "Aarav Sharma",
  "Mei Lin",
  "Carlos Mendez",
  "Amara Okafor",
  "Lucas Müller",
  "Fatima Khan",
  "James Carter",
  "Olivia Novak",
  "Wei Chen",
  "Diego Ali",
];

function makeUsers(seed: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST_NAMES[(seed + i) % FIRST_NAMES.length];
    const last = LAST_NAMES[(seed * 3 + i * 7) % LAST_NAMES.length];
    return `${first} ${last}`;
  });
}

function makeManagers(count: number, seed: number): ManagerAssignment[] {
  return MANAGER_NAMES.slice(0, count).map((name, i) => ({
    name,
    users: makeUsers(seed + i * 5, ((i * 13 + seed) % 90) + 5),
  }));
}

export const COMPANIES: Company[] = [
  {
    id: 1,
    name: "RhythmRx",
    managers: makeManagers(10, 1),
    status: "Active",
    created: "Jan 05, 2025",
  },
  {
    id: 2,
    name: "Acme Corp",
    managers: makeManagers(4, 3),
    status: "Active",
    created: "Feb 18, 2025",
  },
  {
    id: 3,
    name: "Globex",
    managers: makeManagers(2, 6),
    status: "Active",
    created: "Mar 22, 2025",
  },
  {
    id: 4,
    name: "Initech",
    managers: [],
    status: "Inactive",
    created: "Apr 10, 2025",
  },
];

export function getCompany(id: number): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function totalUsers(c: Company) {
  return c.managers.reduce((sum, m) => sum + m.users.length, 0);
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  className = "h-9 w-9 text-xs",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(34_34_204)] to-[rgb(86_86_224)] font-semibold text-white shadow-sm ring-1 ring-[rgba(34,34,204,0.25)] ${className}`}
    >
      {initials(name)}
    </span>
  );
}

const STATUS_STYLES: Record<Status, { pill: string; dot: string }> = {
  Active: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Invited: {
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  Inactive: {
    pill: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Inactive;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border py-1 pl-2.5 pr-3 text-xs font-semibold shadow-sm ${s.pill}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
