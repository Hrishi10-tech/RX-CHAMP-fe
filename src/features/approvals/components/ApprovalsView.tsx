"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckCheck, ClipboardCheck, Info, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Pager } from "@/components/ui/Pager";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshFailedNotice,
} from "@/components/ui/StatePanel";
import { btnGhost, btnSuccess, cardBase, checkboxBase } from "@/components/ui/classes";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useReportPeople } from "@/features/reports/hooks/useReports";
import {
  useApprovalsList,
  useApprovalsSummary,
  useBulkApprove,
} from "@/features/approvals/hooks/useApprovals";
import { ApprovalCard, isBulkSelectable } from "@/features/approvals/components/ApprovalCard";
import { CATEGORY_FILTER_LABEL, atStakeText, mayReopen } from "@/features/approvals/lib/labels";
import {
  paramsForFilters,
  type ApprovalsTab,
  type CategoryFilter,
  type DecisionFilter,
} from "@/features/approvals/lib/query";
import { BULK_APPROVE_MAX } from "@/features/approvals/api/approvals";
import {
  APPROVAL_CATEGORIES,
  type ApprovalItemView,
  type ApprovalRef,
  type ApprovalScope,
  type ApprovalsSummary,
  type BulkApproveResult,
} from "@/features/approvals/types";

const PAGE_SIZE = 50;
const ANY = "__any__";

const keyOf = (r: ApprovalRef) => `${r.type}:${r.id}`;

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: ANY, label: "All types" },
  { value: "TYPE_BREAK", label: "All breaks" },
  { value: "TYPE_MEETING", label: "All meetings" },
  { value: "TYPE_AWAY", label: "All away time" },
  ...APPROVAL_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_FILTER_LABEL[c] })),
];

const DECISION_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "Approved or rejected" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

function emptyCopy(tab: ApprovalsTab, slaHours: number, filtered: boolean) {
  const more = filtered ? " Try clearing the filters." : "";
  switch (tab) {
    case "overdue":
      return {
        title: "Nothing overdue",
        message: `Every item is within ${slaHours} hours.${more}`,
      };
    case "decisions":
      return {
        title: "No decisions yet",
        message: `Approved and rejected items show here.${more}`,
      };
    default:
      return { title: "All caught up", message: `Nothing is waiting for a decision.${more}` };
  }
}

