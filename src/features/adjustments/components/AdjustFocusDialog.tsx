"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Minus, Plus, SlidersHorizontal, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Select } from "@/components/ui/Select";
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
import type { SelectOption } from "@/components/ui/types";
import { errorCode, errorDetails, errorMessage } from "@/lib/api";
import { addDaysToKey, formatDayWithWeekday, todayKey } from "@/lib/time/businessTime";
import { useCreateAdjustment } from "@/features/adjustments/hooks/useAdjustments";
import {
  checkDraft,
  signedLabel,
  signedMinutes,
  type AdjustmentDraft,
  type DraftProblems,
} from "@/features/adjustments/lib/form";
import { ADJUSTMENT_MAX_AGE_DAYS, ADJUSTMENT_REASON_MAX_CHARS } from "@/features/adjustments/types";
import type { FocusAdjustmentView } from "@/features/adjustments/types";
import { seesEveryOrg } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useReportPeople } from "@/features/reports/hooks/useReports";
import { useSelectedOrg } from "@/lib/org/selection";

export interface AdjustTarget {
  id: string;
  name: string;
  companyName?: string | null;
}

const QUICK_MINUTES = [15, 30, 60, 120];

/**
 * The Super Manager adds minutes to or takes minutes off one person's day
 * (3.3). Opened for a person (from a day report) or with a picker (from the
 * adjustments page). The preview says exactly what will happen; the person is
 * told, with the reason, once it is saved. 4.0: the picker lists the people of
 * the organisation in view (the header's organisation switch).
 */
