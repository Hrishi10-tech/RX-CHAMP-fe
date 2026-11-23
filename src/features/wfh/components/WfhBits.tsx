"use client";

import { Check, Home, Smartphone, Undo2, X } from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { Chip } from "@/components/ui/Chip";
import { btnSmall } from "@/components/ui/classes";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { LeaveStatusChip } from "@/features/leave/components/LeaveBits";
import { amountText } from "@/features/leave/lib/format";
import type { WfhDecisionMode } from "@/features/wfh/api/wfh";
import { partTimesText } from "@/features/wfh/lib/format";
import type { WfhRequestView } from "@/features/wfh/types";

/** "From home" in the brand colour, wherever a day or a request is work from home. */
export function WfhChip({ label = "From home", title }: { label?: string; title?: string }) {
  return (
    <Chip tone="brand" icon={Home} title={title} wrap>
      {label}
    </Chip>
  );
}

/** Biometric staff work from home on the phone app. */
export function PhoneChip() {
  return (
    <Chip
      tone="neutral"
      icon={Smartphone}
      title="Tracked with the RX Vision phone app (biometric attendance)"
    >
      Phone
    </Chip>
  );
}

/**
 * One work-from-home request. The person sees what they asked for and where it
 * stands; an approver also sees who asked (with their organisation on "All
 * organisations", 4.0), and the buttons the API allows. Part-day hours on the
 * 12 hour clock.
 */
export function WfhRequestRow({
  r,
  approver = false,
  showOrg = false,
  busy = false,
  onCancel,
  onDecide,
}: {
  r: WfhRequestView;
  approver?: boolean;
  showOrg?: boolean;
  busy?: boolean;
  onCancel?: (r: WfhRequestView) => void;
  onDecide?: (r: WfhRequestView, mode: WfhDecisionMode) => void;
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
              <PersonAvatar name={r.userName} avatarId={r.avatarId} userId={r.userId} size={22} />
              <span className="truncate">{r.userName}</span>
              <OrgChip name={r.companyName} show={showOrg} />
              {r.department && (
                <span className="text-xs font-normal text-slate-400">{r.department}</span>
              )}
            </p>
          )}
          <p className={`flex flex-wrap items-center gap-1.5 ${approver ? "mt-1" : ""}`}>
            <LeaveStatusChip status={r.status} />
            {r.attendanceSource === "BIOMETRIC" && <PhoneChip />}
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-slate-900">{r.span}</p>
          <p className="text-sm text-slate-600">
            {amountText(r)}
            {r.partTimes ? ` (${partTimesText(r.partTimes)})` : ""}
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
