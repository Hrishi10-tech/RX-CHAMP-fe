"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnPrimary,
  cardBase,
  checkboxBase,
  errorText,
  hintBase,
  inputBase,
  labelBase,
} from "@/components/ui/classes";
import { errorDetails, errorMessage } from "@/lib/api";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { useLeavePolicy, useSaveLeavePolicy } from "@/features/leave/hooks/useLeave";
import type { ApproverRoute, LeavePolicyPatch, LeavePolicyView } from "@/features/leave/types";

interface Form {
  enabled: boolean;
  clslDaysPerYear: string;
  elplDaysPerYear: string;
  carryAll: boolean;
  elplCarryCapDays: string;
  elplNoticeDays: string;
  clslBackdateDays: string;
  approver: ApproverRoute;
  prorateJoiners: boolean;
}

function formOf(p: LeavePolicyView): Form {
  return {
    enabled: p.enabled,
    clslDaysPerYear: String(p.clslDaysPerYear),
    elplDaysPerYear: String(p.elplDaysPerYear),
    carryAll: p.elplCarryCapDays === null,
    elplCarryCapDays: p.elplCarryCapDays === null ? "30" : String(p.elplCarryCapDays),
    elplNoticeDays: String(p.elplNoticeDays),
    clslBackdateDays: String(p.clslBackdateDays),
    approver: p.approver,
    prorateJoiners: p.prorateJoiners,
  };
}

/**
 * The leave policy (3.4): the Super Admin and the Super Manager set it; who
 * approves is the Super Admin's. A change to the yearly days, the pro rata rule
 * or the carry-over cap applies to years not started yet, and to this year only
 * when asked.
 */
