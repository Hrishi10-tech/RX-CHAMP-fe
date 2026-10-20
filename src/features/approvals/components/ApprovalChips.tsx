"use client";

import { Clock, Lock, Target } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { useNow } from "@/lib/hooks/useNow";
import {
  STATUS_CHIP,
  categoryChip,
  dueChip,
  effectChip,
  formatTimer,
  liveSeconds,
} from "@/features/approvals/lib/labels";
import type { ApprovalItemView } from "@/features/approvals/types";

export function CategoryChip({
  category,
  inProgress = false,
  label: override,
}: {
  category: string;
  /** A live meeting still running reads "Live meeting"; an ended one "Meeting". */
  inProgress?: boolean;
  /** An away item's own reason label (a renamed or custom reason). */
  label?: string | null;
}) {
  const { label, tone } = categoryChip(category, inProgress);
  return <Chip tone={tone}>{override?.trim() || label}</Chip>;
}

export function StatusChip({ status }: { status: ApprovalItemView["status"] }) {
  const look = STATUS_CHIP[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Chip tone={look.tone} dot={status === "PENDING"}>
      {look.label}
    </Chip>
  );
}

/** "+15 min if approved", "−15 min if rejected", "No change to focus time". */
export function EffectChip({ item }: { item: Pick<ApprovalItemView, "effect" | "status"> }) {
  const { text, tone } = effectChip(item);
  return (
    <Chip tone={tone} icon={Target} title="What this decision does to focus time" wrap>
      {text}
    </Chip>
  );
}

/**
 * "Due in 31h", amber "Due in 5h", red "Overdue 6h", "Escalated". Counts down
 * from the server's `dueInSec` as it was when the item arrived (`fetchedAt`: the
 * item's `receivedAt`, untouched by optimistic updates of other rows),
 * re-rendering once a minute, so the browser's clock never moves a deadline.
 */
export function DueChip({
  item,
  fetchedAt,
}: {
  item: Pick<
    ApprovalItemView,
    "status" | "dueAt" | "dueInSec" | "dueSoon" | "overdue" | "escalated"
  >;
  fetchedAt: number;
}) {
  const now = useNow(60_000, item.status === "PENDING");
  const elapsed = fetchedAt ? Math.max(0, Math.floor((now - fetchedAt) / 1000)) : 0;
  const chip = dueChip(
    typeof item.dueInSec === "number" ? { ...item, dueInSec: item.dueInSec - elapsed } : item,
    now,
  );
  if (!chip) return null;
  return (
    <Chip tone={chip.tone} icon={Clock} title={chip.title}>
      {chip.text}
      <span className="sr-only">. {chip.title}</span>
    </Chip>
  );
}

/** A meeting still running: a live timer, ticking every second. */
export function LiveMeetingChip({
  durationSec,
  fetchedAt,
}: {
  durationSec: number;
  fetchedAt: number;
}) {
  const now = useNow(1_000);
  const seconds = liveSeconds(durationSec, fetchedAt, now);
  return (
    <Chip tone="brand" dot pulse>
      <span role="timer" aria-label={`Live meeting, running for ${Math.floor(seconds / 60)} min`}>
        Live · <span className="tabular-nums">{formatTimer(seconds)}</span>
      </span>
    </Chip>
  );
}

export function LockedChip() {
  return (
    <Chip tone="neutral" icon={Lock}>
      Locked for payroll
    </Chip>
  );
}
