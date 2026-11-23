import type { ActivityStatus } from "@/features/activity/types";

const STYLES: Record<ActivityStatus, { dot: string; text: string; bg: string; label: string }> = {
  ACTIVE: {
    dot: "bg-working",
    text: "text-working",
    bg: "bg-working-wash ring-working-edge",
    label: "Active",
  },
  IDLE: {
    dot: "bg-attention",
    text: "text-attention",
    bg: "bg-attention-wash ring-attention-edge",
    label: "Idle",
  },
  OFFLINE: {
    dot: "bg-neutral",
    text: "text-quiet",
    bg: "bg-fill ring-edge",
    label: "Offline",
  },
  DAY_ENDED: {
    dot: "bg-brand",
    text: "text-brand",
    bg: "bg-brand-wash ring-brand-edge",
    label: "Day ended",
  },
};

export function ActivityStatusBadge({
  status,
  className = "",
}: {
  status: ActivityStatus;
  className?: string;
}) {
  // 3.1 can report NOT_STARTED (before Start Day); anything else unknown reads as it came.
  const raw: string = status;
  const s =
    (STYLES as Record<string, (typeof STYLES)[ActivityStatus]>)[raw] ??
    (raw === "NOT_STARTED"
      ? { ...STYLES.OFFLINE, text: "text-soft", label: "Not started" }
      : { ...STYLES.OFFLINE, label: raw || "Unknown" });
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
