"use client";

import { useMemo, useState } from "react";
import { Plane } from "lucide-react";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { addDaysToKey, todayKey } from "@/lib/time/businessTime";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { useLeaveRequests } from "@/features/leave/hooks/useLeave";
import type { DecisionMode } from "@/features/leave/api/leave";
import type { LeaveCategory, LeaveRequestView } from "@/features/leave/types";

import { DecideDialog } from "./DecideDialog";
import { CategoryChip, LeaveStatusChip } from "./LeaveBits";
import { RequestRow } from "./RequestRow";

type View = "needs" | "pending" | "decided" | "all";

const STATUS_OF: Record<View, string | undefined> = {
  needs: "PENDING",
  pending: "PENDING",
  decided: "APPROVED,REJECTED,REVOKED",
  all: undefined,
};

/**
 * Leave requests for approvers (3.4): what waits on the caller first, then
 * everything pending in their scope, decided requests, and who is away in the
 * next two weeks. Managers see their team; the Super Manager and Super Admins
 * everyone, or the organisation in view.
 */
export function RequestsPanel() {
  // 4.0: the API client sends the organisation in view; the combined view tags rows.
  const org = { companyId: undefined as string | undefined, mixed: useOrgsInView().mixed };
  const [view, setView] = useState<View>("needs");
  const [category, setCategory] = useState<LeaveCategory | "ALL">("ALL");
  const [deciding, setDeciding] = useState<{ r: LeaveRequestView; mode: DecisionMode } | null>(
    null,
  );
  const today = todayKey();
  const list = useLeaveRequests({
    status: STATUS_OF[view],
    needsMe: view === "needs",
    companyId: org.companyId,
    category: category === "ALL" ? undefined : category,
    limit: 300,
  });
  const away = useLeaveRequests({
    status: "APPROVED,PENDING",
    from: today,
    to: addDaysToKey(today, 13),
    companyId: org.companyId,
    limit: 300,
  });

  const summary = list.data?.summary;
  const items = list.data?.items ?? [];
  const awaySorted = useMemo(
    () => [...(away.data?.items ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [away.data],
  );

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className={cardBase} aria-labelledby="leave-requests">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 id="leave-requests" className="text-sm font-bold text-slate-900">
            Requests
          </h2>
          <SegmentedTabs
            label="Which requests"
            size="sm"
            value={view}
            onChange={setView}
            tabs={[
              {
                value: "needs",
                label: "Needs you",
                badge: summary?.needsMe ? summary.needsMe : undefined,
              },
              {
                value: "pending",
                label: "All waiting",
                badge: summary?.pending ? summary.pending : undefined,
              },
              { value: "decided", label: "Decided" },
              { value: "all", label: "All" },
            ]}
          />
          <SegmentedTabs
            label="Which leave"
            size="sm"
            value={category}
            onChange={setCategory}
            tabs={[
              { value: "ALL", label: "Every type" },
              { value: "CLSL", label: "CL/SL" },
              { value: "ELPL", label: "EL/PL" },
              { value: "COMPOFF", label: "Comp off" },
            ]}
          />
        </div>
        {list.isLoading ? (
          <LoadingState label="Loading requests…" />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : items.length ? (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => (
              <RequestRow
                key={r.id}
                r={r}
                approver
                showOrg={org.mixed}
                onDecide={(req, mode) => setDeciding({ r: req, mode })}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {view === "needs" ? "Nothing waits on you." : "No requests here."}
          </p>
        )}
      </section>

      <section className={`${cardBase} self-start`} aria-labelledby="leave-away">
        <h2
          id="leave-away"
          className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900"
        >
          <Plane className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
          Away in the next two weeks
        </h2>
        {away.isLoading ? (
          <LoadingState label="Loading…" />
        ) : awaySorted.length ? (
          <ul className="divide-y divide-slate-100">
            {awaySorted.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <span className="truncate">{r.userName}</span>
                  <OrgChip name={r.companyName} show={org.mixed} />
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {r.span}
                  {r.kind !== "FULL_DAY" ? `, ${r.kindLabel.toLowerCase()}` : ""}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <CategoryChip category={r.category} />
                  {r.status === "PENDING" && <LeaveStatusChip status="PENDING" />}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">Nobody is away.</p>
        )}
      </section>

      <DecideDialog
        request={deciding?.r ?? null}
        mode={deciding?.mode ?? "approve"}
        onClose={() => setDeciding(null)}
      />
    </div>
  );
}
