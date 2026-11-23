"use client";

import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { errorCode, errorMessage } from "@/lib/api";
import { usePresetsFor } from "@/features/settings/hooks/usePresets";
import { amountText, NOTE_MAX, NOTE_MIN } from "@/features/leave/lib/format";
import type { WfhDecisionMode } from "@/features/wfh/api/wfh";
import { useDecideWfh } from "@/features/wfh/hooks/useWfh";
import { partTimesText } from "@/features/wfh/lib/format";
import type { WfhRequestView } from "@/features/wfh/types";
import { Hint, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const COPY: Record<
  WfhDecisionMode,
  { title: string; button: string; ask: string; required: boolean }
> = {
  approve: {
    title: "Approve work from home",
    button: "Approve",
    ask: "Note for them (optional)",
    required: false,
  },
  reject: {
    title: "Reject work from home",
    button: "Reject",
    ask: "Why not? They see this note.",
    required: true,
  },
  revoke: {
    title: "Revoke approved work from home",
    button: "Revoke",
    ask: "Why is it taken back? They see this note.",
    required: true,
  },
};

/**
 * Approve, reject or revoke one request, with the note the person reads. 4.0: a
 * locked payroll month is unlocked by the organisation admin (Reports).
 */
export function WfhDecideDialog({
  request,
  mode,
  onClose,
}: {
  request: WfhRequestView | null;
  mode: WfhDecisionMode;
  onClose: () => void;
}) {
  const decide = useDecideWfh();
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
            ? "Nothing left to approve: every day of it is now a day off or on leave"
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
      else if (code === "ALREADY_DECIDED" || code === "NOT_APPROVED")
        setProblem(errorMessage(err) ?? "This request has changed.");
      else toast.error("Couldn't save the decision", { description: errorMessage(err) });
    }
  }

  return (
    <Modal open={!!request} onClose={onClose} title={copy.title} className="max-w-md">
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div className="rounded-xl border border-card bg-fill px-3.5 py-3 text-sm">
          <p className="font-semibold text-primary">
            {request.userName}: from home, {request.span}
          </p>
          <p className="text-soft">
            {amountText(request)}
            {request.partTimes ? ` (${partTimesText(request.partTimes)})` : ""}
            {request.attendanceSource === "BIOMETRIC" ? " · tracked on the phone app" : ""}
          </p>
          <p className="mt-1 text-quiet">&ldquo;{request.reason}&rdquo;</p>
        </div>
        <div>
          <Label htmlFor="wfh-note">{copy.ask}</Label>
          {presets.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick answers">
              {presets.map((p) => (
                <ChoiceChip
                  on={note === p}
                  key={p}
                  onClick={() => {
                    setNote(p);
                    setProblem(null);
                  }}
                >
                  {p}
                </ChoiceChip>
              ))}
            </div>
          )}
          <Textarea
            id="wfh-note"
            rows={3}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => {
              setNote(e.target.value);
              setProblem(null);
            }}
            className="mt-2"
            data-autofocus
          />
          <Hint error={problem}>
            {problem ??
              (mode === "revoke"
                ? "The days become office days again, and the person is told."
                : mode === "reject"
                  ? "The person is told, with your note."
                  : "Shown to them with the decision.")}
          </Hint>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={decide.isPending}>
            Back
          </Button>
          <Button variant="primary" type="submit" disabled={decide.isPending}>
            {decide.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {copy.button}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
