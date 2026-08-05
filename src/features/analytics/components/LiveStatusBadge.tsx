import type { LiveStatus } from "@/features/analytics/types";

const STYLES: Record<LiveStatus, { dot: string; text: string; bg: string; label: string }> = {
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
  BREAK: { dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50 ring-sky-200", label: "Break" },
  LUNCH: {
    dot: "bg-violet-500",
    text: "text-violet-700",
    bg: "bg-violet-50 ring-violet-200",
    label: "Lunch",
  },
  MEETING: {
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    bg: "bg-indigo-50 ring-indigo-200",
    label: "Meeting",
  },
};

export function LiveStatusBadge({
  status,
  live = false,
  className = "",
}: {
  status: LiveStatus;
  live?: boolean;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${s.dot}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}
