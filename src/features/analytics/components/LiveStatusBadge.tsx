import type { LiveStatus } from "@/features/analytics/types";

const STYLES: Record<LiveStatus, { dot: string; text: string; bg: string; label: string }> = {
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
  // Agent design: breaks are amber, meetings violet, working green.
  BREAK: {
    dot: "bg-attention",
    text: "text-attention",
    bg: "bg-attention-wash ring-attention-edge",
    label: "Break",
  },
  LUNCH: {
    dot: "bg-attention",
    text: "text-attention",
    bg: "bg-attention-wash ring-attention-edge",
    label: "Lunch",
  },
  MEETING: {
    dot: "bg-meeting",
    text: "text-meeting",
    bg: "bg-meeting-wash ring-meeting-edge",
    label: "In a meeting",
  },
  NOT_STARTED: {
    dot: "bg-edge-strong",
    text: "text-soft",
    bg: "bg-card ring-edge",
    label: "Not started",
  },
};

/** A status this portal does not know yet still renders, as it came. */
function styleOf(status: string) {
  return (
    (STYLES as Record<string, (typeof STYLES)[LiveStatus]>)[status] ?? {
      ...STYLES.OFFLINE,
      label: status
        ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")
        : "Unknown",
    }
  );
}

export function LiveStatusBadge({
  status,
  live = false,
  className = "",
}: {
  status: LiveStatus;
  live?: boolean;
  className?: string;
}) {
  const s = styleOf(status);
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
