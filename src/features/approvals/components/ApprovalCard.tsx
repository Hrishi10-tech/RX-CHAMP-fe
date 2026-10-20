"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, Lock, Mail, MessageSquarePlus, RotateCcw, Users, X } from "lucide-react";
import { toast } from "sonner";

import {
  btnDanger,
  btnDangerOutline,
  btnGhost,
  btnSecondary,
  btnSuccess,
  checkboxBase,
  errorText,
  hintBase,
  textareaBase,
} from "@/components/ui/classes";
import { roleLabel } from "@/constants/roles";
import { errorCode, errorMessage, errorStatus } from "@/lib/api";
import { formatSignedAmount } from "@/lib/format/duration";
import { relativeDay } from "@/lib/time/businessTime";
import { formatMonth } from "@/lib/time/months";
import {
  NO_COMMENT_TEXT,
  decidedLine,
  firstName,
  reasonLabel,
} from "@/features/approvals/lib/labels";
import {
  useApproveItem,
  useRejectItem,
  useReopenItem,
  type Decider,
} from "@/features/approvals/hooks/useApprovals";
import {
  CategoryChip,
  DueChip,
  EffectChip,
  LiveMeetingChip,
  LockedChip,
  StatusChip,
} from "@/features/approvals/components/ApprovalChips";
import type { ApprovalItemView } from "@/features/approvals/types";

/** Rejection notes are shown to the person; the API wants at least this many characters. */
export const MIN_REJECT_NOTE = 3;
export const MAX_NOTE = 500;

/** "Rejecting takes 15 min off focus time." / "Rejecting keeps the 11 min out." */
function rejectConsequence(item: ApprovalItemView): string {
  const minutes = Math.max(0, Math.round(item.effect?.minutes ?? 0));
  if (!minutes || item.effect?.mode === "NONE") return "Focus time does not change either way.";
  if (item.effect.mode === "MINUS") {
    return `Rejecting takes ${formatSignedAmount(minutes * 60).replace("+", "")} off focus time.`;
  }
  return `Rejecting keeps the ${formatSignedAmount(minutes * 60).replace("+", "")} out of focus time.`;
}

/** Whether a row can be ticked for bulk approve. */
export function isBulkSelectable(item: ApprovalItemView): boolean {
  return item.status === "PENDING" && item.canDecide && !item.locked && !item.inProgress;
}

/**
 * One item waiting for, or given, a decision: who, what and when, the person's
 * reason, what the decision does to focus time, and how long is left to decide.
 * Approve in one click (or with a note); rejecting always asks for a note, which
 * the person sees. Live meetings and locked months are read-only. On a phone the
 * row is a card with the buttons at the bottom; from `lg` the who, what and
 * status sit side by side with the buttons under the text; from `xl` (where the
 * text column keeps at least 14rem beside an open sidebar) the buttons move to
 * the right.
 */
