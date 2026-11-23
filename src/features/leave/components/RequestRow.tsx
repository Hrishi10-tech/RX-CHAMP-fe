"use client";

import { Check, Undo2, X } from "lucide-react";

import { btnSmall } from "@/components/ui/classes";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { amountText } from "@/features/leave/lib/format";
import type { LeaveRequestView } from "@/features/leave/types";
import type { DecisionMode } from "@/features/leave/api/leave";

import { CategoryChip, LeaveStatusChip } from "./LeaveBits";

/**
 * One request. The person sees what they asked for and where it stands; an
 * approver also sees who asked, and the buttons the API says they may use.
 */
export function RequestRow({
  r,
  approver = false,
  showOrg = false,
  busy = false,
  onCancel,
  onDecide,
}: {
  r: LeaveRequestView;
  approver?: boolean;
  showOrg?: boolean;
  busy?: boolean;
  onCancel?: (r: LeaveRequestView) => void;
  onDecide?: (r: LeaveRequestView, mode: DecisionMode) => void;
}) {
  const decided =
    r.status === "APPROVED" || r.status === "REJECTED" || r.status === "REVOKED"
      ? `${r.status === "REVOKED" ? "Revoked" : r.status === "APPROVED" ? "Approved" : "Not approved"} by ${
          r.decidedByName ?? "the approver"
        }`
      : null;
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {approver && (
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
              <span className="truncate">{r.userName}</span>
              <OrgChip name={r.companyName} show={showOrg} />
              {r.department && (
                <span className="text-xs font-normal text-slate-400">{r.department}</span>
              )}
            </p>
          )}
          <p className={`flex flex-wrap items-center gap-1.5 ${approver ? "mt-1" : ""}`}>
            <CategoryChip category={r.category} />
            <LeaveStatusChip status={r.status} />
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-slate-900">{r.span}</p>
          <p className="text-sm text-slate-600">
            {amountText(r)}
            {r.partTimes ? ` (${r.partTimes})` : ""}
            {r.kind === "FULL_DAY" &&
            r.dates.length > 0 &&
            r.dates.length < daysBetween(r.startDate, r.endDate)
              ? ", days off not counted"
              : ""}
          </p>
          <p className="mt-1 text-sm text-slate-500">&ldquo;{r.reason}&rdquo;</p>
          {r.status === "PENDING" && r.waitingFor && (
            <p className="mt-1 text-xs text-amber-700">Waiting for {r.waitingFor}</p>
          )}
          {decided && (
            <p className="mt-1 text-xs text-slate-500">
              {decided}
              {r.decisionNote ? `: ${r.decisionNote}` : ""}
            </p>
          )}
          {r.status === "CANCELLED" && r.decisionNote && (
            <p className="mt-1 text-xs text-slate-500">{r.decisionNote}</p>
          )}
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold tabular-nums text-slate-900">{r.days}</span>
          <span className="block text-[11px] text-slate-400">
            {r.days === 1 || r.days < 1 ? "day" : "days"}
          </span>
        </span>
      </div>
      {(r.can.cancel || r.can.decide || r.can.revoke) && (onCancel || onDecide) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.can.decide && onDecide && (
            <>
              <button
                type="button"
                className={`${btnSmall} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
                onClick={() => onDecide(r, "approve")}
                disabled={busy}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Approve
              </button>
              <button
                type="button"
                className={`${btnSmall} border-rose-200 text-rose-600 hover:bg-rose-50`}
                onClick={() => onDecide(r, "reject")}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Reject
              </button>
            </>
          )}
          {r.can.revoke && onDecide && (
            <button
              type="button"
              className={btnSmall}
              onClick={() => onDecide(r, "revoke")}
              disabled={busy}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Revoke
            </button>
          )}
          {r.can.cancel && onCancel && (
            <button type="button" className={btnSmall} onClick={() => onCancel(r)} disabled={busy}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Cancel request
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function daysBetween(a: string, b: string): number {
  const ms = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86_400_000) + 1;
}
