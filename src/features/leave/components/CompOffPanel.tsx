"use client";

import { useState } from "react";
import { Award, Check, Gift, Hourglass, Undo2, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, btnSecondary, btnSmall, cardBase, hintBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/features/auth/hooks/useSession";
import { isApprover } from "@/constants/roles";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { OrgChip } from "@/features/organisations/components/OrgChip";
import type { CompOffDecisionMode } from "@/features/leave/api/compoff";
import {
  useCancelCompOffClaim,
  useCompOffClaims,
  useCompOffSummary,
  useMyCompOff,
  usePersonCompOff,
} from "@/features/leave/hooks/useLeave";
import { canCreditCompOff, defaultCompOffPart, whenText } from "@/features/leave/lib/compoff";
import { daysNumber, daysText, STATUS_LOOK } from "@/features/leave/lib/format";
import type { CompOffBalanceView, CompOffCreditView, ExtraDayView } from "@/features/leave/types";

import {
  ClaimCompOffDialog,
  CompOffDecideDialog,
  GrantCompOffDialog,
  useCompOffPeople,
} from "./CompOffDialogs";

/** The comp off balance in one card: what can be taken, what waits, what lapses next. */
export function CompOffBalanceCard({
  b,
  compact = false,
}: {
  b: CompOffBalanceView;
  compact?: boolean;
}) {
  return (
    <section className={`${cardBase} flex flex-col p-4 sm:p-5`} aria-label="Comp off balance">
      <div className="flex items-center justify-between gap-2">
        <Chip tone="success" icon={Award}>
          Comp off
        </Chip>
        {b.nextExpiry && (
          <span
            className="text-[11px] font-semibold text-amber-700"
            title="The next credit to lapse"
          >
            {daysText(b.nextExpiry.days)} by {b.nextExpiry.label}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-600">
        Compensatory off for extra days worked
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-slate-900">
          {daysNumber(b.availableDays)}
        </span>
        <span className="text-sm font-semibold text-slate-500">
          {b.availableDays !== 0 && b.availableDays <= 1 ? "day to take" : "days to take"}
        </span>
      </p>
      {!compact && (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-500">
          <dt>Earned</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-700">
            {daysText(b.earnedDays)}
          </dd>
          <dt>Taken</dt>
          <dd className="text-right font-semibold tabular-nums text-slate-700">
            {daysText(b.takenDays)}
          </dd>
          {b.pendingDays > 0 && (
            <>
              <dt>Leave waiting for approval</dt>
              <dd className="text-right font-semibold tabular-nums text-amber-700">
                {daysText(b.pendingDays)}
              </dd>
            </>
          )}
          {b.claimsWaitingDays > 0 && (
            <>
              <dt>Claims waiting</dt>
              <dd className="text-right font-semibold tabular-nums text-amber-700">
                {daysText(b.claimsWaitingDays)}
              </dd>
            </>
          )}
          {b.lapsedDays > 0 && (
            <>
              <dt>Lapsed</dt>
              <dd className="text-right font-semibold tabular-nums text-slate-500">
                {daysText(b.lapsedDays)}
              </dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}

/** An extra day worked. The person claims it; an approver only reads it. */
function ExtraDayRow({ d, onClaim }: { d: ExtraDayView; onClaim?: (d: ExtraDayView) => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {d.label} <span className="font-normal text-slate-500">· {d.dayLabel}</span>
        </p>
        <p className="text-xs text-slate-600">
          Worked {d.workedLabel}
          {d.earnsDays > 0 ? ` · earns ${daysText(d.earnsDays)}` : ""}
        </p>
        {d.why && <p className="mt-0.5 text-xs text-slate-500">{d.why}</p>}
      </div>
      {d.claimable && onClaim ? (
        <button type="button" className={btnSmall} onClick={() => onClaim(d)}>
          <Award className="h-3.5 w-3.5" aria-hidden />
          Claim
        </button>
      ) : d.claimed ? (
        <Chip tone={d.why === "Credited" ? "success" : "warning"}>
          {d.why === "Credited" ? "Credited" : "Claimed"}
        </Chip>
      ) : null}
    </li>
  );
}

/** "Approved by Asha Rao, 3 Nov, 4:05 PM" and the like, for a decided claim or credit. */
export function decisionLine(c: CompOffCreditView): string | null {
  const verb =
    c.status === "APPROVED"
      ? c.source === "GRANT"
        ? "Credited"
        : "Approved"
      : c.status === "REVOKED"
        ? "Taken back"
        : c.status === "REJECTED"
          ? "Not approved"
          : null;
  if (!verb) return null;
  const when = whenText(c.decidedAt);
  return `${verb} by ${c.decidedByName ?? "the approver"}${when ? `, ${when}` : ""}`;
}

/** One claim or credit, for the person and for approvers. */
export function CreditRow({
  c,
  approver = false,
  showOrg = false,
  busy = false,
  onCancel,
  onDecide,
  onPerson,
}: {
  c: CompOffCreditView;
  approver?: boolean;
  showOrg?: boolean;
  busy?: boolean;
  onCancel?: (c: CompOffCreditView) => void;
  onDecide?: (c: CompOffCreditView, mode: CompOffDecisionMode) => void;
  /** Open the person's comp off (approvers). */
  onPerson?: (c: CompOffCreditView) => void;
}) {
  const look = STATUS_LOOK[c.status];
  const label = c.source === "GRANT" && c.status === "APPROVED" ? "Credited" : look.label;
  const tone = c.source === "GRANT" && c.status === "APPROVED" ? "success" : look.tone;
  const decided = decisionLine(c);
  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {approver && (
            <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
              {onPerson ? (
                <button
                  type="button"
                  className="truncate rounded text-left hover:text-[rgb(34_34_204)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
                  onClick={() => onPerson(c)}
                  title={`Open ${c.userName}'s comp off`}
                >
                  {c.userName}
                </button>
              ) : (
                <span className="truncate">{c.userName}</span>
              )}
              <OrgChip name={c.companyName} show={showOrg} />
              {c.department && (
                <span className="text-xs font-normal text-slate-400">{c.department}</span>
              )}
            </p>
          )}
          <p className={`flex flex-wrap items-center gap-1.5 ${approver ? "mt-1" : ""}`}>
            <Chip tone={tone} dot={c.status === "PENDING"}>
              {label}
            </Chip>
            {c.source === "GRANT" && (
              <Chip tone="neutral" icon={Gift}>
                By hand
              </Chip>
            )}
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-slate-900">
            {c.workedLabel}{" "}
            <span className="text-sm font-normal text-slate-500">· {c.dayLabel}</span>
          </p>
          <p className="text-sm text-slate-600">
            {c.source === "GRANT" && c.workedSec === 0
              ? "Credited by hand, no tracked time that day"
              : `Worked ${c.workedTime}`}
            {c.status === "APPROVED" && c.askedDays !== c.days
              ? ` · asked for ${daysText(c.askedDays)}`
              : ""}
          </p>
          <p className="mt-1 text-sm text-slate-500">&ldquo;{c.reason}&rdquo;</p>
          {c.status === "PENDING" && (
            <p className="mt-1 text-xs text-amber-700">
              Claimed {whenText(c.createdAt)}
              {c.waitingFor ? `, waiting for ${c.waitingFor}` : ""}
            </p>
          )}
          {c.status === "APPROVED" && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              {decided && <span>{decided}</span>}
              {c.expiresLabel && (
                <span className={c.lapsedDays > 0 ? "text-slate-500" : "text-emerald-700"}>
                  {c.lapsedDays > 0 ? `Lapsed ${c.expiresLabel}` : `Take by ${c.expiresLabel}`}
                </span>
              )}
              {c.usedDays > 0 && <span>{daysText(c.usedDays)} taken</span>}
              {c.heldDays > 0 && <span>{daysText(c.heldDays)} held by leave waiting</span>}
              {c.lapsedDays > 0 && <span>{daysText(c.lapsedDays)} lapsed</span>}
              {c.leftDays > 0 && (
                <span className="font-semibold text-slate-700">{daysText(c.leftDays)} left</span>
              )}
            </p>
          )}
          {(c.status === "REJECTED" || c.status === "REVOKED") && (
            <p className="mt-1 text-xs text-slate-500">
              {decided}
              {c.decisionNote ? `: ${c.decisionNote}` : ""}
            </p>
          )}
          {c.status === "APPROVED" && c.decisionNote && (
            <p className="mt-1 text-xs text-slate-500">Note: {c.decisionNote}</p>
          )}
        </div>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-bold tabular-nums text-slate-900">{c.days}</span>
          <span className="block text-[11px] text-slate-400">
            {c.days === 1 || c.days < 1 ? "day" : "days"}
          </span>
        </span>
      </div>
      {(c.can.cancel || c.can.decide || c.can.revoke) && (onCancel || onDecide) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {c.can.decide && onDecide && (
            <>
              <button
                type="button"
                className={`${btnSmall} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
                onClick={() => onDecide(c, "approve")}
                disabled={busy}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Approve
              </button>
              <button
                type="button"
                className={`${btnSmall} border-rose-200 text-rose-600 hover:bg-rose-50`}
                onClick={() => onDecide(c, "reject")}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Reject
              </button>
            </>
          )}
          {c.can.revoke && onDecide && (
            <button
              type="button"
              className={btnSmall}
              onClick={() => onDecide(c, "revoke")}
              disabled={busy}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Take back
            </button>
          )}
          {c.can.cancel && onCancel && (
            <button type="button" className={btnSmall} onClick={() => onCancel(c)} disabled={busy}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Cancel claim
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** The caller's own comp off (3.5): balance, extra days to claim, every claim and credit. */
export function MyCompOffPanel({ compact = false }: { compact?: boolean }) {
  const me = useMyCompOff();
  const cancel = useCancelCompOffClaim();
  const [claiming, setClaiming] = useState<ExtraDayView | null>(null);
  const [cancelling, setCancelling] = useState<CompOffCreditView | null>(null);

  if (me.isLoading) return <LoadingState label="Loading your comp off…" />;
  if (me.isError || !me.data)
    return (
      <ErrorState
        message={errorMessage(me.error)}
        onRetry={() => void me.refetch()}
        retrying={me.isFetching}
      />
    );
  const d = me.data;

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling.id);
      toast.success(`Claim cancelled: ${cancelling.workedLabel}`);
      setCancelling(null);
    } catch (err) {
      toast.error("Couldn't cancel it", { description: errorMessage(err) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <CompOffBalanceCard b={d.balance} compact={compact} />
        <section className={`${cardBase} p-4 sm:p-5`} aria-label="How comp off works">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Hourglass className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            How it works
          </p>
          <p className="mt-1.5 text-sm text-slate-600">{d.rules.rule}</p>
          <p className="mt-1.5 text-xs text-slate-500">
            {d.enabled
              ? d.waitingFor
                ? `Claims go to ${d.waitingFor}. Take comp off with Apply for leave, type Comp off.`
                : "Your claims need nobody's approval. Take comp off with Apply for leave, type Comp off."
              : "Comp off is switched off for now; what you have stays readable."}
          </p>
        </section>
      </div>

      <section className={cardBase} aria-labelledby="compoff-extra">
        <h3
          id="compoff-extra"
          className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900 sm:px-5"
        >
          Extra days you worked
        </h3>
        {d.extraDays.length ? (
          <ul className="divide-y divide-slate-100">
            {d.extraDays.map((x) => (
              <ExtraDayRow key={x.date} d={x} onClaim={d.enabled ? setClaiming : undefined} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            No weekly day off, holiday{d.rules.countLeaveDays ? " or day of leave" : ""} worked in
            the last {Math.max(d.rules.claimWithinDays, 31)} days.
          </p>
        )}
      </section>

      {!compact && (
        <section className={cardBase} aria-labelledby="compoff-credits">
          <h3
            id="compoff-credits"
            className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900 sm:px-5"
          >
            Claims and credits
          </h3>
          {d.credits.length ? (
            <ul className="divide-y divide-slate-100">
              {d.credits.map((c) => (
                <CreditRow key={c.id} c={c} onCancel={setCancelling} busy={cancel.isPending} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nothing claimed yet.</p>
          )}
        </section>
      )}

      <ClaimCompOffDialog day={claiming} onClose={() => setClaiming(null)} />
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={() => void confirmCancel()}
        title="Cancel this claim?"
        description={
          cancelling
            ? `${cancelling.workedLabel}, ${cancelling.daysLabel}. You can claim the day again later.`
            : undefined
        }
        confirmLabel={cancel.isPending ? "Cancelling…" : "Cancel claim"}
        cancelLabel="Keep it"
        destructive
        loading={cancel.isPending}
      />
    </div>
  );
}

/**
 * One person's comp off for an approver (GET /leave/comp-off/people/:userId): the
 * balance, their extra days, every claim and credit with the decisions the caller
 * may take, and a credit by hand when the API says the caller may.
 */
export function PersonCompOff({
  userId,
  orgName,
  showOrg = false,
  onClose,
  onDecide,
  onGrant,
}: {
  userId: string;
  orgName?: string | null;
  showOrg?: boolean;
  onClose: () => void;
  onDecide: (c: CompOffCreditView, mode: CompOffDecisionMode) => void;
  onGrant: (person: { id: string; name: string }) => void;
}) {
  const q = usePersonCompOff(userId);
  const d = q.data;
  return (
    <section className={cardBase} aria-labelledby="compoff-person">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3
          id="compoff-person"
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-bold text-slate-900"
        >
          <span className="truncate">{d?.userName ?? "Comp off"}</span>
          <OrgChip name={orgName ?? d?.credits[0]?.companyName} show={showOrg} />
        </h3>
        <button
          type="button"
          className={btnSmall}
          onClick={onClose}
          aria-label="Close this person's comp off"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {q.isLoading ? (
        <LoadingState label="Loading their comp off…" />
      ) : q.isError || !d ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-3 p-3">
          <CompOffBalanceCard b={d.balance} />
          {d.canGrant && (
            <button
              type="button"
              className={`${btnSecondary} w-full`}
              onClick={() => onGrant({ id: d.userId, name: d.userName })}
            >
              <Gift className="h-4 w-4" aria-hidden />
              Credit comp off to {d.userName.split(" ")[0] || d.userName}
            </button>
          )}
          <div className="rounded-2xl border border-slate-200">
            <h4 className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900">
              Extra days worked
            </h4>
            {d.extraDays.length ? (
              <ul className="divide-y divide-slate-100">
                {d.extraDays.map((x) => (
                  <ExtraDayRow key={x.date} d={x} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-center text-sm text-slate-500">
                No day off worked lately.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200">
            <h4 className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900">
              Claims and credits
            </h4>
            {d.credits.length ? (
              <ul className="divide-y divide-slate-100">
                {d.credits.map((c) => (
                  <CreditRow key={c.id} c={c} onDecide={onDecide} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-center text-sm text-slate-500">Nothing claimed yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

type View = "needs" | "pending" | "decided" | "all";
const STATUS_OF: Record<View, string | undefined> = {
  needs: "PENDING",
  pending: "PENDING",
  decided: "APPROVED,REJECTED,REVOKED",
  all: undefined,
};

/**
 * Claims in the caller's scope (3.5 on 4.0), waiting on them first: Staff of a
 * Manager's departments, the organisation for its admin, and for the platform
 * roles the organisation in view, or every one with each row named. Beside them,
 * one person's comp off, and crediting by hand.
 */
export function CompOffClaimsPanel() {
  const { role } = useSession();
  // 4.0: the API client sends the organisation in view; the combined view tags rows.
  const { mixed } = useOrgsInView();
  const mayCredit = canCreditCompOff(role);
  const [view, setView] = useState<View>("needs");
  const [deciding, setDeciding] = useState<{
    c: CompOffCreditView;
    mode: CompOffDecisionMode;
  } | null>(null);
  const [granting, setGranting] = useState<{ id?: string; name?: string } | null>(null);
  const [person, setPerson] = useState<{ id: string; orgName?: string | null } | null>(null);
  const list = useCompOffClaims({
    status: STATUS_OF[view],
    needsMe: view === "needs",
    limit: 300,
  });
  const people = useCompOffPeople(true);
  const summary = list.data?.summary;
  const items = list.data?.items ?? [];
  const decide = (c: CompOffCreditView, mode: CompOffDecisionMode) => setDeciding({ c, mode });

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className={cardBase} aria-labelledby="compoff-claims">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="compoff-claims" className="text-sm font-bold text-slate-900">
                Claims
              </h2>
              <p className="text-xs text-slate-500">
                A claim waits on the department&apos;s managers, or on the organisation admin when
                the department has none.
              </p>
            </div>
            {mayCredit && (
              <button type="button" className={btnPrimary} onClick={() => setGranting({})}>
                <Gift className="h-4 w-4" aria-hidden />
                Credit comp off
              </button>
            )}
          </div>
          <SegmentedTabs
            label="Which claims"
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
          <LoadingState label="Loading claims…" />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : items.length ? (
          <ul className="divide-y divide-slate-100">
            {items.map((c) => (
              <CreditRow
                key={c.id}
                c={c}
                approver
                showOrg={mixed}
                onDecide={decide}
                onPerson={(x) => setPerson({ id: x.userId, orgName: x.companyName })}
              />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            {view === "needs" ? "Nothing waits on you." : "No claims here."}
          </p>
        )}
      </section>

      <div className="space-y-3 self-start">
        <section className={`${cardBase} p-4`} aria-labelledby="compoff-lookup">
          <h2
            id="compoff-lookup"
            className="flex items-center gap-2 text-sm font-bold text-slate-900"
          >
            <UserRound className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            <span>A person&apos;s comp off</span>
          </h2>
          <div className="mt-2">
            <Select
              id="compoff-person-pick"
              value={person?.id ?? ""}
              onValueChange={(v) => setPerson(v ? { id: v } : null)}
              options={people.options}
              placeholder={people.isLoading ? "Loading people…" : "Pick a person"}
              searchable
              searchPlaceholder="Search people…"
              aria-label="Whose comp off"
            />
          </div>
          <p className={hintBase}>Or pick a name on a claim.</p>
        </section>
        {person && (
          <PersonCompOff
            userId={person.id}
            orgName={person.orgName}
            showOrg={mixed}
            onClose={() => setPerson(null)}
            onDecide={decide}
            onGrant={(p) => setGranting(p)}
          />
        )}
      </div>

      <CompOffDecideDialog
        credit={deciding?.c ?? null}
        mode={deciding?.mode ?? "approve"}
        onClose={() => setDeciding(null)}
      />
      <GrantCompOffDialog
        open={!!granting}
        presetUserId={granting?.id}
        presetName={granting?.name}
        onClose={() => setGranting(null)}
      />
    </div>
  );
}

/**
 * The Comp off tab (3.5): the caller's own comp off, and for approvers the claims
 * in their scope. It opens on the claims when some wait on the caller.
 */
export function CompOffPanel() {
  const { role } = useSession();
  const approver = isApprover(role);
  const summary = useCompOffSummary(undefined, approver);
  const waiting = summary.data?.needsMe ?? 0;
  const [picked, setPicked] = useState<"mine" | "claims" | null>(null);
  if (!approver) return <MyCompOffPanel />;
  const part = picked ?? defaultCompOffPart(approver, waiting);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={part === "mine" ? btnPrimary : btnSecondary}
          onClick={() => setPicked("mine")}
          aria-pressed={part === "mine"}
        >
          My comp off
        </button>
        <button
          type="button"
          className={part === "claims" ? btnPrimary : btnSecondary}
          onClick={() => setPicked("claims")}
          aria-pressed={part === "claims"}
        >
          Claims
          {waiting > 0 && (
            <span
              className={`ml-1 rounded-full px-1.5 text-[11px] font-bold ${part === "claims" ? "bg-white/90 text-[rgb(34_34_204)]" : "bg-[rgb(34_34_204)] text-white"}`}
            >
              {waiting}
            </span>
          )}
        </button>
      </div>
      {part === "mine" ? <MyCompOffPanel /> : <CompOffClaimsPanel />}
    </div>
  );
}
