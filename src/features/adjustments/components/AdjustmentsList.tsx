"use client";

import { useState } from "react";
import Link from "next/link";
import { History, RotateCcw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/StatePanel";
import { btnSmall, cardBase, thBase } from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { dateKeyOf, formatDayWithWeekday, relativeDay, todayKey } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { useVoidAdjustment } from "@/features/adjustments/hooks/useAdjustments";
import type { FocusAdjustmentView } from "@/features/adjustments/types";

/** The person's organisation, when several are in view. */
function OrgChip({
  name,
  show,
  className,
}: {
  name: string | null;
  show: boolean;
  className?: string;
}) {
  if (!show || !name) return null;
  return (
    <Chip tone="neutral" className={className}>
      {name}
    </Chip>
  );
}

function when(iso: string): string {
  const key = dateKeyOf(new Date(iso));
  return `${relativeDay(key, todayKey())} ${formatTime12(iso)}`;
}

/** One adjustment's amount, struck through once undone. */
export function AmountChip({ a }: { a: FocusAdjustmentView }) {
  if (a.voidedAt) {
    return (
      <Chip tone="neutral" title={`Undone by ${a.voidedByName ?? "the Super Manager"}`}>
        <s>{a.label}</s>
      </Chip>
    );
  }
  return <Chip tone={a.deltaSec < 0 ? "dangerSolid" : "successSolid"}>{a.label}</Chip>;
}

/**
 * The trail of manual adjustments (3.3): who, which day, how much, why, by
 * whom, and whether it was undone. The Super Manager can undo a live one here;
 * everyone else reads.
 */
export function AdjustmentsList({
  items,
  canVoid,
  showOrg,
  showPerson = true,
  embedded = false,
  emptyTitle = "No adjustments",
  emptyMessage = "Nothing has been changed by hand.",
}: {
  items: FocusAdjustmentView[];
  canVoid: boolean;
  /** Several organisations in view: name each person's. */
  showOrg: boolean;
  /** False on a page that is already about one person. */
  showPerson?: boolean;
  /** Inside another card (a report section): no border of its own. */
  embedded?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const [toUndo, setToUndo] = useState<FocusAdjustmentView | null>(null);
  const undo = useVoidAdjustment();

  async function confirmUndo() {
    if (!toUndo) return;
    try {
      const done = await undo.mutateAsync(toUndo.id);
      toast.success(`Undone: ${done.label} for ${done.userName}`, {
        description: `${formatDayWithWeekday(done.date)} is back to what the app recorded. ${done.userName} has been told.`,
      });
      setToUndo(null);
    } catch (err) {
      const code = errorCode(err);
      toast.error("Couldn't undo it", {
        description:
          code === "ADJUSTMENTS_OFF"
            ? "Manual adjustments are switched off. The organisation's admin can turn them on in Settings."
            : code === "MONTH_LOCKED"
              ? "That month is locked for payroll."
              : errorMessage(err),
      });
      if (code === "ALREADY_VOID") setToUndo(null);
    }
  }

  const frame = embedded ? "" : cardBase;
  if (items.length === 0) {
    return (
      <div className={frame}>
        <EmptyState icon={SlidersHorizontal} title={emptyTitle} message={emptyMessage} />
      </div>
    );
  }

  const personCell = (a: FocusAdjustmentView) => (
    <Link
      href={`/dashboard/reports/person/${encodeURIComponent(a.userId)}?date=${a.date}`}
      className="font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
    >
      {a.userName}
    </Link>
  );

  return (
    <>
      {/* Phone: cards. */}
      <ul className={`${frame} divide-y divide-slate-100 overflow-hidden md:hidden`}>
        {items.map((a) => (
          <li key={a.id} className="space-y-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showPerson && <p className="truncate">{personCell(a)}</p>}
                <p className="text-sm font-semibold text-slate-900">
                  {formatDayWithWeekday(a.date)}
                </p>
                <OrgChip name={a.companyName} show={showOrg} className="mt-1" />
              </div>
              <AmountChip a={a} />
            </div>
            <p className="text-sm text-slate-700">{a.reason}</p>
            <p className="text-xs text-slate-500">
              By {a.createdByName}, {when(a.createdAt)}
              {a.voidedAt ? ` · undone ${when(a.voidedAt)}` : ""}
            </p>
            {canVoid && !a.voidedAt && (
              <button type="button" onClick={() => setToUndo(a)} className={btnSmall}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Undo
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Wider screens: a table. */}
      <div className={`${frame} hidden overflow-x-auto md:block`}>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {showPerson && <th className={thBase}>Person</th>}
              <th className={thBase}>Day</th>
              <th className={thBase}>Change</th>
              <th className={thBase}>Reason</th>
              <th className={thBase}>By</th>
              {canVoid && <th className={`${thBase} text-right`}>Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((a) => (
              <tr key={a.id} className={a.voidedAt ? "text-slate-500" : ""}>
                {showPerson && (
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      {personCell(a)}
                      <OrgChip name={a.companyName} show={showOrg} className="w-fit" />
                    </div>
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-slate-800">
                  {formatDayWithWeekday(a.date)}
                </td>
                <td className="px-4 py-3 align-top">
                  <AmountChip a={a} />
                </td>
                <td className="max-w-md px-4 py-3 align-top text-slate-700">{a.reason}</td>
                <td className="px-4 py-3 align-top text-xs text-slate-500">
                  <span className="block">{a.createdByName}</span>
                  <span className="block">{when(a.createdAt)}</span>
                  {a.voidedAt && (
                    <span className="mt-1 flex items-center gap-1 text-slate-400">
                      <History className="h-3 w-3" aria-hidden />
                      undone {when(a.voidedAt)}
                    </span>
                  )}
                </td>
                {canVoid && (
                  <td className="px-4 py-3 text-right align-top">
                    {!a.voidedAt && (
                      <button type="button" onClick={() => setToUndo(a)} className={btnSmall}>
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Undo
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={toUndo !== null}
        onClose={() => (undo.isPending ? undefined : setToUndo(null))}
        onConfirm={confirmUndo}
        title="Undo this adjustment?"
        description={
          toUndo
            ? `${toUndo.label} for ${toUndo.userName} on ${formatDayWithWeekday(toUndo.date)} comes off again. The day goes back to what the app recorded, and ${toUndo.userName} is told. The record stays on this list, marked undone.`
            : undefined
        }
        confirmLabel="Undo"
        icon={RotateCcw}
        destructive
        loading={undo.isPending}
      />
    </>
  );
}
