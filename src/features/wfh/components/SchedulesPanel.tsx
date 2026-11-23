"use client";

import { useState } from "react";
import { CalendarRange, CalendarX2, Pencil, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, btnSmall, cardBase, checkboxBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import {
  useEndWfhSchedule,
  useSkipWfhScheduleDay,
  useWfhSchedules,
} from "@/features/wfh/hooks/useWfh";
import type { WfhScheduleView } from "@/features/wfh/types";

import { ScheduleDialog } from "./ScheduleDialog";

const STATE_LOOK: Record<
  WfhScheduleView["state"],
  { label: string; tone: "success" | "info" | "neutral" }
> = {
  ACTIVE: { label: "In force", tone: "success" },
  UPCOMING: { label: "Starts later", tone: "info" },
  ENDED: { label: "Ended", tone: "neutral" },
};

function ScheduleRow({
  s,
  showOrg,
  onEdit,
  onEnd,
  onSkip,
  busy,
}: {
  s: WfhScheduleView;
  showOrg: boolean;
  onEdit: (s: WfhScheduleView) => void;
  onEnd: (s: WfhScheduleView) => void;
  onSkip: (s: WfhScheduleView, date: string, skip: boolean) => void;
  busy: boolean;
}) {
  const look = STATE_LOOK[s.state];
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
            <span className="truncate">{s.userName}</span>
            <OrgChip name={s.companyName} show={showOrg} />
            {s.department && (
              <span className="text-xs font-normal text-slate-400">{s.department}</span>
            )}
            <Chip tone={look.tone}>{look.label}</Chip>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold text-slate-900">
            <CalendarRange className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            {s.label}
          </p>
          <p className="text-sm text-slate-600">
            From {formatDayWithWeekday(s.fromDate)}
            {s.toDate ? ` to ${formatDayWithWeekday(s.toDate)}` : ", until it is ended"}
            {s.note ? ` · ${s.note}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Set by {s.createdByName}
            {s.skipDates.length
              ? ` · ${s.skipDates.length} ${s.skipDates.length === 1 ? "day" : "days"} left out`
              : ""}
          </p>
          {s.state !== "ENDED" && s.next.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-500">Next days at home</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {s.next.map((n) => (
                  <li
                    key={n.date}
                    className="flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {n.label}
                    {s.can.edit && (
                      <button
                        type="button"
                        title={`Leave ${n.label} out`}
                        aria-label={`Leave ${n.label} out of the schedule`}
                        onClick={() => onSkip(s, n.date, true)}
                        disabled={busy}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        <CalendarX2 className="h-3 w-3" aria-hidden />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.state !== "ENDED" && s.skipDates.length > 0 && s.can.edit && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-500">Days left out</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {s.skipDates.map((d) => (
                  <li
                    key={d}
                    className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 line-through ring-1 ring-slate-200"
                  >
                    {formatDayWithWeekday(d)}
                    <button
                      type="button"
                      title="Put it back"
                      aria-label={`Put ${formatDayWithWeekday(d)} back on the schedule`}
                      onClick={() => onSkip(s, d, false)}
                      disabled={busy}
                      className="rounded p-0.5 text-slate-400 no-underline hover:bg-slate-200 hover:text-slate-700"
                    >
                      <Undo2 className="h-3 w-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {s.can.edit && s.state !== "ENDED" && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className={btnSmall} onClick={() => onEdit(s)} disabled={busy}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Change
            </button>
            <button
              type="button"
              className={`${btnSmall} border-rose-200 text-rose-600 hover:bg-rose-50`}
              onClick={() => onEnd(s)}
              disabled={busy}
            >
              <CalendarX2 className="h-3.5 w-3.5" aria-hidden />
              End
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * Work-from-home schedules in scope (3.5 on 4.0): a Manager's departments' Staff,
 * the organisation admin's whole organisation, or for the Super Manager and Super
 * Admins the organisation in view (every organisation, each row tagged, on "All
 * organisations"). Set, change, end, and leave single days out; the API says per
 * row who may (`can.edit`).
 */
export function SchedulesPanel() {
  // 4.0: the API client sends the organisation in view; the combined view tags rows.
  const { mixed } = useOrgsInView();
  const [includeEnded, setIncludeEnded] = useState(false);
  const list = useWfhSchedules({ includeEnded });
  const end = useEndWfhSchedule();
  const skip = useSkipWfhScheduleDay();
  const [dialog, setDialog] = useState<{ open: boolean; editing: WfhScheduleView | null }>({
    open: false,
    editing: null,
  });
  const [ending, setEnding] = useState<WfhScheduleView | null>(null);

  async function confirmEnd() {
    if (!ending) return;
    try {
      const res = await end.mutateAsync(ending.id);
      toast.success(
        res.removed ? `Schedule removed: ${ending.userName}` : `Schedule ended: ${ending.userName}`,
        {
          description: `${ending.userName.split(" ")[0]} has been told.`,
        },
      );
      setEnding(null);
    } catch (err) {
      toast.error("Couldn't end the schedule", { description: errorMessage(err) });
    }
  }

  async function onSkip(s: WfhScheduleView, date: string, leaveOut: boolean) {
    try {
      await skip.mutateAsync({ id: s.id, date, skip: leaveOut });
      toast.success(
        leaveOut
          ? `${formatDayWithWeekday(date)} left out`
          : `${formatDayWithWeekday(date)} put back`,
      );
    } catch (err) {
      toast.error("Couldn't change the schedule", { description: errorMessage(err) });
    }
  }

  const items = list.data ?? [];
  const busy = end.isPending || skip.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Periodic work from home: every Wednesday, 1st and 3rd Fridays, and so on. Scheduled days
          count as approved; the person is told.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className={checkboxBase}
              checked={includeEnded}
              onChange={(e) => setIncludeEnded(e.target.checked)}
            />
            Show ended
          </label>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => setDialog({ open: true, editing: null })}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Set a schedule
          </button>
        </div>
      </div>
      <section className={cardBase} aria-label="Schedules">
        {list.isLoading ? (
          <LoadingState label="Loading schedules…" />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : items.length ? (
          <ul className="divide-y divide-slate-100">
            {items.map((s) => (
              <ScheduleRow
                key={s.id}
                s={s}
                showOrg={mixed}
                busy={busy}
                onEdit={(x) => setDialog({ open: true, editing: x })}
                onEnd={setEnding}
                onSkip={onSkip}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No schedules yet.</p>
        )}
      </section>
      <ScheduleDialog
        open={dialog.open}
        editing={dialog.editing}
        onClose={() => setDialog({ open: false, editing: null })}
      />
      <ConfirmDialog
        open={!!ending}
        onClose={() => setEnding(null)}
        onConfirm={() => void confirmEnd()}
        title="End this schedule?"
        description={
          ending
            ? `${ending.userName}, ${ending.label.toLowerCase()}: nothing after today. Days already worked from home stay as they were.`
            : undefined
        }
        confirmLabel={end.isPending ? "Ending…" : "End schedule"}
        destructive
        loading={end.isPending}
      />
    </div>
  );
}
