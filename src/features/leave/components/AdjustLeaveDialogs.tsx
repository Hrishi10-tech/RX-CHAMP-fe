"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
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
import { errorDetails, errorMessage } from "@/lib/api";
import { todayKey } from "@/lib/time/businessTime";
import { useAdjustLeave, usePersonLeave, useSetLeaveQuota } from "@/features/leave/hooks/useLeave";
import { ADJUST_REASON_MIN, CATEGORY_TEXT, daysText } from "@/features/leave/lib/format";
import type { LeaveCategory, PersonBalanceRow } from "@/features/leave/types";

import { BalanceCard, LedgerList } from "./LeaveBits";
import { RequestRow } from "./RequestRow";

type Mode = "ADD" | "SUBTRACT" | "SET";

/** A whole number of quarter days, or null. */
function quarterDays(text: string): number | null {
  if (!text.trim()) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n * 4 - Math.round(n * 4)) < 1e-9 ? n : null;
}

/**
 * Add days to, take days off, or set one person's balance (3.4: the Super
 * Manager and Super Admins). The person reads the reason.
 */
export function AdjustLeaveDialog({
  person,
  year,
  onClose,
}: {
  person: PersonBalanceRow | null;
  year: number;
  onClose: () => void;
}) {
  const adjust = useAdjustLeave();
  const [category, setCategory] = useState<LeaveCategory>("CLSL");
  const [mode, setMode] = useState<Mode>("ADD");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [server, setServer] = useState<{ field?: string; message: string } | null>(null);

  useEffect(() => {
    setCategory("CLSL");
    setMode("ADD");
    setDays("");
    setReason("");
    setTouched(false);
    setServer(null);
    adjust.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.user.id]);

  if (!person) return null;
  const current = category === "CLSL" ? person.clsl : person.elpl;
  const amount = quarterDays(days);
  const daysProblem =
    amount === null
      ? "Days in quarter steps (0.25, 0.5, 0.75)."
      : mode !== "SET" && amount <= 0
        ? "More than 0."
        : amount < 0 || amount > 365
          ? "0 to 365 days."
          : null;
  const reasonProblem =
    reason.trim().length < ADJUST_REASON_MIN
      ? `At least ${ADJUST_REASON_MIN} characters; ${person.user.name.split(" ")[0]} reads it.`
      : null;
  const after =
    amount === null
      ? null
      : mode === "ADD"
        ? current.balanceDays + amount
        : mode === "SUBTRACT"
          ? current.balanceDays - amount
          : amount;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (daysProblem || reasonProblem || amount === null) return;
    try {
      const res = await adjust.mutateAsync({
        userId: person!.user.id,
        category,
        year,
        mode,
        days: amount,
        reason: reason.trim(),
      });
      toast.success(
        `${res.adjustment.label} ${res.adjustment.categoryLabel} for ${person!.user.name}`,
        {
          description: `They have been told.`,
        },
      );
      onClose();
    } catch (err) {
      setServer({
        field: errorDetails(err)?.field as string | undefined,
        message: errorMessage(err) ?? "Couldn't save.",
      });
    }
  }

  return (
    <Modal
      open={!!person}
      onClose={onClose}
      title="Change leave balance"
      description={`${person.user.name}, ${year}. Every change stays on their ledger with your name and the reason.`}
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <SegmentedTabs
          label="Which leave"
          value={category}
          onChange={(v) => {
            setCategory(v);
            setServer(null);
          }}
          tabs={[
            { value: "CLSL", label: `CL/SL (${daysText(person.clsl.balanceDays)})` },
            { value: "ELPL", label: `EL/PL (${daysText(person.elpl.balanceDays)})` },
          ]}
        />
        <SegmentedTabs
          label="What to do"
          size="sm"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setServer(null);
          }}
          tabs={[
            { value: "ADD", label: "Add days" },
            { value: "SUBTRACT", label: "Take days off" },
            { value: "SET", label: "Set balance" },
          ]}
        />
        <div>
          <label htmlFor="adjust-days" className={labelBase}>
            {mode === "SET" ? "New balance (days)" : "Days"}
          </label>
          <input
            id="adjust-days"
            type="number"
            inputMode="decimal"
            step={0.25}
            min={0}
            value={days}
            onChange={(e) => {
              setDays(e.target.value);
              setServer(null);
            }}
            className={`mt-1.5 ${inputBase} ${touched && daysProblem ? inputInvalid : ""}`}
            placeholder={mode === "SET" ? String(current.balanceDays) : "1"}
            data-autofocus
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0.5, 1, 2, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDays(String(n))}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {daysText(n)}
              </button>
            ))}
          </div>
          {touched && daysProblem ? (
            <p className={errorText}>{daysProblem}</p>
          ) : (
            after !== null && (
              <p className={`${hintBase} flex items-center gap-1.5`}>
                {CATEGORY_TEXT[category].label} balance {daysText(current.balanceDays)}
                <ArrowRight className="h-3 w-3" aria-hidden />
                <span className={`font-semibold ${after < 0 ? "text-rose-600" : "text-slate-800"}`}>
                  {daysText(after)}
                </span>
              </p>
            )
          )}
        </div>
        <div>
          <label htmlFor="adjust-reason" className={labelBase}>
            Reason
          </label>
          <textarea
            id="adjust-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setServer(null);
            }}
            className={`mt-1.5 ${textareaBase} ${touched && reasonProblem ? inputInvalid : ""}`}
            placeholder="For example: leave taken in October before RX Vision"
          />
          {touched && reasonProblem && <p className={errorText}>{reasonProblem}</p>}
        </div>
        {server && <p className={errorText}>{server.message}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={adjust.isPending}
          >
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={adjust.isPending}>
            {adjust.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** A person's own yearly days of each pool (blank: the policy's). This year follows at once. */
export function QuotaDialog({
  person,
  defaults,
  onClose,
}: {
  person: PersonBalanceRow | null;
  defaults: { clsl: number; elpl: number };
  onClose: () => void;
}) {
  const save = useSetLeaveQuota();
  const [clsl, setClsl] = useState("");
  const [elpl, setElpl] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    setClsl(person?.quota.clslDaysPerYear != null ? String(person.quota.clslDaysPerYear) : "");
    setElpl(person?.quota.elplDaysPerYear != null ? String(person.quota.elplDaysPerYear) : "");
    setProblem(null);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.user.id]);

  if (!person) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const read = (text: string): number | null | "bad" => {
      if (!text.trim()) return null;
      const n = quarterDays(text);
      return n === null || n < 0 || n > 60 ? "bad" : n;
    };
    const c = read(clsl);
    const el = read(elpl);
    if (c === "bad" || el === "bad") {
      setProblem("0 to 60 days a year, in quarter steps. Leave a box empty for the default.");
      return;
    }
    try {
      await save.mutateAsync({
        userId: person!.user.id,
        body: { clslDaysPerYear: c, elplDaysPerYear: el },
      });
      toast.success(`Yearly leave saved for ${person!.user.name}`, {
        description: "This year follows at once.",
      });
      onClose();
    } catch (err) {
      setProblem(errorMessage(err) ?? "Couldn't save.");
    }
  }

  return (
    <Modal
      open={!!person}
      onClose={onClose}
      title="Yearly leave"
      description={`${person.user.name}'s own days a year, instead of the policy's. Empty means the default (${defaults.clsl} CL/SL, ${defaults.elpl} EL/PL).`}
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quota-clsl" className={labelBase}>
              CL/SL a year
            </label>
            <input
              id="quota-clsl"
              type="number"
              inputMode="decimal"
              step={0.25}
              min={0}
              max={60}
              value={clsl}
              placeholder={String(defaults.clsl)}
              onChange={(e) => setClsl(e.target.value)}
              className={`mt-1.5 ${inputBase}`}
              data-autofocus
            />
          </div>
          <div>
            <label htmlFor="quota-elpl" className={labelBase}>
              EL/PL a year
            </label>
            <input
              id="quota-elpl"
              type="number"
              inputMode="decimal"
              step={0.25}
              min={0}
              max={60}
              value={elpl}
              placeholder={String(defaults.elpl)}
              onChange={(e) => setElpl(e.target.value)}
              className={`mt-1.5 ${inputBase}`}
            />
          </div>
        </div>
        {problem && <p className={errorText}>{problem}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** One person's leave in full: balances, ledger and requests. */
export function PersonLeaveDialog({
  userId,
  name,
  year,
  onClose,
}: {
  userId: string | null;
  name: string;
  year: number;
  onClose: () => void;
}) {
  const q = usePersonLeave(userId, year);
  return (
    <Modal
      open={!!userId}
      onClose={onClose}
      title={name}
      description={`Leave in ${year}`}
      className="max-w-2xl"
    >
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError || !q.data ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            {q.data.balances.map((b) => (
              <BalanceCard key={b.category} b={b} />
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900">
              Ledger
            </h3>
            <LedgerList lines={q.data.ledger} />
          </div>
          <div className="rounded-2xl border border-slate-200">
            <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold text-slate-900">
              Requests
            </h3>
            {q.data.requests.length ? (
              <ul className="divide-y divide-slate-100">
                {q.data.requests.map((r) => (
                  <RequestRow key={r.id} r={r} />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No requests in {year}.</p>
            )}
          </div>
          <p className="text-xs text-slate-400">As of {todayKey()}.</p>
        </div>
      )}
    </Modal>
  );
}
