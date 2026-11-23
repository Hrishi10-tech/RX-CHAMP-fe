"use client";

import { useMemo, useState } from "react";
import { Home } from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorMessage } from "@/lib/api";
import { addDaysToKey, todayKey } from "@/lib/time/businessTime";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import { LeaveStatusChip } from "@/features/leave/components/LeaveBits";
import type { WfhDecisionMode } from "@/features/wfh/api/wfh";
import { useWfhRequests } from "@/features/wfh/hooks/useWfh";
import type { WfhRequestView } from "@/features/wfh/types";

import { PhoneChip, WfhRequestRow } from "./WfhBits";
import { WfhDecideDialog } from "./WfhDecideDialog";
import { Card } from "@/components/ui/Card";

type View = "needs" | "pending" | "decided" | "all";

const STATUS_OF: Record<View, string | undefined> = {
  needs: "PENDING",
  pending: "PENDING",
  decided: "APPROVED,REJECTED,REVOKED",
  all: undefined,
};

/**
 * Work-from-home requests for approvers (3.5): what waits on the caller first,
 * then everything pending in their scope, decided requests, and who is at home
 * in the next two weeks. 4.0: a Manager sees the Staff of their departments; the
 * organisation admin everyone in the organisation; the Super Manager and Super
 * Admins the organisation in view, or every organisation with each row tagged.
 */
export function WfhRequestsPanel() {
  // 4.0: the API client sends the organisation in view; the combined view tags rows.
  const { mixed } = useOrgsInView();
  const [view, setView] = useState<View>("needs");
  const [deciding, setDeciding] = useState<{ r: WfhRequestView; mode: WfhDecisionMode } | null>(
    null,
  );
  const today = todayKey();
  const list = useWfhRequests({
    status: STATUS_OF[view],
    needsMe: view === "needs",
    limit: 300,
  });
  const home = useWfhRequests({
    status: "APPROVED,PENDING",
    from: today,
    to: addDaysToKey(today, 13),
    limit: 300,
  });

  const summary = list.data?.summary;
  const items = list.data?.items ?? [];
  const homeSorted = useMemo(
    () => [...(home.data?.items ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [home.data],
  );

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card as="section" aria-labelledby="wfh-requests">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:px-5">
          <h2 id="wfh-requests" className="text-sm font-bold text-primary">
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
        </div>
        {list.isLoading ? (
          <LoadingState label="Loading requests…" />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : items.length ? (
          <ul className="divide-y divide-divider">
            {items.map((r) => (
              <WfhRequestRow
                key={r.id}
                r={r}
                approver
                showOrg={mixed}
                onDecide={(req, mode) => setDeciding({ r: req, mode })}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-quiet">
            {view === "needs" ? "Nothing waits on you." : "No requests here."}
          </p>
        )}
      </Card>

      <Card as="section" className="self-start" aria-labelledby="wfh-home">
        <h2
          id="wfh-home"
          className="flex items-center gap-2 border-b border-divider px-4 py-3 text-sm font-bold text-primary"
        >
          <Home className="h-4 w-4 text-brand" aria-hidden />
          At home in the next two weeks
        </h2>
        {home.isLoading ? (
          <LoadingState label="Loading…" />
        ) : homeSorted.length ? (
          <ul className="divide-y divide-divider">
            {homeSorted.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-primary">
                  <PersonAvatar
                    name={r.userName}
                    avatarId={r.avatarId}
                    userId={r.userId}
                    size={22}
                  />
                  <span className="truncate">{r.userName}</span>
                  <OrgChip name={r.companyName} show={mixed} />
                </p>
                <p className="mt-0.5 text-sm text-soft">
                  {r.span}
                  {r.kind !== "FULL_DAY" ? `, ${r.kindLabel.toLowerCase()}` : ""}
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {r.status === "PENDING" && <LeaveStatusChip status="PENDING" />}
                  {r.attendanceSource === "BIOMETRIC" && <PhoneChip />}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-quiet">
            Nobody asked to work from home.
          </p>
        )}
        <p className="border-t border-divider px-4 py-2.5 text-xs text-quiet">
          Scheduled days are on the Schedules tab.
        </p>
      </Card>

      <WfhDecideDialog
        request={deciding?.r ?? null}
        mode={deciding?.mode ?? "approve"}
        onClose={() => setDeciding(null)}
      />
    </div>
  );
}