export function PolicyPanel() {
  const q = useLeavePolicy();
  const save = useSaveLeavePolicy();
  const [form, setForm] = useState<Form | null>(null);
  const [applyNow, setApplyNow] = useState(false);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);

  useEffect(() => {
    if (q.data) setForm(formOf(q.data));
  }, [q.data]);

  if (q.isLoading || (!form && !q.isError)) return <LoadingState label="Loading the policy…" />;
  if (q.isError || !q.data || !form)
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const p = q.data;
  const editable = p.canEdit;

  const patch: LeavePolicyPatch = {};
  const num = (s: string) => Number(s);
  if (form.enabled !== p.enabled) patch.enabled = form.enabled;
  if (num(form.clslDaysPerYear) !== p.clslDaysPerYear)
    patch.clslDaysPerYear = num(form.clslDaysPerYear);
  if (num(form.elplDaysPerYear) !== p.elplDaysPerYear)
    patch.elplDaysPerYear = num(form.elplDaysPerYear);
  const cap = form.carryAll ? null : num(form.elplCarryCapDays);
  if (cap !== p.elplCarryCapDays) patch.elplCarryCapDays = cap;
  if (num(form.elplNoticeDays) !== p.elplNoticeDays)
    patch.elplNoticeDays = num(form.elplNoticeDays);
  if (num(form.clslBackdateDays) !== p.clslBackdateDays)
    patch.clslBackdateDays = num(form.clslBackdateDays);
  if (form.approver !== p.approver) patch.approver = form.approver;
  if (form.prorateJoiners !== p.prorateJoiners) patch.prorateJoiners = form.prorateJoiners;
  const dirty = Object.keys(patch).length > 0;
  const touchesYear =
    patch.clslDaysPerYear !== undefined ||
    patch.elplDaysPerYear !== undefined ||
    patch.elplCarryCapDays !== undefined ||
    patch.prorateJoiners !== undefined;

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setProblem(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    try {
      const res = await save.mutateAsync({
        ...patch,
        applyNow: touchesYear ? applyNow : undefined,
      });
      toast.success("Leave policy saved", {
        description: res.accountsUpdated
          ? `${res.accountsUpdated} ${res.accountsUpdated === 1 ? "balance follows" : "balances follow"} the change.`
          : touchesYear && !applyNow
            ? `It applies from ${p.year + 1}.`
            : undefined,
      });
      setApplyNow(false);
    } catch (err) {
      setProblem({
        field: errorDetails(err)?.field as string | undefined,
        message: errorMessage(err) ?? "Couldn't save.",
      });
    }
  }

  const numberField = (
    key:
      | "clslDaysPerYear"
      | "elplDaysPerYear"
      | "elplCarryCapDays"
      | "elplNoticeDays"
      | "clslBackdateDays",
    label: string,
    hint: string,
    step = 0.5,
    disabled = false,
  ) => (
    <div>
      <label htmlFor={`policy-${key}`} className={labelBase}>
        {label}
      </label>
      <input
        id={`policy-${key}`}
        type="number"
        inputMode="decimal"
        step={step}
        min={p.bounds[key]?.min ?? 0}
        max={p.bounds[key]?.max ?? 365}
        value={form[key]}
        disabled={!editable || disabled}
        onChange={(e) => set(key, e.target.value)}
        className={`mt-1.5 ${inputBase}`}
      />
      <p className={problem?.field === key ? errorText : hintBase}>
        {problem?.field === key ? problem.message : hint}
      </p>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className={`${cardBase} space-y-6 p-4 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Leave policy</h2>
          <p className="text-sm text-slate-500">
            In use since {formatDayWithWeekday(p.startedOn)}.{" "}
            {editable ? "" : "Only the Super Admin and the Super Manager change it."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            className={checkboxBase}
            checked={form.enabled}
            disabled={!editable}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Leave requests on
        </label>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
          CL/SL, casual or sick leave
        </legend>
        {numberField(
          "clslDaysPerYear",
          "Days a year",
          "Given on 1 January. What is left lapses on 31 December.",
          0.25,
        )}
        {numberField(
          "clslBackdateDays",
          "Can cover days back",
          "Days before today a request may start (sick leave is often applied on return). Today and later: always.",
          1,
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
          EL/PL, earned or privilege leave
        </legend>
        {numberField(
          "elplDaysPerYear",
          "Days a year",
          "Given on 1 January. What is left carries over.",
          0.25,
        )}
        {numberField(
          "elplNoticeDays",
          "Notice (days ahead)",
          "The first day must be at least this many days after the request.",
          1,
        )}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className={checkboxBase}
              checked={form.carryAll}
              disabled={!editable}
              onChange={(e) => set("carryAll", e.target.checked)}
            />
            Carry everything over to next year
          </label>
          {!form.carryAll && (
            <div className="mt-3 max-w-xs">
              {numberField(
                "elplCarryCapDays",
                "At most this many days carry over",
                "The rest lapses on 31 December.",
                0.5,
              )}
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Approval and joiners
        </legend>
        <div>
          <label htmlFor="policy-approver" className={labelBase}>
            Who approves
          </label>
          <Select
            id="policy-approver"
            value={form.approver}
            onValueChange={(v) => set("approver", v as ApproverRoute)}
            options={p.routes.map((r) => ({ value: r.value, label: r.label }))}
            disabled={!p.canRoute}
            aria-label="Who approves"
          />
          <p className={problem?.field === "approver" ? errorText : hintBase}>
            {problem?.field === "approver" ? (
              problem.message
            ) : p.canRoute ? (
              "Someone with nobody on the route goes to the Super Admins. Nobody decides their own."
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" aria-hidden /> Set by the Super Admin.
              </span>
            )}
          </p>
        </div>
        <div>
          <span className={labelBase}>People who join during the year</span>
          <label className="mt-2.5 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className={checkboxBase}
              checked={form.prorateJoiners}
              disabled={!editable}
              onChange={(e) => set("prorateJoiners", e.target.checked)}
            />
            Pro rata from their first day (to the nearest half day)
          </label>
        </div>
      </fieldset>

      {editable && touchesYear && (
        <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
          <input
            type="checkbox"
            className={`${checkboxBase} mt-0.5`}
            checked={applyNow}
            onChange={(e) => setApplyNow(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Apply to {p.year} too.</span> Everyone on the default
            gets the new yearly days now; people with their own yearly days keep theirs. Otherwise
            it starts on 1 January {p.year + 1}.
          </span>
        </label>
      )}

      {problem && !problem.field && <p className={errorText}>{problem.message}</p>}
      {editable && (
        <div className="flex justify-end">
          <button type="submit" className={btnPrimary} disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save policy
          </button>
        </div>
      )}
    </form>
  );
}