export function ApprovalCard({
  item,
  fetchedAt,
  selected,
  onToggle,
  gutter,
  canReopen,
  me,
}: {
  item: ApprovalItemView;
  /**
   * When the list was read (ms). Only a fallback: the live timer and the due
   * countdown run from the item's own `receivedAt`, which optimistic updates of
   * other rows leave alone.
   */
  fetchedAt: number;
  selected: boolean;
  onToggle: () => void;
  /** Keep a checkbox column, because some row on the page can be selected. */
  gutter: boolean;
  /** The decider or a Super Admin may reopen. */
  canReopen: boolean;
  /** The signed-in person, for the optimistic "Approved by ..." line. */
  me?: Decider;
}) {
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const approve = useApproveItem(me);
  const reject = useRejectItem(me);
  const reopen = useReopenItem();
  // Set synchronously on the first click, so a fast double click (before the
  // buttons re-render as disabled) cannot send the same decision twice.
  const inFlight = useRef(false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const noteId = `${uid}-note`;
  const hintId = `${uid}-hint`;

  const ref = { type: item.type, id: item.id };
  const pending = item.status === "PENDING";
  const live = item.inProgress && item.type === "MEETING";
  const decidable = pending && item.canDecide && !item.locked && !live;
  const busy = approve.isPending || reject.isPending || reopen.isPending;
  const clock = item.receivedAt ?? fetchedAt;
  const first = firstName(item.user?.name);
  const name = item.user?.name || "Someone";
  const who = [item.user?.department, item.user?.role ? roleLabel(item.user.role) : null]
    .filter(Boolean)
    .join(" · ");
  const decided = decidedLine(item);
  const people = [
    ...(item.participants ?? []).map((p) => p.name),
    ...(item.participants?.length ? [] : (item.away?.participants ?? [])).map((p) =>
      typeof p === "string" ? p : p?.name,
    ),
  ].filter((n): n is string => Boolean(n));
  // SPEC 2.9: who will mail the minutes, for meetings and away meetings.
  const momSender = (
    item.momSender ??
    item.away?.momSender ??
    item.meeting?.momSender ??
    ""
  ).trim();
  const reason = (item.reason ?? item.away?.comment ?? "").trim();

  function closePanel() {
    setMode(null);
    setNote("");
    setNoteError(null);
  }

  function failed(err: unknown, action: string) {
    const message = errorMessage(err) ?? "Please try again.";
    const code = errorCode(err);
    const status = errorStatus(err);
    if (code === "NOTE_REQUIRED") {
      setMode("reject");
      setNoteError(message);
      return;
    }
    if (code === "ALREADY_DECIDED" || code === "STALE" || code === "NOT_DECIDED") {
      toast.info("This item changed meanwhile", { description: message });
    } else if (code === "MEETING_IN_PROGRESS") {
      toast.info("The meeting is still running", { description: "Decide it once it ends." });
    } else if (code === "MONTH_LOCKED") {
      toast.error("That month is locked for payroll", {
        description: "The Admin has to unlock it before anything in it can change.",
      });
    } else if (status === 404) {
      toast.error("This item no longer exists", { description: message });
    } else {
      toast.error(`Couldn't ${action}`, { description: message });
    }
    // The lists and counts are re-read by the mutation itself, whatever the error.
  }

  /** Runs one decision at a time for this row; clicks meanwhile are ignored. */
  async function once(run: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await run();
    } finally {
      inFlight.current = false;
    }
  }

  function doApprove(withNote?: string) {
    return once(async () => {
      try {
        await approve.mutateAsync({ ref, note: withNote?.trim() || undefined });
        toast.success("Approved", { description: `${name}: ${item.title}.` });
        closePanel();
      } catch (err) {
        failed(err, "approve");
      }
    });
  }

  function doReject() {
    const text = note.trim();
    if (text.length < MIN_REJECT_NOTE) {
      setNoteError(`Say why in at least ${MIN_REJECT_NOTE} characters. ${first} will see it.`);
      return Promise.resolve();
    }
    return once(async () => {
      try {
        await reject.mutateAsync({ ref, note: text });
        toast.success("Rejected", { description: `${first} will see your note.` });
        closePanel();
      } catch (err) {
        failed(err, "reject");
      }
    });
  }

  function doReopen() {
    return once(async () => {
      try {
        await reopen.mutateAsync({ ref });
        toast.success("Back to pending", { description: `${name}: ${item.title}.` });
      } catch (err) {
        failed(err, "reopen");
      }
    });
  }

  function submitPanel(e: FormEvent) {
    e.preventDefault();
    if (mode === "reject") void doReject();
    else if (mode === "approve") void doApprove(note);
  }

  const lockNote = item.locked
    ? `${formatMonth(item.date?.slice(0, 7))} is locked for payroll, so this can no longer change.`
    : null;

  return (
    <article
      aria-labelledby={titleId}
      className={`border-t border-slate-100 px-4 py-4 first:border-t-0 sm:px-6 ${
        selected ? "bg-[rgba(34,34,204,0.04)]" : ""
      }`}
    >
      <div className="flex gap-3">
        {gutter && (
          <div className="flex w-5 shrink-0 justify-center pt-1">
            {isBulkSelectable(item) && (
              // A 44px tap target around the 20px box; it still takes 20px of the row.
              <label className="-m-3 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  className={checkboxBase}
                  checked={selected}
                  onChange={onToggle}
                  disabled={busy}
                  aria-label={`Select ${name}: ${item.title}`}
                />
              </label>
            )}
          </div>
        )}

        {/*
          Phone: one column. lg: who | what | status, everything else under the
          text. xl: a fourth column for the buttons. The text column never drops
          below its minimum, so it cannot be squeezed to a letter per line.
        */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(7rem,9rem)_minmax(0,1fr)_minmax(9.5rem,11rem)] lg:gap-x-5 xl:grid-cols-[minmax(8rem,10rem)_minmax(14rem,1fr)_minmax(9.5rem,12rem)_14rem]">
          {/* Who */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <p className="break-words font-semibold text-slate-900">{name}</p>
            {who && <p className="break-words text-xs text-slate-500">{who}</p>}
          </div>

          {/* What and when */}
          <div className="min-w-0 space-y-1.5 lg:col-start-2 lg:row-start-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryChip
                category={item.category}
                inProgress={live}
                label={item.type === "AWAY" ? item.away?.reasonLabel : undefined}
              />
              {live && <LiveMeetingChip durationSec={item.durationSec} fetchedAt={clock} />}
              {item.locked && <LockedChip />}
            </div>
            <h3 id={titleId} className="break-words text-sm font-semibold text-slate-900">
              {item.title}
            </h3>
            <p className="break-words text-xs leading-relaxed text-slate-600">
              {relativeDay(item.date)}
              {item.detail ? ` · ${item.detail}` : ""}
            </p>
          </div>

          {/* Status, effect on focus time, time left to decide */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:col-start-3 lg:row-start-1 lg:flex-col lg:items-start">
            <StatusChip status={item.status} />
            <EffectChip item={item} />
            <DueChip item={item} fetchedAt={clock} />
          </div>

          {/* Reason, comment or agenda */}
          <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 lg:col-start-2 lg:col-end-4 lg:row-start-2 xl:col-end-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {reasonLabel(item.category)}
            </p>
            {reason ? (
              <p className="break-words text-sm leading-relaxed text-slate-800">
                &ldquo;{reason}&rdquo;
              </p>
            ) : (
              <p className="text-sm italic text-slate-500">{NO_COMMENT_TEXT}</p>
            )}
            {item.needsComment && !reason && (
              <p id={hintId} className="mt-1 text-xs font-medium text-amber-800">
                {first} adds a comment in the desktop app before ending the day. You can decide now
                or wait for it.
              </p>
            )}
            {people.length > 0 && (
              <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-slate-600">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                With {people.join(", ")}
              </p>
            )}
            {momSender && (
              <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-slate-600">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                Minutes mailed by {momSender}
              </p>
            )}
          </div>

          {(decided || lockNote || live || (pending && !item.canDecide && !item.locked)) && (
            <div className="min-w-0 space-y-1 lg:col-start-2 lg:col-end-4 xl:col-end-5">
              {decided && (
                <p
                  className={`break-words text-xs ${
                    item.status === "REJECTED" ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {decided}
                  {item.decisionNote ? `. Note: ${item.decisionNote}` : "."}
                </p>
              )}
              {lockNote && (
                <p className="flex items-start gap-1.5 text-xs text-slate-600">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  {lockNote}
                </p>
              )}
              {live && !item.locked && (
                <p className="text-xs text-slate-600">
                  The meeting is still running. Approve or reject it once it ends.
                </p>
              )}
              {pending && !item.canDecide && !item.locked && !live && (
                <p className="text-xs text-slate-500">View only: routed to another approver.</p>
              )}
            </div>
          )}

          {/* Actions: under the text up to xl (at the bottom of the card on a phone), on the right from xl. */}
          {decidable && mode === null && (
            <div className="grid grid-cols-2 gap-2 lg:col-start-2 lg:col-end-4 lg:flex lg:flex-wrap lg:items-center xl:col-start-4 xl:col-end-5 xl:row-start-1 xl:flex-col xl:flex-nowrap xl:items-end">
              <div className="col-span-2 grid grid-cols-2 gap-2 lg:flex xl:justify-end">
                <button
                  type="button"
                  onClick={() => void doApprove()}
                  disabled={busy}
                  aria-label={`Approve ${name}: ${item.title}`}
                  aria-describedby={item.needsComment ? hintId : undefined}
                  className={`${btnSuccess} px-3 py-2`}
                >
                  {approve.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("reject");
                    setNoteError(null);
                  }}
                  disabled={busy}
                  aria-label={`Reject ${name}: ${item.title}`}
                  className={`${btnDangerOutline} px-3 py-2`}
                >
                  <X className="h-4 w-4" aria-hidden />
                  Reject
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode("approve");
                  setNoteError(null);
                }}
                disabled={busy}
                aria-label={`Approve with a note: ${name}, ${item.title}`}
                className={`${btnGhost} col-span-2 justify-self-start py-1 text-[13px] xl:-mr-2.5`}
              >
                <MessageSquarePlus className="h-4 w-4" aria-hidden />
                Approve with a note
              </button>
            </div>
          )}

          {!pending && item.canDecide && !item.locked && canReopen && (
            <div className="lg:col-start-2 lg:col-end-4 xl:col-start-4 xl:col-end-5 xl:row-start-1 xl:flex xl:justify-end">
              <button
                type="button"
                onClick={() => void doReopen()}
                disabled={busy}
                aria-label={`Reopen ${name}: ${item.title}`}
                className={`${btnGhost} -ml-2.5 xl:-mr-2.5 xl:ml-0`}
              >
                {reopen.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RotateCcw className="h-4 w-4" aria-hidden />
                )}
                Reopen
              </button>
            </div>
          )}

          {mode !== null && decidable && (
            <form
              onSubmit={submitPanel}
              noValidate
              className={`space-y-2 rounded-xl border p-3 lg:col-start-2 lg:col-end-4 xl:col-end-5 ${
                mode === "reject"
                  ? "border-rose-200 bg-rose-50/60"
                  : "border-emerald-200 bg-emerald-50/60"
              }`}
            >
              <label htmlFor={noteId} className="block text-sm font-semibold text-slate-800">
                {mode === "reject"
                  ? `Why are you rejecting it? ${first} sees this note.`
                  : `Note for ${first} (optional)`}
              </label>
              {mode === "reject" && (
                <p className="text-xs text-slate-600">{rejectConsequence(item)}</p>
              )}
              <textarea
                id={noteId}
                rows={2}
                value={note}
                autoFocus
                maxLength={MAX_NOTE}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError(null);
                }}
                aria-invalid={noteError ? true : undefined}
                aria-describedby={`${noteId}-hint`}
                placeholder={
                  mode === "reject"
                    ? "For example: please take lunch, and tell me if the workload does not allow it."
                    : "For example: fine this time."
                }
                className={textareaBase}
              />
              <p id={`${noteId}-hint`} className={noteError ? errorText : hintBase}>
                {noteError ??
                  (mode === "reject"
                    ? `At least ${MIN_REJECT_NOTE} characters.`
                    : "Shown to them with the decision.")}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={closePanel} disabled={busy} className={btnSecondary}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || (mode === "reject" && note.trim().length < MIN_REJECT_NOTE)}
                  className={mode === "reject" ? btnDanger : btnSuccess}
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {mode === "reject" ? "Reject" : "Approve"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
