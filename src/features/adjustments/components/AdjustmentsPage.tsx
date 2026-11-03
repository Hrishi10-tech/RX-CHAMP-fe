"use client";

import { useMemo, useState } from "react";
import { Info, Plus, SlidersHorizontal } from "lucide-react";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, inputBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useSelectedOrg } from "@/lib/org/selection";
import { addMonths, formatMonth, monthOfDate } from "@/lib/time/months";
import { todayKey } from "@/lib/time/businessTime";
import { isOrgAdmin, seesEveryOrg } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { AdjustFocusDialog } from "@/features/adjustments/components/AdjustFocusDialog";
import { AdjustmentsList } from "@/features/adjustments/components/AdjustmentsList";
import { useAdjustments } from "@/features/adjustments/hooks/useAdjustments";
import { useAppSettings } from "@/features/settings/hooks/useSettings";

type Shown = "live" | "all";

/**
 * Focus adjustments (3.3 on 4.0): the trail of minutes added or taken off by
 * hand. The Super Manager makes them (GET /me `canAdjustFocus`); the Admin and
 * the Super Admin read the organisation's, a Manager their departments' Staff.
 * Follows the organisation in view, and that organisation's switch in Settings.
 */
export function AdjustmentsPage() {
  const { role, me } = useSession();
  const selectedOrg = useSelectedOrg();
  // Settings are per organisation: a Super Admin or the Super Manager needs one picked.
  const orgInView = !seesEveryOrg(role) || Boolean(selectedOrg);
  const settings = useAppSettings(orgInView);
  const today = todayKey();
  const thisMonth = monthOfDate(today);
  const [month, setMonth] = useState(thisMonth);
  const [shown, setShown] = useState<Shown>("all");
  const [open, setOpen] = useState(false);
  const canAdjust = me?.permissions?.canAdjustFocus === true;
  const enabled = settings.data?.focusAdjustmentsEnabled !== false;
  // Several organisations in view: name each person's.
  const showOrg = seesEveryOrg(role) && !selectedOrg;

  const params = useMemo(() => ({ month, includeVoided: true, limit: 200 }), [month]);
  const query = useAdjustments(params);
  const items = useMemo(() => {
    const list = query.data ?? [];
    return shown === "live" ? list.filter((a) => !a.voidedAt) : list;
  }, [query.data, shown]);
  const live = (query.data ?? []).filter((a) => !a.voidedAt);
  const liveMin = Math.round(live.reduce((s, a) => s + a.deltaSec, 0) / 60);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Focus adjustments"
        subtitle={
          <>
            Minutes added or taken off by hand, with the reason, who did it and when.
            {selectedOrg ? ` ${selectedOrg.name}.` : showOrg ? " Every organisation." : ""}
          </>
        }
        actions={
          canAdjust ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={btnPrimary}
              disabled={!enabled}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Adjust focus time
            </button>
          ) : undefined
        }
      />

      {!enabled && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Manual adjustments are switched off for this organisation.{" "}
            {isOrgAdmin(role)
              ? "Turn them on in Settings when the Super Manager needs them."
              : "The organisation's admin can turn them on in Settings."}{" "}
            The trail below stays readable.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm">
            <span className="sr-only">Month</span>
            <input
              type="month"
              value={month}
              max={thisMonth}
              min={addMonths(thisMonth, -3)}
              onChange={(e) => setMonth(e.target.value || thisMonth)}
              className={`${inputBase} !h-8 !border-0 !px-0 !shadow-none`}
            />
          </label>
          <SegmentedTabs
            label="Which adjustments"
            size="sm"
            value={shown}
            onChange={setShown}
            tabs={[
              { value: "all", label: "All, undone included" },
              { value: "live", label: "In force" },
            ]}
          />
        </div>
        <p className="text-sm text-slate-600">
          {formatMonth(month)}: {live.length} in force,{" "}
          <span className={`font-semibold ${liveMin < 0 ? "text-rose-700" : "text-emerald-700"}`}>
            {liveMin === 0 ? "0 min" : `${liveMin < 0 ? "−" : "+"}${Math.abs(liveMin)} min`}
          </span>{" "}
          net
        </p>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading adjustments…" />
      ) : query.isError ? (
        <ErrorState
          title="Couldn't load adjustments"
          message={errorMessage(query.error)}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <AdjustmentsList
          items={items}
          canVoid={canAdjust && enabled}
          showOrg={showOrg}
          emptyTitle={`No adjustments in ${formatMonth(month)}`}
          emptyMessage={
            canAdjust
              ? "Nothing changed by hand this month. Use the button above when a day's focus time is wrong."
              : "Nothing changed by hand this month."
          }
        />
      )}

      <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(34_34_204)]" aria-hidden />
        <p>
          An adjustment enters the day&apos;s focus time, paid time and every report at once, and
          the person is told with the reason. Up to 12 hours either way per adjustment, within the
          last 62 days, never in a locked month. A mistake is undone, not edited, so the trail is
          complete.
        </p>
      </div>

      {canAdjust && <AdjustFocusDialog open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}
