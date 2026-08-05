import type { ActivityStatus } from "@/features/activity/types";

const STYLES: Record<ActivityStatus, { dot: string; text: string; bg: string; label: string }> = {
  ACTIVE: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 ring-emerald-200",
    label: "Active",
  },
  IDLE: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50 ring-amber-200",
    label: "Idle",
  },
  OFFLINE: {
    dot: "bg-slate-400",
    text: "text-slate-500",
    bg: "bg-slate-50 ring-slate-200",
    label: "Offline",
  },
};

export function ActivityStatusBadge({
  status,
  className = "",
}: {
  status: ActivityStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
