"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import {
  btnPrimary,
  btnSecondary,
  errorText,
  hintBase,
  labelBase,
  textareaBase,
} from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { usePresetsFor } from "@/features/settings/hooks/usePresets";
import { useDecideLeave } from "@/features/leave/hooks/useLeave";
import { amountText, NOTE_MAX, NOTE_MIN, partTimesText } from "@/features/leave/lib/format";
import type { DecisionMode } from "@/features/leave/api/leave";
import type { LeaveRequestView } from "@/features/leave/types";

const COPY: Record<
  DecisionMode,
  { title: string; button: string; ask: string; required: boolean }
> = {
  approve: {
    title: "Approve leave",
    button: "Approve",
    ask: "Note for them (optional)",
    required: false,
  },
  reject: {
    title: "Reject leave",
    button: "Reject",
    ask: "Why not? They see this note.",
    required: true,
  },
  revoke: {
    title: "Revoke approved leave",
    button: "Revoke",
    ask: "Why is it taken back? They see this note.",
    required: true,
  },
};

/** Approve, reject or revoke one request, with the note the person reads. */
export function DecideDialog({
  request,
  mode,
  onClose,
}: {
  request: LeaveRequestView | null;
  mode: DecisionMode;
  onClose: () => void;
}) {
  const decide = useDecideLeave();
  const presets = usePresetsFor("DECISION_NOTE", !!request);
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const copy = COPY[mode];

  useEffect(() => {
    setNote("");
    setProblem(null);
    decide.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id, mode]);

  if (!request) return null;
  const first = request.userName.split(" ")[0] || request.userName;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (copy.required && text.length < NOTE_MIN) {
      setProblem(`Add a note for ${first}, at least ${NOTE_MIN} characters.`);
      return;
    }
    try {
      const saved = await decide.mutateAsync({ id: request!.id, mode, note: text || undefined });
      toast.success(
        saved.status === "APPROVED"
          ? `Approved: ${saved.userName}, ${saved.span}`
          : saved.status === "CANCELLED"
            ? `Nothing to charge: every day of it is now a day off`
            : `${saved.status === "REVOKED" ? "Revoked" : "Rejected"}: ${saved.userName}, ${saved.span}`,
        { description: `${first} has been told.` },
      );
      onClose();
    } catch (err) {
      const code = errorCode(err);
      if (code === "MONTH_LOCKED")
        setProblem(
          "That month is locked for payroll. The organisation admin must unlock it first.",
        );
      else if (
        code === "NOT_ENOUGH_LEAVE" ||
        code === "ALREADY_DECIDED" ||
        code === "NOT_APPROVED"
      ) {
        setProblem(errorMessage(err) ?? "This request has changed.");
      } else toast.error("Couldn't save the decision", { description: errorMessage(err) });
    }
  }

  return (
    <Modal open={!!request} onClose={onClose} title={copy.title} className="max-w-md">
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
          <p className="font-semibold text-slate-900">
            {request.userName}: {request.categoryLabel}, {request.span}
          </p>
          <p className="text-slate-600">
            {amountText(request)}
            {request.partTimes ? ` (${partTimesText(request.partTimes)})` : ""}
          </p>
          <p className="mt-1 text-slate-500">&ldquo;{request.reason}&rdquo;</p>
        </div>
        <div>
          <label htmlFor="leave-note" className={labelBase}>
            {copy.ask}
          </label>
          {presets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick answers">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setNote(p);
                    setProblem(null);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <textarea
            id="leave-note"
            rows={3}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => {
              setNote(e.target.value);
              setProblem(null);
            }}
            className={`mt-2 ${textareaBase}`}
            data-autofocus
          />
          <p className={problem ? errorText : hintBase}>
            {problem ??
              (mode === "revoke"
                ? "The days go back to their balance and become working days again."
                : mode === "reject"
                  ? "The days go back to their balance."
                  : "Shown to them with the decision.")}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={decide.isPending}
          >
            Back
          </button>
          <button type="submit" className={btnPrimary} disabled={decide.isPending}>
            {decide.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {copy.button}
          </button>
        </div>
      </form>
    </Modal>
  );
}
