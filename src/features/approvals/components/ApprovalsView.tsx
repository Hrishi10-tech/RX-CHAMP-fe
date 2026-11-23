"use client";

import { IconButton } from "@/components/ui/IconButton";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCheck,
  ChevronDown,
  ClipboardCheck,
  Info,
  Loader2,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
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
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { todayKey } from "@/lib/time/businessTime";
import { addMonths, formatMonth } from "@/lib/time/months";
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
  monthFromParam,
  paramsForFilters,
  tabFromParam,
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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Field";

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

/** "Every month" and the last 13 months, newest first. */
function monthOptions(today: string): SelectOption[] {
  const current = today.slice(0, 7);
  const months = Array.from({ length: 13 }, (_, i) => addMonths(current, -i));
  return [
    { value: ANY, label: "Every month" },
    ...months.map((m) => ({ value: m, label: formatMonth(m) })),
  ];
}

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

function SummaryStrip({
  summary,
  heading,
}: {
  summary: ApprovalsSummary;
  /** What the counts cover ("Your queue", "Whole organisation, October 2026"). */
  heading: string;
}) {
  // 3.6 (W-07): a phone shows the three that need action; the rest from `sm`.
  const items: { label: string; value: number; tone?: string; wide?: boolean }[] = [
    { label: "Waiting", value: summary.pending },
    {
      label: "Due within 12h",
      value: summary.dueSoon,
      tone: summary.dueSoon ? "text-attention" : undefined,
    },
    {
      label: "Overdue",
      value: summary.overdue,
      tone: summary.overdue ? "text-attention" : undefined,
    },
    {
      label: "Escalated",
      value: summary.escalated,
      tone: summary.escalated ? "text-attention" : undefined,
      wide: true,
    },
    { label: "Approved today", value: summary.approvedToday, wide: true },
    { label: "Rejected today", value: summary.rejectedToday, wide: true },
  ];
  return (
    <section aria-label="Approval counts" className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-quiet">{heading}</p>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-card bg-edge shadow-sm xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className={`bg-card px-3 py-3 sm:px-4 ${item.wide ? "hidden sm:block" : ""}`}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-quiet">
              {item.label}
            </dt>
            <dd className={`mt-0.5 text-xl font-bold tabular-nums ${item.tone ?? "text-primary"}`}>
              {Number.isFinite(item.value) ? item.value : 0}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** 3.6 (W-07): one line until opened, so the first item to decide is near the top. */
function Banner({ slaHours, isSuperAdmin }: { slaHours: number; isSuperAdmin: boolean }) {
  return (
    <details
      role="note"
      className="group rounded-2xl border border-brand/18 bg-brand/4 px-4 py-2.5 text-sm leading-relaxed text-strong"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
        <Info className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">Decide every item within {slaHours} hours.</span>{" "}
          <span className="text-soft">How decisions change focus time</span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-quiet transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="mt-2 space-y-1 pl-[26px]">
        <p>
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
    </details>
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
 *
 * 3.3: the Super Manager sees every item of the organisation in view, and on
 * "All organisations" (she and the Super Admin) one combined list with an
 * organisation chip per row; she decides any of them without switching.
 */
export function ApprovalsView({
  isSuperAdmin,
  isSuperManager = false,
  mixed = false,
  myId,
  myName,
}: {
  isSuperAdmin: boolean;
  /** 3.3: everything in view, never a "mine"; reopens any decision. */
  isSuperManager?: boolean;
  /** 3.3: "All organisations" is in view: an organisation chip on every row. */
  mixed?: boolean;
  myId?: string;
  myName?: string;
}) {
  // A link can open the page on a tab, the whole organisation and one month: the
  // payroll lock links here with exactly the items that hold it (3.2, fix 4).
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<ApprovalsTab>(
    () =>
      tabFromParam(searchParams.get("tab")) ??
      (searchParams.get("overdue") === "true" ? "overdue" : "pending"),
  );
  const [decision, setDecision] = useState<DecisionFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("");
  const [userId, setUserId] = useState(() => searchParams.get("userId") ?? "");
  const [scope, setScope] = useState<ApprovalScope>(() =>
    searchParams.get("scope") === "all" ? "all" : "mine",
  );
  const [month, setMonth] = useState(() => monthFromParam(searchParams.get("month")));
  const [page, setPage] = useState(1);
  const today = todayKey();
  const months = useMemo(() => monthOptions(today), [today]);

  // The scope and month stay in the address, so the view can be shared or reloaded.
  useEffect(() => {
    const q = new URLSearchParams(searchParams.toString());
    const set = (k: string, v: string | null) => (v ? q.set(k, v) : q.delete(k));
    set("tab", tab === "pending" ? null : tab);
    set("scope", isSuperAdmin && scope === "all" ? "all" : null);
    set("month", month || null);
    const next = q.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, scope, month, isSuperAdmin]);
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
        month,
        page,
        limit: PAGE_SIZE,
      }),
    [tab, decision, category, userId, scope, month, page, isSuperAdmin],
  );

  // A new filter is a new list: back to its first page, nothing selected.
  useEffect(() => {
    setPage(1);
  }, [tab, decision, category, userId, scope, month]);
  useEffect(() => {
    setSelected(new Set());
  }, [params]);

  const me = useMemo(() => ({ id: myId, name: myName }), [myId, myName]);
  const list = useApprovalsList(params, isSuperAdmin);
  const summaryScope = isSuperAdmin && scope === "all" ? "all" : "mine";
  const summary = useApprovalsSummary(true, { scope: summaryScope, month });
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
  // The counts follow the scope and the month (3.2), so they always match the list.
  const showBadges = true;
  const filtered = Boolean(
    category || userId || month || (tab === "decisions" && decision !== "ALL"),
  );
  const countsHeading = [
    summaryScope === "all" ? "Whole organisation" : isSuperAdmin ? "Your queue" : "Your team",
    month ? formatMonth(month) : "every month",
  ].join(", ");

  const personOptions = useMemo<SelectOption[]>(
    () => [
      { value: ANY, label: "Everyone", icon: Users },
      ...(people.data ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        description:
          [p.department, mixed ? p.companyName : null].filter(Boolean).join(" · ") || undefined,
      })),
    ],
    [people.data, mixed],
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
    setMonth("");
  }

  const names = new Map(items.map((i) => [keyOf(i), `${i.user?.name ?? "Someone"}: ${i.title}`]));
  const empty = emptyCopy(tab, slaHours, filtered);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        subtitle="Breaks started early or late, back late or skipped, meetings, and time away with a reason. Clear the list every day."
      />

      <Banner slaHours={slaHours} isSuperAdmin={isSuperAdmin} />

      {/* The counts cover the same items as the list: the scope and month chosen. */}
      {summary.data && showBadges && (
        <SummaryStrip summary={summary.data} heading={countsHeading} />
      )}

      {/* Tabs on their own line: with the month and scope filters (3.2) a shared row cut them off. */}
      <div className="flex flex-col gap-3">
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
        <Button
          variant="ghost"
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="self-start sm:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {filtered ? "Filters on" : "Filter"}
        </Button>
        <div
          className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center`}
        >
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
          <FilterField label="Month">
            <Select
              aria-label="Month"
              value={month || ANY}
              onValueChange={(v) => setMonth(v === ANY ? "" : v)}
              options={months}
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
            <Button variant="ghost" type="button" onClick={clearFilters}>
              <X className="h-4 w-4" aria-hidden />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {bulkResult && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-attention-edge bg-attention-wash px-4 py-3 text-sm text-attention-ink"
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
          <IconButton
            label="Dismiss"
            onClick={() => setBulkResult(null)}
            className="text-attention hover:bg-attention-wash-strong hover:text-attention"
          >
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>
      )}

      <Card
        as="section"
        id="approvals-panel"
        role="tabpanel"
        aria-labelledby={`approvals-tab-${tab}`}
        className="overflow-hidden"
      >
        {decidable.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-card bg-fill/70 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-body">
              <Checkbox
                checked={allChosen}
                onChange={() => setSelected(allChosen ? new Set() : new Set(decidable.map(keyOf)))}
              />
              Select all on this page
            </label>
            <p className="min-w-0 flex-1 text-[0.8125rem] text-soft sm:px-2">
              {atStakeText(items)}
            </p>
            <Button
              variant="success"
              type="button"
              onClick={approveSelected}
              disabled={chosen.length === 0 || bulk.isPending}
            >
              {bulk.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="h-4 w-4" aria-hidden />
              )}
              {chosen.length ? `Approve selected (${chosen.length})` : "Approve selected"}
            </Button>
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
              <div className="border-b border-card px-4 py-2.5 sm:px-6">
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
                    <Button variant="ghost" type="button" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : tab !== "pending" ? null : (
                    <Link
                      href="/dashboard/overview"
                      className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
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
                    canReopen={mayReopen(item, {
                      id: myId,
                      name: myName,
                      isSuperAdmin: isSuperAdmin || isSuperManager,
                    })}
                    me={me}
                    showOrg={mixed}
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
      </Card>
    </div>
  );
}
