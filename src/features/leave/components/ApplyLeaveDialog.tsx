"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, CalendarCheck, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  btnPrimary,
  btnSecondary,
  errorText,
  hintBase,
  inputBase,
  inputInvalid,
  labelBase,
  textareaBase,
} from "@/components/ui/classes";
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (ownBlocking || !pv?.ok) return;
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
          <p className={hintBase}>
            {draft.category === "CLSL"
              ? "Casual or sick leave. "
              : draft.category === "ELPL"
                ? "Earned or privilege leave. "
                : "Compensatory off, charged against your comp off credits. "}
            {rule}
          </p>
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
              {show("part") && <p className={errorText}>{show("part")}</p>}
            </div>
          )}
        </div>

        <div className={`grid gap-4 ${draft.kind === "FULL_DAY" ? "grid-cols-2" : "grid-cols-1"}`}>
          <div>
            <label htmlFor="leave-start" className={labelBase}>
              {draft.kind === "FULL_DAY" ? "First day" : "Day"}
            </label>
            <input
              id="leave-start"
              type="date"
              value={draft.startDate}
              min={minDate}
              onChange={(e) => update("startDate", e.target.value)}
              className={`mt-1.5 ${inputBase} ${show("startDate") ? inputInvalid : ""}`}
            />
          </div>
          {draft.kind === "FULL_DAY" && (
            <div>
              <label htmlFor="leave-end" className={labelBase}>
                Last day <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="leave-end"
                type="date"
                value={draft.endDate}
                min={draft.startDate || minDate}
                onChange={(e) => update("endDate", e.target.value)}
                className={`mt-1.5 ${inputBase} ${show("endDate") ? inputInvalid : ""}`}
              />
            </div>
          )}
        </div>

        <PreviewBox pv={stale ? null : pv} loading={!pv || stale} problem={problem} />

        <div>
          <label htmlFor="leave-reason" className={labelBase}>
            Reason
          </label>
          {presets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick answers">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update("reason", p)}
                  className={`rounded-full border px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
                    draft.reason === p
                      ? "border-[rgba(34,34,204,0.4)] bg-[rgba(34,34,204,0.08)] font-semibold text-[rgb(34_34_204)]"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <textarea
            id="leave-reason"
            rows={2}
            value={draft.reason}
            maxLength={REASON_MAX}
            onChange={(e) => update("reason", e.target.value)}
            className={`mt-2 ${textareaBase} ${show("reason") ? inputInvalid : ""}`}
            placeholder="Your approver sees this."
          />
          {show("reason") && <p className={errorText}>{show("reason")}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={apply.isPending}
          >
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={!canSend && touched}>
            {apply.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pv?.approvedAtOnce ? "Take leave" : "Send request"}
          </button>
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
        className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{problem}</p>
      </div>
    );
  }
  if (loading || !pv) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking…
      </div>
    );
  }
  const skipped = pv.dates.filter((d) => !d.charged);
  return (
    <div
      className="rounded-xl border border-[rgba(34,34,204,0.2)] bg-[rgba(34,34,204,0.04)] px-3.5 py-3 text-sm"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 font-semibold text-slate-900">
        <CalendarCheck className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
        {pv.daysLabel} of {pv.balance?.label ?? "leave"}
        {pv.partTimes ? `, ${partTimesText(pv.partTimes)}` : ""}
      </p>
      {pv.dates.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Days">
          {pv.dates.map((d) => (
            <li
              key={d.date}
              title={d.why ?? undefined}
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                d.charged
                  ? "bg-white text-slate-700 ring-1 ring-slate-200"
                  : "bg-slate-100 text-slate-400 line-through"
              }`}
            >
              {d.label}
            </li>
          ))}
        </ul>
      )}
      {skipped.length > 0 && (
        <p className="mt-1.5 text-xs text-slate-500">
          Not counted: {skipped.map((d) => `${d.label} (${d.why ?? "day off"})`).join(", ")}
        </p>
      )}
      {pv.balance && (
        <p className="mt-2 flex items-center gap-1.5 text-slate-700">
          <span className="tabular-nums">{daysText(pv.balance.beforeDays)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          <span className="font-semibold tabular-nums">{daysText(pv.balance.afterDays)}</span>
          <span className="text-slate-500">left after this</span>
        </p>
      )}
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        {pv.approvedAtOnce
          ? "Nobody else approves your leave: it is approved at once."
          : `Goes to ${pv.waitingFor ?? "your approver"}.`}
      </p>
    </div>
  );
}
