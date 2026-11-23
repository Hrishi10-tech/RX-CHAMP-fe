"use client";

import { useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useCancelLeave, useMyLeave } from "@/features/leave/hooks/useLeave";
import type { LeaveRequestView } from "@/features/leave/types";

import { ApplyLeaveDialog } from "./ApplyLeaveDialog";
import { BalanceCard, LedgerList } from "./LeaveBits";
import { RequestRow } from "./RequestRow";

/**
 * The person's own leave (3.4): both balances, what is coming up, every request
 * this year with where it stands, and the ledger behind the numbers. The same
 * view for every role; the mobile app shows the same numbers.
 */
export function MyLeavePanel({ compact = false }: { compact?: boolean }) {
  const me = useMyLeave();
  const cancel = useCancelLeave();
  const [applying, setApplying] = useState(false);
  const [cancelling, setCancelling] = useState<LeaveRequestView | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  if (me.isLoading) return <LoadingState label="Loading your leave…" />;
  if (me.isError || !me.data) {
    return (
      <ErrorState
        message={errorMessage(me.error)}
        onRetry={() => void me.refetch()}
        retrying={me.isFetching}
      />
    );
  }
  const d = me.data;
  const upcomingIds = new Set(d.upcoming.map((u) => u.id));
  const past = d.requests.filter((r) => !upcomingIds.has(r.id));

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      const saved = await cancel.mutateAsync(cancelling.id);
      toast.success(`Cancelled: ${saved.span}`, {
        description: `${saved.daysLabel} back in your ${saved.categoryLabel}.`,
      });
      setCancelling(null);
    } catch (err) {
      toast.error("Couldn't cancel it", { description: errorMessage(err) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Leave balance</h2>
          <p className="text-sm text-slate-500">
            {d.policy.enabled
              ? d.waitingFor
                ? `Your requests go to ${d.waitingFor}.`
                : "Your leave needs nobody's approval."
              : "Leave requests are switched off for now."}
          </p>
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setApplying(true)}
          disabled={!d.policy.enabled}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Apply for leave
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {d.balances.map((b) => (
          <BalanceCard key={b.category} b={b} compact={compact} />
        ))}
      </div>
      {d.nextYear && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{d.nextYear.year}:</span>{" "}
          {d.nextYear.balances
            .map(
              (b) =>
                `${b.label} ${b.spendableDays} ${b.spendableDays === 1 ? "day" : "days"} to plan with`,
            )
            .join(", ")}
          . What you carry over from {d.year} is added on 1 January.
        </p>
      )}

      <section className={cardBase} aria-labelledby="leave-upcoming">
        <h3
          id="leave-upcoming"
          className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900 sm:px-5"
        >
          Coming up
        </h3>
        {d.upcoming.length ? (
          <ul className="divide-y divide-slate-100">
            {d.upcoming.map((r) => (
              <RequestRow key={r.id} r={r} onCancel={setCancelling} busy={cancel.isPending} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">No leave coming up.</p>
        )}
      </section>

      {!compact && (
        <section className={cardBase} aria-labelledby="leave-history">
          <h3
            id="leave-history"
            className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900 sm:px-5"
          >
            This year
          </h3>
          {past.length ? (
            <ul className="divide-y divide-slate-100">
              {past.map((r) => (
                <RequestRow key={r.id} r={r} onCancel={setCancelling} busy={cancel.isPending} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing else this year.</p>
          )}
        </section>
      )}

      {!compact && (
        <section className={cardBase}>
          <button
            type="button"
            onClick={() => setShowLedger((v) => !v)}
            aria-expanded={showLedger}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-slate-900 sm:px-5"
          >
            How the balance adds up
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${showLedger ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {showLedger && (
            <div className="border-t border-slate-100">
              <LedgerList lines={d.ledger} />
            </div>
          )}
        </section>
      )}

      <ApplyLeaveDialog open={applying} onClose={() => setApplying(false)} />
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() => void confirmCancel()}
        title="Cancel this leave?"
        description={
          cancelling
            ? `${cancelling.categoryLabel}, ${cancelling.span}. The days go back to your balance${
                cancelling.status === "APPROVED" ? " and your approver is told" : ""
              }.`
            : undefined
        }
        confirmLabel={cancel.isPending ? "Cancelling…" : "Cancel leave"}
        cancelLabel="Keep it"
        destructive
        loading={cancel.isPending}
      />
    </div>
  );
}