export function AdjustFocusDialog({
  open,
  onClose,
  person,
  date,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  /** Fixed person; omit to pick one. */
  person?: AdjustTarget | null;
  /** Preselected day ("YYYY-MM-DD"); defaults to today. */
  date?: string;
  onDone?: (saved: FocusAdjustmentView) => void;
}) {
  const today = todayKey();
  const { role, user } = useSession();
  const selectedOrg = useSelectedOrg();
  // 4.0: the picker reads GET /reports/people, which needs an organisation in view.
  const needsOrg = seesEveryOrg(role) && !selectedOrg;
  const people = useReportPeople(open && !person && !needsOrg);
  const create = useCreateAdjustment();
  const [userId, setUserId] = useState("");
  const [draft, setDraft] = useState<AdjustmentDraft>({
    direction: "ADD",
    minutes: "",
    date: today,
    reason: "",
  });
  const [touched, setTouched] = useState(false);
  const [serverProblem, setServerProblem] = useState<DraftProblems & { person?: string }>({});

  useEffect(() => {
    if (!open) return;
    setUserId(person?.id ?? "");
    setDraft({ direction: "ADD", minutes: "", date: date ?? todayKey(), reason: "" });
    setTouched(false);
    setServerProblem({});
    create.reset();
    // Reset every time it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person?.id, date]);

  // Never herself: the server refuses her own day.
  const candidates = useMemo(
    () => (people.data ?? []).filter((p) => p.id !== user?.id),
    [people.data, user?.id],
  );
  const personOptions = useMemo<SelectOption[]>(
    () =>
      candidates.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.department ?? undefined,
        icon: UserRound,
      })),
    [candidates],
  );
  const chosen = person ?? candidates.find((p) => p.id === userId) ?? null;
  const problems = { ...checkDraft(draft, today), ...serverProblem };
  const personMissing = !chosen;
  const canSave = !personMissing && !problems.minutes && !problems.date && !problems.reason;
  const delta = signedMinutes(draft);
  const earliest = addDaysToKey(today, -ADJUSTMENT_MAX_AGE_DAYS);

  function update<K extends keyof AdjustmentDraft>(key: K, value: AdjustmentDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerProblem((p) => ({ ...p, [key]: undefined }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSave || !chosen) return;
    try {
      const saved = await create.mutateAsync({
        userId: chosen.id,
        date: draft.date,
        minutes: delta,
        reason: draft.reason.trim().replace(/\s+/g, " "),
      });
      toast.success(`${saved.label} for ${saved.userName}`, {
        description: `${formatDayWithWeekday(saved.date)}. ${saved.userName} has been told.`,
      });
      onDone?.(saved);
      onClose();
    } catch (err) {
      const code = errorCode(err);
      const field = errorDetails(err)?.field;
      if (code === "ADJUSTMENTS_OFF") {
        toast.error("Manual adjustments are switched off", {
          description: "The organisation's admin can turn them on in Settings.",
        });
      } else if (code === "MONTH_LOCKED") {
        setServerProblem({ date: "That month is locked for payroll." });
      } else if (field === "minutes" || field === "date" || field === "reason") {
        setServerProblem({ [field]: errorMessage(err) });
      } else {
        toast.error("Couldn't adjust focus time", { description: errorMessage(err) });
      }
    }
  }

  const show = (key: keyof DraftProblems) => (touched ? problems[key] : serverProblem[key]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust focus time"
      description="Adds or takes off minutes by hand, with a reason the person sees. Only the Super Manager can do this, and every adjustment stays on record."
      className="max-w-lg"
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {person ? (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[rgb(34_34_204)] shadow-sm">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{person.name}</p>
              {person.companyName && (
                <p className="truncate text-xs text-slate-500">{person.companyName}</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="adjust-person" className={labelBase}>
              Person
            </label>
            <Select
              id="adjust-person"
              value={userId}
              onValueChange={setUserId}
              options={personOptions}
              placeholder={
                needsOrg
                  ? "Pick an organisation first"
                  : people.isLoading
                    ? "Loading people…"
                    : "Pick a person"
              }
              searchable
              searchPlaceholder="Search people…"
              invalid={touched && personMissing}
              aria-label="Person"
              disabled={people.isLoading || needsOrg}
            />
            {touched && personMissing && !needsOrg && <p className={errorText}>Pick a person.</p>}
            {needsOrg ? (
              <p className={hintBase}>
                Choose the organisation with the switch in the header, then pick the person.
              </p>
            ) : (
              selectedOrg && <p className={hintBase}>People in {selectedOrg.name}.</p>
            )}
            {people.isError && <p className={errorText}>{errorMessage(people.error)}</p>}
          </div>
        )}

        <div>
          <span className={labelBase}>What to do</span>
          <div className="mt-1.5">
            <SegmentedTabs
              label="Add or take off"
              value={draft.direction}
              onChange={(v) => update("direction", v)}
              tabs={[
                { value: "ADD", label: "Add minutes" },
                { value: "TAKE_OFF", label: "Take minutes off" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="adjust-minutes" className={labelBase}>
              Minutes
            </label>
            <input
              id="adjust-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={720}
              step={1}
              value={draft.minutes}
              onChange={(e) => update("minutes", e.target.value)}
              className={`mt-1.5 ${inputBase} ${show("minutes") ? inputInvalid : ""}`}
              placeholder="30"
              data-autofocus
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update("minutes", String(m))}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    draft.minutes === String(m)
                      ? "border-[rgb(34_34_204)] bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m < 60 ? `${m} min` : `${m / 60} h`}
                </button>
              ))}
            </div>
            {show("minutes") && <p className={errorText}>{show("minutes")}</p>}
          </div>
          <div>
            <label htmlFor="adjust-date" className={labelBase}>
              Day
            </label>
            <input
              id="adjust-date"
              type="date"
              value={draft.date}
              min={earliest}
              max={today}
              onChange={(e) => update("date", e.target.value)}
              className={`mt-1.5 ${inputBase} ${show("date") ? inputInvalid : ""}`}
            />
            {show("date") ? (
              <p className={errorText}>{show("date")}</p>
            ) : (
              <p className={hintBase}>Today or up to {ADJUSTMENT_MAX_AGE_DAYS} days back.</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="adjust-reason" className={labelBase}>
            Reason
          </label>
          <textarea
            id="adjust-reason"
            rows={2}
            maxLength={ADJUSTMENT_REASON_MAX_CHARS + 50}
            value={draft.reason}
            onChange={(e) => update("reason", e.target.value)}
            className={`mt-1.5 ${textareaBase} ${show("reason") ? inputInvalid : ""}`}
            placeholder="Agent missed Start Day until 10:00; worked from 09:30"
          />
          {show("reason") ? (
            <p className={errorText}>{show("reason")}</p>
          ) : (
            <p className={hintBase}>The person reads this in their notification.</p>
          )}
        </div>

        <div
          aria-live="polite"
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${
            delta === 0
              ? "border-slate-200 bg-slate-50 text-slate-500"
              : delta > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {delta > 0 ? (
            <Plus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : delta < 0 ? (
            <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <p>
            {delta === 0 || !chosen
              ? "Pick the minutes and the person to see what will change."
              : `${chosen.name}, ${formatDayWithWeekday(draft.date)}: ${signedLabel(delta)} focus time. Paid time and the reports follow.`}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={btnSecondary} data-modal-close>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
            )}
            {delta < 0 ? "Take the minutes off" : "Add the minutes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
