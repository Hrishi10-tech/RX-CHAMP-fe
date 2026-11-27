"use client";

import { Check, Home, Smartphone, Undo2, X } from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { Chip } from "@/components/ui/Chip";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { LeaveStatusChip } from "@/features/leave/components/LeaveBits";
import { amountText } from "@/features/leave/lib/format";
import type { WfhDecisionMode } from "@/features/wfh/api/wfh";
import { partTimesText } from "@/features/wfh/lib/format";
import type { WfhRequestView } from "@/features/wfh/types";
import { WaitingFor } from "@/features/leave/components/WaitingFor";
import { Button } from "@/components/ui/Button";

/** "Remote" in the brand colour, wherever a day or a request is work from home (4.1: Remote). */
export function WfhChip({ label = "Remote", title }: { label?: string; title?: string }) {
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
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-primary">
              <PersonAvatar name={r.userName} avatarId={r.avatarId} userId={r.userId} size={22} />
              <span className="truncate">{r.userName}</span>
              <OrgChip name={r.companyName} show={showOrg} />
              {r.department && (
                <span className="text-xs font-normal text-quiet">{r.department}</span>
              )}
            </p>
          )}
          <p className={`flex flex-wrap items-center gap-1.5 ${approver ? "mt-1" : ""}`}>
            <LeaveStatusChip status={r.status} />
            {r.attendanceSource === "BIOMETRIC" && <PhoneChip />}
          </p>
          <p className="mt-1.5 text-[0.9375rem] font-semibold text-primary">{r.span}</p>
          <p className="text-sm text-soft">
            {amountText(r)}
            {r.partTimes ? ` (${partTimesText(r.partTimes)})` : ""}
          </p>
          <p className="mt-1 text-sm text-quiet">&ldquo;{r.reason}&rdquo;</p>
          {r.status === "PENDING" && r.waitingFor && <WaitingFor name={r.waitingFor} />}
          {decided && (
            <p className="mt-1 text-xs text-quiet">
              {decided}
              {r.decisionNote ? `: ${r.decisionNote}` : ""}
            </p>
          )}
          {r.status === "CANCELLED" && r.decisionNote && (
            <p className="mt-1 text-xs text-quiet">{r.decisionNote}</p>
          )}
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold tabular-nums text-primary">{r.days}</span>
          <span className="block text-[0.6875rem] text-quiet">
            {r.days === 1 || r.days < 1 ? "day" : "days"}
          </span>
        </span>
      </div>
      {(r.can.cancel || r.can.decide || r.can.revoke) && (onCancel || onDecide) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {r.can.decide && onDecide && (
            <>
              <Button
                variant="small"
                type="button"
                className="border-working-edge text-working hover:bg-working-wash"
                onClick={() => onDecide(r, "approve")}
                disabled={busy}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Approve
              </Button>
              <Button
                variant="small"
                type="button"
                className="border-attention-edge text-attention hover:bg-attention-wash"
                onClick={() => onDecide(r, "reject")}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Reject
              </Button>
            </>
          )}
          {r.can.revoke && onDecide && (
            <Button
              variant="small"
              type="button"
              onClick={() => onDecide(r, "revoke")}
              disabled={busy}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Revoke
            </Button>
          )}
          {r.can.cancel && onCancel && (
            <Button variant="small" type="button" onClick={() => onCancel(r)} disabled={busy}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Cancel request
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
