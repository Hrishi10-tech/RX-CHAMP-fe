"use client";

import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Home, Loader2, Smartphone, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { labelBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { addDaysToKey, todayKey } from "@/lib/time/businessTime";
import { usePresetsFor } from "@/features/settings/hooks/usePresets";
import { KIND_OPTIONS, PART_OPTIONS, REASON_MAX } from "@/features/leave/lib/format";
import type { LeaveKind, LeavePart } from "@/features/leave/types";
import { useAskWfh, useMyWfh, useWfhPreview } from "@/features/wfh/hooks/useWfh";
import { myRuleText, partTimesText, wfhDraftProblems } from "@/features/wfh/lib/format";
import type { WfhDraft, WfhPreview } from "@/features/wfh/types";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const EMPTY = (start: string): WfhDraft => ({
  kind: "FULL_DAY",
  part: null,
  startDate: start,
  endDate: "",
  reason: "",
});

/**
 * Ask for work from home (3.5 on 4.0), for oneself. Kind, part and dates first;
 * the server works out, as they are picked, which days it covers (working days of
 * the organisation calendar), who decides it, how the day will be tracked, and
 * anything that stops it. The notice and cap are the person's organisation's
 * policy, read with the rest of their work from home (GET /wfh/me).
 */
export function AskWfhDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = todayKey();
  const mine = useMyWfh(open);
  const policy = mine.data?.policy;
  const presets = usePresetsFor("WFH_REASON", open);
  const ask = useAskWfh();
  const earliest = addDaysToKey(today, policy?.noticeDays ?? 1);
  const [draft, setDraft] = useState<WfhDraft>(EMPTY(earliest));
  const [touched, setTouched] = useState(false);
  const [serverProblem, setServerProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(EMPTY(addDaysToKey(todayKey(), policy?.noticeDays ?? 1)));
    setTouched(false);
    setServerProblem(null);
    ask.reset();
    // Reset whenever it opens (and once the policy's notice is known).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy?.noticeDays]);

  const previewDraft = useMemo<WfhDraft | null>(
    () =>
      open && draft.startDate
        ? { ...draft, reason: draft.reason.trim().length >= 3 ? draft.reason : "Preview" }
        : null,
    [open, draft],
  );
  const debounced = useDebouncedValue(previewDraft, 300);
  const preview = useWfhPreview(debounced);
  const pv = preview.data;
  const stale = JSON.stringify(debounced) !== JSON.stringify(previewDraft) || preview.isFetching;

  const own = wfhDraftProblems(draft);
  const ownBlocking = Object.keys(own).length > 0;
  const canSend = !ownBlocking && !!pv?.ok && !stale && !ask.isPending;

  function update<K extends keyof WfhDraft>(key: K, value: WfhDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === "kind") {
        const kind = value as LeaveKind;
        next.part = kind === "FULL_DAY" ? null : PART_OPTIONS[kind][0].value;
        if (kind !== "FULL_DAY") next.endDate = "";
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
      const saved = await ask.mutateAsync(draft);
      toast.success(
        saved.status === "APPROVED"
          ? `Work from home approved: ${saved.span}`
          : `Asked: ${saved.span}`,
        {
          description:
            saved.status === "APPROVED"
              ? `${saved.daysLabel} from home.`
              : `${saved.daysLabel} from home, waiting for ${saved.waitingFor ?? "approval"}.`,
        },
      );
      onClose();
    } catch (err) {
      setServerProblem(errorMessage(err) ?? "Couldn't ask for work from home.");
    }
  }

  const problem = serverProblem ?? (pv && !pv.ok && !stale ? pv.problem?.message : null);
  const show = (k: keyof typeof own) => (touched ? own[k] : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ask for work from home"
      description={
        policy
          ? myRuleText(policy, mine.data?.waitingFor ?? null)
          : "A full day, a run of full days, a half day or a quarter day."
      }
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-5 px-5 py-5 sm:px-6">
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
            <Label htmlFor="wfh-start">{draft.kind === "FULL_DAY" ? "First day" : "Day"}</Label>
            <Input
              id="wfh-start"
              type="date"
              value={draft.startDate}
              min={earliest}
              onChange={(e) => update("startDate", e.target.value)}
              invalid={!!show("startDate")}
              className="mt-1.5"
            />
          </div>
          {draft.kind === "FULL_DAY" && (
            <div>
              <Label htmlFor="wfh-end">
                Last day <span className="font-normal text-quiet">(optional)</span>
              </Label>
              <Input
                id="wfh-end"
                type="date"
                value={draft.endDate}
                min={draft.startDate || earliest}
                onChange={(e) => update("endDate", e.target.value)}
                invalid={!!show("endDate")}
                className="mt-1.5"
              />
            </div>
          )}
        </div>

        <PreviewBox pv={stale ? null : pv} loading={!pv || stale} problem={problem} />

        <div>
          <Label htmlFor="wfh-reason">Reason</Label>
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
            id="wfh-reason"
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
          <Button variant="secondary" type="button" onClick={onClose} disabled={ask.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={(!canSend && touched && !stale) || sendWhenReady}
            aria-busy={sendWhenReady || ask.isPending || undefined}
          >
            {(ask.isPending || sendWhenReady) && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {pv?.approvedAtOnce ? "Work from home" : "Send request"}
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
  pv: WfhPreview | null | undefined;
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
  const skipped = pv.dates.filter((d) => !d.covered);
  return (
    <div
      className="rounded-xl border border-brand/20 bg-brand/4 px-3.5 py-3 text-sm"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 font-semibold text-primary">
        <Home className="h-4 w-4 text-brand" aria-hidden />
        {pv.daysLabel} from home
        {pv.partTimes ? `, ${partTimesText(pv.partTimes)}` : ""}
      </p>
      {pv.dates.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Days">
          {pv.dates.map((d) => (
            <li
              key={d.date}
              title={d.why ?? undefined}
              className={`rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ${
                d.covered
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
      <p className="mt-2 flex items-start gap-1.5 text-xs text-soft">
        <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {/* The server's sentence already names the most a full day credits. */}
        <span>{pv.tracking}</span>
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-quiet">
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        {pv.approvedAtOnce
          ? "Nobody else approves it: it is approved at once."
          : `Goes to ${pv.waitingFor ?? "your approver"}.`}
      </p>
    </div>
  );
}
