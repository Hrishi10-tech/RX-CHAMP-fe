"use client";

import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
import { labelBase } from "@/components/ui/classes";
import { errorCode, errorDetails, errorMessage } from "@/lib/api";
import { formatDuration } from "@/lib/format/duration";
import { addDaysToKey, formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { usePresetsFor } from "@/features/settings/hooks/usePresets";
import { useSession } from "@/features/auth/hooks/useSession";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { usePeopleOptions } from "@/features/users/hooks/usePeopleOptions";
import type { CompOffDecisionMode } from "@/features/leave/api/compoff";
import {
  useClaimCompOff,
  useDecideCompOff,
  useGrantCompOff,
} from "@/features/leave/hooks/useLeave";
import { compOffPickable } from "@/features/leave/lib/compoff";
import { daysText, NOTE_MAX, NOTE_MIN, REASON_MAX, REASON_MIN } from "@/features/leave/lib/format";
import type { CompOffCreditView, ExtraDayView } from "@/features/leave/types";
import { FieldError, Hint, Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const DAY_TABS: { value: "1" | "0.5"; label: string }[] = [
  { value: "1", label: "A full day" },
  { value: "0.5", label: "A half day" },
];

/** A credit by hand can be for a day up to this far back (the API's limit). */
const GRANT_BACK_DAYS = 365;

/**
 * The people the caller may look up or credit comp off to (4.0): the users list
 * for the organisation in view (X-Org-Id; every organisation on "All
 * organisations", each named on its option), without themselves or the platform
 * roles, and for a Manager only Staff of their departments.
 */
export function useCompOffPeople(enabled: boolean) {
  const { role, user } = useSession();
  const { mixed } = useOrgsInView();
  const people = usePeopleOptions(enabled, { excludeId: user?.id, showOrg: mixed });
  const options = useMemo(() => {
    const ok = new Set(
      people.people.filter((p) => compOffPickable(role, user?.id, p)).map((p) => p.id),
    );
    return people.options.filter((o) => ok.has(o.value));
  }, [people.people, people.options, role, user?.id]);
  return { options, isLoading: people.isLoading, isError: people.isError };
}

function Presets({
  list,
  value,
  onPick,
}: {
  list: string[];
  /** What the field holds now: the preset it matches is shown chosen. */
  value: string;
  onPick: (p: string) => void;
}) {
  if (!list.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick answers">
      {list.map((p) => (
        <ChoiceChip on={value === p} key={p} onClick={() => onPick(p)}>
          {p}
        </ChoiceChip>
      ))}
    </div>
  );
}

/** Claim comp off for an extra day worked (3.5): the day earns a full or a half day. */
export function ClaimCompOffDialog({
  day,
  onClose,
}: {
  day: ExtraDayView | null;
  onClose: () => void;
}) {
  const claim = useClaimCompOff();
  const presets = usePresetsFor("COMPOFF_REASON", !!day);
  const [days, setDays] = useState<"1" | "0.5">("1");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setDays(day && day.earnsDays >= 1 ? "1" : "0.5");
    setReason("");
    setTouched(false);
    setProblem(null);
    claim.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.date]);

  if (!day) return null;
  const text = reason.trim();
  const reasonProblem =
    text.length < REASON_MIN
      ? `Say what you worked on, at least ${REASON_MIN} characters.`
      : text.length > REASON_MAX
        ? `Keep it under ${REASON_MAX} characters.`
        : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (reasonProblem) return;
    try {
      const saved = await claim.mutateAsync({ date: day!.date, days: Number(days), reason: text });
      toast.success(
        saved.status === "APPROVED"
          ? `Comp off credited: ${saved.daysLabel}`
          : `Comp off claimed: ${saved.daysLabel}`,
        {
          description:
            saved.status === "APPROVED"
              ? `For ${saved.workedLabel}. Take it by ${saved.expiresLabel ?? "its expiry"}.`
              : `For ${saved.workedLabel}, waiting for ${saved.waitingFor ?? "approval"}.`,
        },
      );
      onClose();
    } catch (err) {
      setProblem(errorMessage(err) ?? "Couldn't claim it.");
    }
  }

  return (
    <Modal open={!!day} onClose={onClose} title="Claim comp off" className="max-w-md">
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div className="rounded-xl border border-card bg-fill px-3.5 py-3 text-sm">
          <p className="font-semibold text-primary">
            {day.label}: {day.dayLabel}
          </p>
          <p className="text-soft">
            You worked {day.workedLabel}. A full day needs {formatDuration(day.fullDayNeedsSec)}, a
            half day {formatDuration(day.halfDayNeedsSec)}.
          </p>
        </div>
        <div>
          <span className={labelBase}>How much</span>
          <div className="mt-1.5">
            <SegmentedTabs
              label="How much comp off"
              value={days}
              onChange={setDays}
              tabs={DAY_TABS.map((t) => ({
                ...t,
                label:
                  t.value === "1" && day.earnsDays < 1 ? "A full day (not enough worked)" : t.label,
              }))}
            />
          </div>
          {days === "1" && day.earnsDays < 1 && (
            <FieldError>
              You worked {day.workedLabel}: a full day needs {formatDuration(day.fullDayNeedsSec)}.
              Claim a half day.
            </FieldError>
          )}
        </div>
        <div>
          <Label htmlFor="compoff-reason">What you worked on</Label>
          <Presets
            list={presets}
            value={reason}
            onPick={(p) => {
              setReason(p);
              setProblem(null);
            }}
          />
          <Textarea
            id="compoff-reason"
            rows={2}
            value={reason}
            maxLength={REASON_MAX}
            onChange={(e) => {
              setReason(e.target.value);
              setProblem(null);
            }}
            invalid={!!(touched && reasonProblem)}
            className="mt-2"
            placeholder="Your approver sees this."
          />
          <Hint error={problem || (touched && reasonProblem)}>
            {problem ??
              (touched && reasonProblem) ??
              "Your approver can approve it as asked, approve a half day instead, or reject it with a note."}
          </Hint>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={claim.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={claim.isPending || (days === "1" && day.earnsDays < 1)}
          >
            {claim.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Claim {days === "1" ? "a full day" : "a half day"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const COPY: Record<
  CompOffDecisionMode,
  { title: string; button: string; ask: string; required: boolean }
> = {
  approve: {
    title: "Approve comp off",
    button: "Approve",
    ask: "Note for them (optional)",
    required: false,
  },
  reject: {
    title: "Reject the claim",
    button: "Reject",
    ask: "Why not? They see this note.",
    required: true,
  },
  revoke: {
    title: "Take the credit back",
    button: "Take back",
    ask: "Why? They see this note.",
    required: true,
  },
};

/** Approve (as asked, or a half day instead), reject or revoke one claim. */
export function CompOffDecideDialog({
  credit,
  mode,
  onClose,
}: {
  credit: CompOffCreditView | null;
  mode: CompOffDecisionMode;
  onClose: () => void;
}) {
  const decide = useDecideCompOff();
  const presets = usePresetsFor("DECISION_NOTE", !!credit);
  const [days, setDays] = useState<"1" | "0.5">("1");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const copy = COPY[mode];

  useEffect(() => {
    setDays(credit && credit.askedDays >= 1 ? "1" : "0.5");
    setNote("");
    setProblem(null);
    decide.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credit?.id, mode]);

  if (!credit) return null;
  const first = credit.userName.split(" ")[0] || credit.userName;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (copy.required && text.length < NOTE_MIN) {
      setProblem(`Add a note for ${first}, at least ${NOTE_MIN} characters.`);
      return;
    }
    try {
      const saved = await decide.mutateAsync({
        id: credit!.id,
        mode,
        days: mode === "approve" && credit!.askedDays >= 1 ? Number(days) : undefined,
        note: text || undefined,
      });
      toast.success(
        saved.status === "APPROVED"
          ? `Approved: ${saved.userName}, ${saved.daysLabel} for ${saved.workedLabel}`
          : `${saved.status === "REVOKED" ? "Taken back" : "Rejected"}: ${saved.userName}, ${saved.workedLabel}`,
        { description: `${first} has been told.` },
      );
      onClose();
    } catch (err) {
      const code = errorCode(err);
      if (
        code === "COMPOFF_IN_USE" ||
        code === "COMPOFF_CAP" ||
        code === "ALREADY_DECIDED" ||
        code === "NOT_APPROVED"
      ) {
        setProblem(errorMessage(err) ?? "This claim has changed.");
      } else toast.error("Couldn't save the decision", { description: errorMessage(err) });
    }
  }

  return (
    <Modal open={!!credit} onClose={onClose} title={copy.title} className="max-w-md">
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div className="rounded-xl border border-card bg-fill px-3.5 py-3 text-sm">
          <p className="font-semibold text-primary">
            {credit.userName}: {credit.workedLabel}, {credit.dayLabel.toLowerCase()}
          </p>
          <p className="text-soft">
            Worked {credit.workedTime} · asks for {daysText(credit.askedDays)}
          </p>
          <p className="mt-1 text-quiet">&ldquo;{credit.reason}&rdquo;</p>
        </div>
        {mode === "approve" && credit.askedDays >= 1 && (
          <div>
            <span className={labelBase}>Approve</span>
            <div className="mt-1.5">
              <SegmentedTabs
                label="How much to approve"
                value={days}
                onChange={setDays}
                tabs={[
                  { value: "1", label: "A full day, as asked" },
                  { value: "0.5", label: "A half day instead" },
                ]}
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="compoff-note">{copy.ask}</Label>
          <Presets
            list={presets}
            value={note}
            onPick={(p) => {
              setNote(p);
              setProblem(null);
            }}
          />
          <Textarea
            id="compoff-note"
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
                ? "Only a credit nothing has drawn on can be taken back."
                : mode === "reject"
                  ? "The person is told, with your note."
                  : "The credit is valid for a set number of days from the day worked; the person is told by when to take it.")}
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

/**
 * Credit comp off by hand (3.5): work that was not tracked, with a reason the
 * person reads. 4.0: a Manager credits Staff of their departments, the
 * organisation admin and the platform roles anyone in the organisation they see;
 * the person's organisation's policy applies (comp off on, the validity, the cap).
 */
export function GrantCompOffDialog({
  open,
  presetUserId,
  presetName,
  onClose,
}: {
  open: boolean;
  /** Credit this person (their comp off is open): no picker. */
  presetUserId?: string;
  presetName?: string;
  onClose: () => void;
}) {
  const today = todayKey();
  const { role } = useSession();
  const people = useCompOffPeople(open && !presetUserId);
  const grant = useGrantCompOff();
  const [userId, setUserId] = useState(presetUserId ?? "");
  const [date, setDate] = useState(addDaysToKey(today, -1));
  const [days, setDays] = useState<"1" | "0.5">("1");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setUserId(presetUserId ?? "");
    setDate(addDaysToKey(todayKey(), -1));
    setDays("1");
    setReason("");
    setTouched(false);
    setProblem(null);
    grant.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetUserId]);

  const text = reason.trim();
  const own = {
    userId: userId ? undefined : "Pick a person.",
    date: !date
      ? "Pick the day worked."
      : date > today
        ? "The day worked is today or earlier."
        : date < addDaysToKey(today, -GRANT_BACK_DAYS)
          ? `Comp off can be credited for days up to ${GRANT_BACK_DAYS} days back.`
          : undefined,
    reason:
      text.length < REASON_MIN
        ? `Give a reason the person will read, at least ${REASON_MIN} characters.`
        : text.length > REASON_MAX
          ? `Keep it under ${REASON_MAX} characters.`
          : undefined,
  };
  const blocking = Object.values(own).some(Boolean);
  const show = (k: keyof typeof own) =>
    (touched ? own[k] : undefined) ?? (problem?.field === k ? problem.message : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (blocking) return;
    try {
      const saved = await grant.mutateAsync({ userId, date, days: Number(days), reason: text });
      toast.success(`Comp off credited: ${saved.userName}, ${saved.daysLabel}`, {
        description: `For ${saved.workedLabel}; to be taken by ${saved.expiresLabel ?? "its expiry"}. ${saved.userName.split(" ")[0]} has been told.`,
      });
      onClose();
    } catch (err) {
      setProblem({
        field: errorDetails(err)?.field as string | undefined,
        message: errorMessage(err) ?? "Couldn't credit it.",
      });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Credit comp off"
      description="For work that was not tracked, or that the rules would not count. The person is told, with your reason."
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        {presetUserId ? (
          <div>
            <span className={labelBase}>Who</span>
            <p className="mt-1.5 rounded-xl border border-card bg-fill px-3.5 py-2.5 text-sm font-semibold text-primary">
              {presetName || "This person"}
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor="grant-person">Who</Label>
            <Select
              id="grant-person"
              value={userId}
              onValueChange={(v) => {
                setUserId(v);
                setProblem(null);
              }}
              options={people.options}
              placeholder={people.isLoading ? "Loading people…" : "Pick a person"}
              searchable
              searchPlaceholder="Search people…"
              invalid={!!show("userId")}
              aria-label="Who"
            />
            {show("userId") ? (
              <FieldError>{show("userId")}</FieldError>
            ) : (
              <Hint>
                {role === "MANAGER"
                  ? "Staff of the departments you manage."
                  : "Their organisation's comp off rules apply: the validity and any cap."}
              </Hint>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="grant-date">Day worked</Label>
            <Input
              id="grant-date"
              type="date"
              value={date}
              min={addDaysToKey(today, -GRANT_BACK_DAYS)}
              max={today}
              onChange={(e) => {
                setDate(e.target.value);
                setProblem(null);
              }}
              invalid={!!show("date")}
              className="mt-1.5"
            />
            {show("date") ? (
              <FieldError>{show("date")}</FieldError>
            ) : (
              date && <Hint>{formatDayWithWeekday(date)}</Hint>
            )}
          </div>
          <div>
            <span className={labelBase}>How much</span>
            <div className="mt-1.5">
              <SegmentedTabs
                label="How much"
                size="sm"
                value={days}
                onChange={setDays}
                tabs={[
                  { value: "1", label: "Full day" },
                  { value: "0.5", label: "Half day" },
                ]}
              />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="grant-reason">Reason</Label>
          <Textarea
            id="grant-reason"
            rows={2}
            value={reason}
            maxLength={REASON_MAX}
            onChange={(e) => {
              setReason(e.target.value);
              setProblem(null);
            }}
            invalid={!!show("reason")}
            className="mt-1.5"
            placeholder="Worked the go-live on Friday night"
          />
          {show("reason") && <FieldError>{show("reason")}</FieldError>}
        </div>
        {problem && !problem.field && <FieldError>{problem.message}</FieldError>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} disabled={grant.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={grant.isPending}>
            {grant.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Credit comp off
          </Button>
        </div>
      </form>
    </Modal>
  );
}
