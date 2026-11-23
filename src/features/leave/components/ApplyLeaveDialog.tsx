"use client";

import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, CalendarCheck, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { labelBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { addDaysToKey, todayKey } from "@/lib/time/businessTime";
import { usePresetsFor } from "@/features/settings/hooks/usePresets";
import { useApplyLeave, useLeavePolicy, useLeavePreview } from "@/features/leave/hooks/useLeave";
import {
  daysText,
  draftProblems,
  KIND_OPTIONS,
  PART_OPTIONS,
  partTimesText,
  REASON_MAX,
} from "@/features/leave/lib/format";
import type { LeaveCategory, LeaveDraft, LeaveKind, LeavePart } from "@/features/leave/types";
import { FieldError, Hint, Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const EMPTY = (today: string): LeaveDraft => ({
  category: "CLSL",
  kind: "FULL_DAY",
  part: null,
  startDate: today,
  endDate: "",
  reason: "",
});

/**
 * Apply for leave (3.4), for oneself. Pool, kind, part and dates first; the
 * server works out, as they are picked, what it would charge (working days
 * only), what is left after, who decides it, and anything that stops it.
 */
export function ApplyLeaveDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = todayKey();
  const policy = useLeavePolicy(open);
  const presets = usePresetsFor("LEAVE_REASON", open);
  const apply = useApplyLeave();
  const [draft, setDraft] = useState<LeaveDraft>(EMPTY(today));
  const [touched, setTouched] = useState(false);
  const [serverProblem, setServerProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY(todayKey()));
    setTouched(false);
    setServerProblem(null);
    apply.reset();
    // Reset whenever it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The preview needs a reason to pass the shape check; the real one is checked here.
  const previewDraft = useMemo<LeaveDraft | null>(
    () =>
      open && draft.startDate
        ? { ...draft, reason: draft.reason.trim().length >= 3 ? draft.reason : "Preview" }
        : null,
    [open, draft],
  );
  const debounced = useDebouncedValue(previewDraft, 300);
  const preview = useLeavePreview(debounced);
  const pv = preview.data;
  const stale = JSON.stringify(debounced) !== JSON.stringify(previewDraft) || preview.isFetching;

  const p = policy.data;
  const minDate =
    draft.category === "ELPL"
      ? addDaysToKey(today, p?.elplNoticeDays ?? 5)
      : addDaysToKey(today, -(p?.clslBackdateDays ?? 7));
  const rule = p?.categories.find((c) => c.category === draft.category)?.rule;
  // 3.5: comp off is a third type when the policy offers it (a 3.4 server does not).
  const compOffOn =
    !!p?.categories.some((c) => c.category === "COMPOFF") && p?.compOffEnabled !== false;
  const own = draftProblems(draft);
  const ownBlocking = Object.keys(own).length > 0;
  const canSend = !ownBlocking && !!pv?.ok && !stale && !apply.isPending;

  function update<K extends keyof LeaveDraft>(key: K, value: LeaveDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === "kind") {
        const kind = value as LeaveKind;
        next.part = kind === "FULL_DAY" ? null : PART_OPTIONS[kind][0].value;
        if (kind !== "FULL_DAY") next.endDate = "";
      }
      if (key === "category") {
        const cat = value as LeaveCategory;
        const earliest =
          cat === "ELPL"
            ? addDaysToKey(today, p?.elplNoticeDays ?? 5)
            : addDaysToKey(today, -(p?.clslBackdateDays ?? 7));
        if (cat === "ELPL" && next.startDate < earliest) next.startDate = earliest;
        if (next.endDate && next.endDate < next.startDate) next.endDate = "";
      }
      if (key === "startDate" && next.endDate && next.endDate < (value as string))
        next.endDate = "";
      return next;
    });
    setServerProblem(null);
  }

  // A press while the preview is still catching up with what was just typed (it follows the
  // form by 300 ms) used to do nothing. It is kept, and sent the moment the preview answers.
  const [sendWhenReady, setSendWhenReady] = useState(false);
  useEffect(() => {
    if (!sendWhenReady || stale) return;
    setSendWhenReady(false);
    if (pv?.ok && !ownBlocking) void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendWhenReady, stale, pv?.ok]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (ownBlocking) return;
    if (stale || !pv) {
      setSendWhenReady(true);
      return;
    }
    if (!pv.ok) return;
    await send();
  }

  async function send() {
    try {
      const saved = await apply.mutateAsync(draft);
      toast.success(
        saved.status === "APPROVED"
          ? `Leave approved: ${saved.span}`
          : `Leave requested: ${saved.span}`,
        {
          description:
            saved.status === "APPROVED"
              ? `${saved.daysLabel} of ${saved.categoryLabel}.`
              : `${saved.daysLabel} of ${saved.categoryLabel}, waiting for ${saved.waitingFor ?? "approval"}.`,
        },
      );
      onClose();
    } catch (err) {
      setServerProblem(errorMessage(err) ?? "Couldn't apply for leave.");
    }
  }

  const problem = serverProblem ?? (pv && !pv.ok && !stale ? pv.problem?.message : null);
  const show = (k: keyof typeof own) => (touched ? own[k] : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply for leave"
      description="Full days, a half day or a quarter day. Holidays and days off inside a range are not counted."
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5 sm:px-6">
        <div>
          <span className={labelBase}>Leave</span>
          <div className="mt-1.5">
            <SegmentedTabs
              label="Which leave"
              value={draft.category}
              onChange={(v) => update("category", v)}
              tabs={[
                { value: "CLSL", label: "CL/SL" },
                { value: "ELPL", label: "EL/PL" },
                ...(compOffOn ? [{ value: "COMPOFF" as LeaveCategory, label: "Comp off" }] : []),
              ]}
            />
          </div>
          <Hint>
            {draft.category === "CLSL"
              ? "Casual or sick leave. "
              : draft.category === "ELPL"
                ? "Earned or privilege leave. "
                : "Compensatory off, charged against your comp off credits. "}
            {rule}
          </Hint>
        </div>

        <div>
          <span className={labelBase}>How much</span>
          <div className="mt-1.5">
            <SegmentedTabs
              label="How much"
              value={draft.kind}
              onChange={(v) => update("kind", v)}
              tabs={KIND_OPTIONS}
            />
          </div>
          {draft.kind !== "FULL_DAY" && (
            <div className="mt-2.5">
              <SegmentedTabs
                label={draft.kind === "HALF_DAY" ? "Which half" : "Which quarter"}
                size="sm"
                value={(draft.part ?? PART_OPTIONS[draft.kind][0].value) as LeavePart}
                onChange={(v) => update("part", v)}
                tabs={PART_OPTIONS[draft.kind]}
              />
              {show("part") && <FieldError>{show("part")}</FieldError>}
            </div>
          )}
        </div>

        <div className={`grid gap-4 ${draft.kind === "FULL_DAY" ? "grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <Label htmlFor="leave-start">{draft.kind === "FULL_DAY" ? "First day" : "Day"}</Label>
            <Input
              id="leave-start"
              type="date"
              value={draft.startDate}
              min={minDate}
              onChange={(e) => update("startDate", e.target.value)}
              invalid={!!show("startDate")}
              className="mt-1.5"
            />
          </div>
          {draft.kind === "FULL_DAY" && (
            <div>
              <Label htmlFor="leave-end">
                Last day <span className="font-normal text-quiet">(optional)</span>
              </Label>
              <Input
                id="leave-end"
                type="date"
                value={draft.endDate}
                min={draft.startDate || minDate}
                onChange={(e) => update("endDate", e.target.value)}
                invalid={!!show("endDate")}
                className="mt-1.5"
              />
            </div>
          )}
        </div>

        <PreviewBox pv={stale ? null : pv} loading={!pv || stale} problem={problem} />

        <div>
          <Label htmlFor="leave-reason">Reason</Label>
          {presets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick answers">
              {presets.map((p) => (
                <ChoiceChip on={draft.reason === p} key={p} onClick={() => update("reason", p)}>
                  {p}
                </ChoiceChip>
              ))}
            </div>
          )}
          <Textarea
            id="leave-reason"
            rows={2}
            value={draft.reason}
            maxLength={REASON_MAX}
            onChange={(e) => update("reason", e.target.value)}
            invalid={!!show("reason")}
            className="mt-2"
            placeholder="Your approver sees this."
          />
          {show("reason") && <FieldError>{show("reason")}</FieldError>}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={apply.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={(!canSend && touched && !stale) || sendWhenReady}
            aria-busy={sendWhenReady || apply.isPending || undefined}
          >
            {(apply.isPending || sendWhenReady) && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {pv?.approvedAtOnce ? "Take leave" : "Send request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PreviewBox({
  pv,
  loading,
  problem,
}: {
  pv: ReturnType<typeof useLeavePreview>["data"] | null | undefined;
  loading: boolean;
  problem: string | null | undefined;
}) {
  if (problem) {
    return (
      <div
        role="alert"
        className="flex gap-2.5 rounded-xl border border-attention-edge bg-attention-wash px-3.5 py-3 text-sm text-attention-ink"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{problem}</p>
      </div>
    );
  }
  if (loading || !pv) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-card bg-fill px-3.5 py-3 text-sm text-quiet">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking…
      </div>
    );
  }
  const skipped = pv.dates.filter((d) => !d.charged);
  return (
    <div
      className="rounded-xl border border-brand/20 bg-brand/4 px-3.5 py-3 text-sm"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 font-semibold text-primary">
        <CalendarCheck className="h-4 w-4 text-brand" aria-hidden />
        {pv.daysLabel} of {pv.balance?.label ?? "leave"}
        {pv.partTimes ? `, ${partTimesText(pv.partTimes)}` : ""}
      </p>
      {pv.dates.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Days">
          {pv.dates.map((d) => (
            <li
              key={d.date}
              title={d.why ?? undefined}
              className={`rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ${
                d.charged
                  ? "bg-card text-body ring-1 ring-edge"
                  : "bg-panel text-quiet line-through"
              }`}
            >
              {d.label}
            </li>
          ))}
        </ul>
      )}
      {skipped.length > 0 && (
        <p className="mt-1.5 text-xs text-quiet">
          Not counted: {skipped.map((d) => `${d.label} (${d.why ?? "day off"})`).join(", ")}
        </p>
      )}
      {pv.balance && (
        <p className="mt-2 flex items-center gap-1.5 text-body">
          <span className="tabular-nums">{daysText(pv.balance.beforeDays)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-quiet" aria-hidden />
          <span className="font-semibold tabular-nums">{daysText(pv.balance.afterDays)}</span>
          <span className="text-quiet">left after this</span>
        </p>
      )}
      <p className="mt-1 flex items-center gap-1.5 text-xs text-quiet">
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        {pv.approvedAtOnce
          ? "Nobody else approves your leave: it is approved at once."
          : `Goes to ${pv.waitingFor ?? "your approver"}.`}
      </p>
    </div>
  );
}
