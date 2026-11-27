"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { formatDuration } from "@/lib/format/duration";
import { formatTime12, formatTimeRange12 } from "@/lib/time/format";
import {
  APPROVAL_LABEL,
  APPROVAL_TONE,
  overrunLabel,
  recordLabel,
  tookLabel,
} from "@/features/breaks/lib/labels";
import type { BreakRecordView } from "@/features/breaks/types";
import type { MeetingRecordView } from "@/features/meetings/types";
import type { FocusAdjustmentView } from "@/features/adjustments/types";
import type { DayPunchView } from "@/features/reports/types";
import { PUNCH_SOURCE_LABEL } from "@/features/attendance/lib/format";

/** A card with a small heading, the building block of Today and a day in History. */
export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card as="section" aria-label={title} className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-quiet">{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

/** A progress bar, with an optional tick (the month's target so far). */
export function Meter({
  value,
  mark,
  label,
  tone = "brand",
}: {
  /** 0..1; more is drawn full. */
  value: number;
  mark?: number | null;
  label: string;
  tone?: "brand" | "working" | "attention";
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const fill =
    tone === "working" ? "bg-working" : tone === "attention" ? "bg-attention" : "bg-brand";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative h-2 w-full overflow-hidden rounded-full bg-fill"
    >
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      {mark != null && mark > 0 && mark < 1 && (
        <span
          aria-hidden
          className="absolute top-0 h-full w-0.5 bg-primary"
          style={{ left: `${Math.round(mark * 100)}%` }}
        />
      )}
    </div>
  );
}

function Row({ title, detail, chips }: { title: string; detail: string; chips?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">{title}</p>
        <p className="text-xs text-quiet">{detail}</p>
      </div>
      {chips && <div className="flex flex-wrap items-center gap-1.5">{chips}</div>}
    </li>
  );
}

/** Breaks taken (or running), with how long and whether a decision is waiting. */
export function BreaksList({ breaks }: { breaks: BreakRecordView[] }) {
  if (breaks.length === 0) return <p className="text-sm text-quiet">No breaks.</p>;
  return (
    <ul className="divide-y divide-card">
      {breaks.map((b) => {
        const over = overrunLabel(b);
        return (
          <Row
            key={b.id}
            title={recordLabel(b)}
            detail={`${formatTimeRange12(b.startedAt, b.endedAt)}${
              b.inProgress ? " · now" : ""
            } · ${tookLabel(b)}`}
            chips={
              <>
                {over && <Chip tone="warning">{over}</Chip>}
                {b.approvalStatus !== "NOT_REQUIRED" && (
                  <Chip tone={APPROVAL_TONE[b.approvalStatus]}>
                    {APPROVAL_LABEL[b.approvalStatus]}
                  </Chip>
                )}
              </>
            }
          />
        );
      })}
    </ul>
  );
}

/** Meetings of the day, with their length and any decision. */
export function MeetingsList({ meetings }: { meetings: MeetingRecordView[] }) {
  if (meetings.length === 0) return <p className="text-sm text-quiet">No meetings.</p>;
  return (
    <ul className="divide-y divide-card">
      {meetings.map((m) => (
        <Row
          key={m.id}
          title={m.kind === "STATUS" ? "In a meeting" : m.agenda || "Meeting"}
          detail={`${formatTimeRange12(m.startedAt, m.endedAt)}${
            m.inProgress ? " · now" : ""
          } · ${formatDuration(m.durationSec)}`}
          chips={
            m.kind !== "STATUS" && m.approvalStatus !== "NOT_REQUIRED" ? (
              <Chip tone={APPROVAL_TONE[m.approvalStatus]}>{APPROVAL_LABEL[m.approvalStatus]}</Chip>
            ) : undefined
          }
        />
      ))}
    </ul>
  );
}

/** A biometric person's punches (voided ones left out), oldest first. */
export function PunchesList({ punches }: { punches: DayPunchView[] }) {
  const shown = punches.filter((p) => !p.voided);
  if (shown.length === 0) return <p className="text-sm text-quiet">No punches yet.</p>;
  return (
    <ul className="divide-y divide-card">
      {shown.map((p, i) => (
        <Row
          key={`${p.at}-${i}`}
          title={formatTime12(p.at)}
          detail={`${p.direction === "IN" ? "In" : p.direction === "OUT" ? "Out" : "Punch"} · ${
            PUNCH_SOURCE_LABEL[p.source as keyof typeof PUNCH_SOURCE_LABEL] ?? p.source
          }`}
        />
      ))}
    </ul>
  );
}

/** Focus time changed by hand (the Super Manager), with why and by whom. */
export function AdjustmentsList({ adjustments }: { adjustments: FocusAdjustmentView[] }) {
  if (adjustments.length === 0) return null;
  return (
    <ul className="divide-y divide-card">
      {adjustments.map((a) => (
        <Row
          key={a.id}
          title={`${a.label} focus time`}
          detail={`${a.reason}${a.createdByName ? ` · ${a.createdByName}` : ""}`}
        />
      ))}
    </ul>
  );
}

/** An amber note, for what needs the person's attention. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-attention-edge bg-attention-wash px-3 py-2 text-sm text-attention-ink">
      {children}
    </p>
  );
}