function SummaryStrip({ summary }: { summary: ApprovalsSummary }) {
  const items: { label: string; value: number; tone?: string }[] = [
    { label: "Waiting", value: summary.pending },
    {
      label: "Due within 12h",
      value: summary.dueSoon,
      tone: summary.dueSoon ? "text-amber-700" : undefined,
    },
    {
      label: "Overdue",
      value: summary.overdue,
      tone: summary.overdue ? "text-rose-600" : undefined,
    },
    {
      label: "Escalated",
      value: summary.escalated,
      tone: summary.escalated ? "text-rose-600" : undefined,
    },
    { label: "Approved today", value: summary.approvedToday },
    { label: "Rejected today", value: summary.rejectedToday },
  ];
  return (
    <dl
      aria-label="Approval counts"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item) => (
        <div key={item.label} className="bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className={`mt-0.5 text-xl font-bold tabular-nums ${item.tone ?? "text-slate-900"}`}>
            {Number.isFinite(item.value) ? item.value : 0}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Banner({ slaHours, isSuperAdmin }: { slaHours: number; isSuperAdmin: boolean }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-relaxed text-indigo-950"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
      <div className="space-y-1">
        <p>
          <span className="font-semibold">Decide every item within {slaHours} hours.</span>{" "}
          {isSuperAdmin
            ? "Overdue items go to the Admin and stop their manager ending the day."
            : "Overdue items go to the Admin and stop you ending your day."}
        </p>
        <p>
          <span className="font-semibold">Each decision changes focus time.</span> Meetings and
          skipped breaks count until you reject them. Minutes over a break stay out until you
          approve them. A late or early start changes nothing.
        </p>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 sm:w-56">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/**
 * Approvals for Managers (what was routed to them) and Super Admins (theirs, the
 * Super Admin pool and every escalated item, or every team): off-schedule
 * breaks, minutes asked back, skipped breaks and meetings.
 */
export function ApprovalsView({
  isSuperAdmin,
  myId,
  myName,
}: {
  isSuperAdmin: boolean;
  myId?: string;
  myName?: string;
}) {
  const [tab, setTab] = useState<ApprovalsTab>("pending");
  const [decision, setDecision] = useState<DecisionFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("");
  const [userId, setUserId] = useState("");
  const [scope, setScope] = useState<ApprovalScope>("mine");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkApproveResult | null>(null);

  const params = useMemo(
    () =>
      paramsForFilters({
        tab,
        decision,
        category,
        userId,
        scope: isSuperAdmin ? scope : "mine",
        page,
        limit: PAGE_SIZE,
      }),
    [tab, decision, category, userId, scope, page, isSuperAdmin],
  );

  // A new filter is a new list: back to its first page, nothing selected.
  useEffect(() => {
    setPage(1);
  }, [tab, decision, category, userId, scope]);
  useEffect(() => {
    setSelected(new Set());
  }, [params]);

  const me = useMemo(() => ({ id: myId, name: myName }), [myId, myName]);
  const list = useApprovalsList(params, isSuperAdmin);
  const summary = useApprovalsSummary(true);
  const people = useReportPeople();
  const bulk = useBulkApprove(me);
  // One bulk decision at a time: a fast double click must not send it twice.
  const bulkInFlight = useRef(false);

  const items: ApprovalItemView[] = list.data?.items ?? [];
  const total = list.data?.meta?.total ?? items.length;
  const lastPage = Math.max(1, list.data?.meta?.totalPages ?? 1);

  // A page that no longer exists (its rows were decided, or a filter shrank the
  // list) moves to the last one that does, instead of reading "All caught up".
  useEffect(() => {
    if (list.data && !list.isPlaceholderData && page > lastPage) setPage(lastPage);
  }, [list.data, list.isPlaceholderData, page, lastPage]);
  const slaHours = summary.data?.slaHours || 48;
  const decidable = items.filter(isBulkSelectable);
  const chosen = decidable.filter((i) => selected.has(keyOf(i)));
  const allChosen = decidable.length > 0 && chosen.length === decidable.length;
  const showBadges = !isSuperAdmin || scope === "mine";
  const filtered = Boolean(category || userId || (tab === "decisions" && decision !== "ALL"));

  const personOptions = useMemo<SelectOption[]>(
    () => [
      { value: ANY, label: "Everyone", icon: Users },
      ...(people.data ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        description: p.department ?? undefined,
      })),
    ],
    [people.data],
  );

  function toggle(item: ApprovalItemView) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = keyOf(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function approveSelected() {
    const refs = chosen.slice(0, BULK_APPROVE_MAX).map(({ type, id }) => ({ type, id }));
    if (refs.length === 0 || bulkInFlight.current) return;
    bulkInFlight.current = true;
    try {
      const result = await bulk.mutateAsync({ refs });
      setSelected(new Set());
      if (result.approved.length) {
        toast.success(
          `${result.approved.length} ${result.approved.length === 1 ? "item" : "items"} approved`,
        );
      }
      setBulkResult(result.skipped.length ? result : null);
    } catch (err) {
      toast.error("Couldn't approve the selected items", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      bulkInFlight.current = false;
    }
  }

  function clearFilters() {
    setCategory("");
    setUserId("");
    setDecision("ALL");
  }

  const names = new Map(items.map((i) => [keyOf(i), `${i.user?.name ?? "Someone"}: ${i.title}`]));
  const empty = emptyCopy(tab, slaHours, filtered);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        subtitle="Breaks started early or late, back late or skipped, meetings, and time away with a reason. Clear the list every day."
      />

      <Banner slaHours={slaHours} isSuperAdmin={isSuperAdmin} />

      {/* GET /approvals/summary counts the caller's own items ("mine"), so it is
          left out while a Super Admin looks at every team, like the tab badges. */}
      {summary.data && showBadges && <SummaryStrip summary={summary.data} />}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs
          label="Approvals"
          idPrefix="approvals"
          value={tab}
          onChange={setTab}
          tabs={[
            {
              value: "pending",
              label: "Pending",
              badge: showBadges && summary.data?.pending ? summary.data.pending : undefined,
            },
            {
              value: "overdue",
              label: "Overdue",
              badge: showBadges && summary.data?.overdue ? summary.data.overdue : undefined,
            },
            { value: "decisions", label: "All decisions" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterField label="Type">
            <Select
              aria-label="Type"
              value={category || ANY}
              onValueChange={(v) => setCategory(v === ANY ? "" : (v as CategoryFilter))}
              options={CATEGORY_OPTIONS}
              className="!mt-0 h-11 !py-0"
            />
          </FilterField>
          <FilterField label="Person">
            <Select
              aria-label="Person"
              value={userId || ANY}
              onValueChange={(v) => setUserId(v === ANY ? "" : v)}
              options={personOptions}
              searchable
              searchPlaceholder="Search people…"
              className="!mt-0 h-11 !py-0"
            />
          </FilterField>
          {tab === "decisions" && (
            <FilterField label="Decision">
              <Select
                aria-label="Decision"
                value={decision}
                onValueChange={(v) => setDecision(v as DecisionFilter)}
                options={DECISION_OPTIONS}
                className="!mt-0 h-11 !py-0"
              />
            </FilterField>
          )}
          {isSuperAdmin && (
            <SegmentedTabs
              label="Whose approvals"
              size="sm"
              value={scope}
              onChange={setScope}
              tabs={[
                { value: "mine", label: "Mine" },
                { value: "all", label: "Whole organisation" },
              ]}
            />
          )}
          {filtered && (
            <button type="button" onClick={clearFilters} className={btnGhost}>
              <X className="h-4 w-4" aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {bulkResult && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <div className="min-w-0">
            <p className="font-semibold">{bulkResult.skipped.length} not approved</p>
            <ul className="mt-1 space-y-0.5">
              {bulkResult.skipped.map((s) => (
                <li key={keyOf(s)} className="break-words">
                  <span className="font-semibold">{names.get(keyOf(s)) ?? "An item"}</span>:{" "}
                  {s.reason}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setBulkResult(null)}
            aria-label="Dismiss"
            className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <section
        id="approvals-panel"
        role="tabpanel"
        aria-labelledby={`approvals-tab-${tab}`}
        className={`${cardBase} overflow-hidden`}
      >
        {decidable.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className={checkboxBase}
                checked={allChosen}
                onChange={() => setSelected(allChosen ? new Set() : new Set(decidable.map(keyOf)))}
              />
              Select all on this page
            </label>
            <p className="min-w-0 flex-1 text-[13px] text-slate-600 sm:px-2">
              {atStakeText(items)}
            </p>
            <button
              type="button"
              onClick={approveSelected}
              disabled={chosen.length === 0 || bulk.isPending}
              className={btnSuccess}
            >
              {bulk.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="h-4 w-4" aria-hidden />
              )}
              {chosen.length ? `Approve selected (${chosen.length})` : "Approve selected"}
            </button>
          </div>
        )}

        {list.isLoading ? (
          <LoadingState label="Loading approvals…" />
        ) : list.isError && !list.data ? (
          <ErrorState
            title="Couldn't load approvals"
            message={errorMessage(list.error)}
            onRetry={() => list.refetch()}
            retrying={list.isFetching}
          />
        ) : (
          <>
            {/* A failed poll keeps the rows (and any note being typed) on screen. */}
            {list.isError && (
              <div className="border-b border-slate-200 px-4 py-2.5 sm:px-6">
                <RefreshFailedNotice
                  what="approvals"
                  updatedAt={list.dataUpdatedAt}
                  onRetry={() => list.refetch()}
                  retrying={list.isFetching}
                />
              </div>
            )}
            {items.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title={empty.title}
                message={empty.message}
                action={
                  filtered ? (
                    <button type="button" onClick={clearFilters} className={btnGhost}>
                      Clear filters
                    </button>
                  ) : tab !== "pending" ? null : (
                    <Link
                      href="/dashboard/overview"
                      className="text-sm font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                    >
                      Open the overview
                    </Link>
                  )
                }
              />
            ) : (
              <div
                className={
                  list.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"
                }
              >
                {items.map((item) => (
                  <ApprovalCard
                    key={keyOf(item)}
                    item={item}
                    fetchedAt={list.dataUpdatedAt}
                    selected={selected.has(keyOf(item))}
                    onToggle={() => toggle(item)}
                    gutter={decidable.length > 0}
                    canReopen={mayReopen(item, { id: myId, name: myName, isSuperAdmin })}
                    me={me}
                  />
                ))}
              </div>
            )}
            {/* Kept with an empty page too, so a page emptied by decisions can be left. */}
            <Pager
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              noun="item"
            />
          </>
        )}
      </section>
    </div>
  );
}
