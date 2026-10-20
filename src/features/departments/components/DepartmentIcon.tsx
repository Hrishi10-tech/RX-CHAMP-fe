import { departmentIcon } from "@/features/departments/lib/icons";

const SIZE = {
  xs: { box: "h-6 w-6 rounded-md", icon: "h-3.5 w-3.5" },
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-2xl", icon: "h-6 w-6" },
} as const;

/** A department's icon: outline, brand colour on a soft tint (SPEC 7.6). */
export function DepartmentIcon({
  icon,
  size = "sm",
  className = "",
  title,
}: {
  icon: string | null | undefined;
  size?: keyof typeof SIZE;
  className?: string;
  /** Spoken and shown on hover; omit when a visible name sits beside it. */
  title?: string;
}) {
  const Icon = departmentIcon(icon);
  const s = SIZE[size];
  return (
    <span
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-flex shrink-0 items-center justify-center bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)] ring-1 ring-inset ring-[rgba(34,34,204,0.12)] ${s.box} ${className}`}
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  );
}

/** Icon and name on one line, for tables and rows. */
export function DepartmentLabel({
  name,
  icon,
  empty = "No department",
}: {
  name: string | null | undefined;
  icon?: string | null;
  empty?: string;
}) {
  if (!name) return <span className="text-sm text-slate-400">{empty}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <DepartmentIcon icon={icon} size="xs" />
      <span className="truncate text-sm font-medium text-slate-700">{name}</span>
    </span>
  );
}
