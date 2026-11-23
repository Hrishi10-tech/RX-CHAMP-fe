"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { labelBase } from "@/components/ui/classes";
import { errorDetails, errorMessage } from "@/lib/api";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { useSession } from "@/features/auth/hooks/useSession";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { useLeavePolicy, useSaveLeavePolicy } from "@/features/leave/hooks/useLeave";
import { policyLockNote } from "@/features/leave/lib/compoff";
import type { ApproverRoute, LeavePolicyPatch, LeavePolicyView } from "@/features/leave/types";
import { Checkbox, FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  // 3.5: comp off
  compOffEnabled: boolean;
  compOffValidityDays: string;
  compOffFullDayPct: string;
  compOffHalfDayPct: string;
  compOffClaimWithinDays: string;
  compOffApprover: ApproverRoute;
  compOffCountLeaveDays: boolean;
  compOffCapped: boolean;
  compOffMaxBalanceDays: string;
}

function formOf(p: LeavePolicyView): Form {
  return {
    compOffEnabled: p.compOffEnabled ?? true,
    compOffValidityDays: String(p.compOffValidityDays ?? 60),
    compOffFullDayPct: String(p.compOffFullDayPct ?? 80),
    compOffHalfDayPct: String(p.compOffHalfDayPct ?? 40),
    compOffClaimWithinDays: String(p.compOffClaimWithinDays ?? 30),
    compOffApprover: p.compOffApprover ?? "MANAGER",
    compOffCountLeaveDays: p.compOffCountLeaveDays ?? true,
    compOffCapped: (p.compOffMaxBalanceDays ?? null) !== null,
    compOffMaxBalanceDays:
      p.compOffMaxBalanceDays === null || p.compOffMaxBalanceDays === undefined
        ? "5"
        : String(p.compOffMaxBalanceDays),
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
 * The leave policy (3.4), comp off included (3.5). 4.0: one per organisation; its
 * admin (or a Super Admin acting in it) changes it, who approves included; the
 * Super Manager and Managers read it. A change to the yearly days, the pro rata rule
 * or the carry-over cap applies to years not started yet, and to this year only
 * when asked.
 */
export function PolicyPanel() {
  const q = useLeavePolicy();
  const save = useSaveLeavePolicy();
  const [form, setForm] = useState<Form | null>(null);
  const [applyNow, setApplyNow] = useState(false);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const { role } = useSession();
  const { mixed } = useOrgsInView();

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
  // 3.5: comp off, only on a server that has it.
  const hasCompOff = p.compOffEnabled !== undefined;
  if (hasCompOff) {
    if (form.compOffEnabled !== p.compOffEnabled) patch.compOffEnabled = form.compOffEnabled;
    if (num(form.compOffValidityDays) !== p.compOffValidityDays)
      patch.compOffValidityDays = num(form.compOffValidityDays);
    if (num(form.compOffFullDayPct) !== p.compOffFullDayPct)
      patch.compOffFullDayPct = num(form.compOffFullDayPct);
    if (num(form.compOffHalfDayPct) !== p.compOffHalfDayPct)
      patch.compOffHalfDayPct = num(form.compOffHalfDayPct);
    if (num(form.compOffClaimWithinDays) !== p.compOffClaimWithinDays)
      patch.compOffClaimWithinDays = num(form.compOffClaimWithinDays);
    if (form.compOffApprover !== p.compOffApprover) patch.compOffApprover = form.compOffApprover;
    if (form.compOffCountLeaveDays !== p.compOffCountLeaveDays)
      patch.compOffCountLeaveDays = form.compOffCountLeaveDays;
    const coCap = form.compOffCapped ? num(form.compOffMaxBalanceDays) : null;
    if (coCap !== (p.compOffMaxBalanceDays ?? null)) patch.compOffMaxBalanceDays = coCap;
  }
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
      | "clslBackdateDays"
      | "compOffValidityDays"
      | "compOffFullDayPct"
      | "compOffHalfDayPct"
      | "compOffClaimWithinDays"
      | "compOffMaxBalanceDays",
    label: string,
    hint: string,
    step = 0.5,
    disabled = false,
  ) => (
    <div>
      <Label htmlFor={`policy-${key}`}>{label}</Label>
      <Input
        id={`policy-${key}`}
        type="number"
        inputMode="decimal"
        step={step}
        min={p.bounds[key]?.min ?? 0}
        max={p.bounds[key]?.max ?? 365}
        value={form[key]}
        disabled={!editable || disabled}
        onChange={(e) => set(key, e.target.value)}
        className="mt-1.5"
      />
      <Hint error={problem?.field === key}>{problem?.field === key ? problem.message : hint}</Hint>
    </div>
  );

  return (
    <Card as="form" onSubmit={submit} noValidate className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary">Leave policy</h2>
          <p className="text-sm text-quiet">
            In use since {formatDayWithWeekday(p.startedOn)}.{" "}
            {policyLockNote(role, editable, mixed)}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-body">
          <Checkbox
            checked={form.enabled}
            disabled={!editable}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Leave requests on
        </label>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">
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
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-meeting">
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
          <label className="flex items-center gap-2 text-sm font-semibold text-body">
            <Checkbox
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
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-quiet">
          Approval and joiners
        </legend>
        <div>
          <Label htmlFor="policy-approver">Who approves</Label>
          <Select
            id="policy-approver"
            value={form.approver}
            onValueChange={(v) => set("approver", v as ApproverRoute)}
            options={p.routes.map((r) => ({ value: r.value, label: r.label }))}
            disabled={!p.canRoute}
            aria-label="Who approves"
          />
          <Hint error={problem?.field === "approver"}>
            {problem?.field === "approver" ? (
              problem.message
            ) : p.canRoute ? (
              "With nobody on the route, a request goes to the organisation admin. Nobody decides their own."
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" aria-hidden /> Set by the organisation admin.
              </span>
            )}
          </Hint>
        </div>
        <div>
          <span className={labelBase}>People who join during the year</span>
          <label className="mt-2.5 flex items-center gap-2 text-sm text-body">
            <Checkbox
              checked={form.prorateJoiners}
              disabled={!editable}
              onChange={(e) => set("prorateJoiners", e.target.checked)}
            />
            Pro rata from their first day (to the nearest half day)
          </label>
        </div>
      </fieldset>

      {hasCompOff && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 flex w-full flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-working">
            <span>Comp off, for extra days worked</span>
            <label className="flex items-center gap-2 text-sm font-semibold normal-case tracking-normal text-body">
              <Checkbox
                checked={form.compOffEnabled}
                disabled={!editable}
                onChange={(e) => set("compOffEnabled", e.target.checked)}
              />
              Comp off on
            </label>
          </legend>
          {numberField(
            "compOffFullDayPct",
            "A full day at (% of the expected time)",
            "Worked at least this share of the shift's expected time on a weekly day off, a holiday or a day of leave.",
            1,
          )}
          {numberField(
            "compOffHalfDayPct",
            "A half day at (%)",
            "At least this share, below a full day. Must be less than the full day.",
            1,
          )}
          {numberField(
            "compOffValidityDays",
            "Valid for (days after the day worked)",
            "What is not taken by then lapses. The person is told 7 days before.",
            1,
          )}
          {numberField(
            "compOffClaimWithinDays",
            "Claim within (days)",
            "A day can be claimed this long after it was worked.",
            1,
          )}
          <div>
            <Label htmlFor="policy-compOffApprover">Who approves claims</Label>
            <Select
              id="policy-compOffApprover"
              value={form.compOffApprover}
              onValueChange={(v) => set("compOffApprover", v as ApproverRoute)}
              options={p.routes.map((r) => ({ value: r.value, label: r.label }))}
              disabled={!p.canRoute}
              aria-label="Who approves comp off claims"
            />
            <Hint error={problem?.field === "compOffApprover"}>
              {problem?.field === "compOffApprover" ? (
                problem.message
              ) : p.canRoute ? (
                "Taking comp off is a leave request, decided on the leave route above."
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" aria-hidden /> Set by the organisation admin.
                </span>
              )}
            </Hint>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-body">
              <Checkbox
                checked={form.compOffCountLeaveDays}
                disabled={!editable}
                onChange={(e) => set("compOffCountLeaveDays", e.target.checked)}
              />
              A full day of leave that was worked anyway counts as an extra day
            </label>
            <label className="flex items-center gap-2 text-sm text-body">
              <Checkbox
                checked={form.compOffCapped}
                disabled={!editable}
                onChange={(e) => set("compOffCapped", e.target.checked)}
              />
              Cap the balance
            </label>
            {form.compOffCapped && (
              <div className="max-w-xs">
                {numberField(
                  "compOffMaxBalanceDays",
                  "At most this many days held",
                  "No new credit beyond it (available and waiting together).",
                  0.5,
                )}
              </div>
            )}
          </div>
        </fieldset>
      )}

      {editable && touchesYear && (
        <label className="flex items-start gap-2 rounded-xl border border-attention-edge bg-attention-wash px-3.5 py-3 text-sm text-attention-ink">
          <Checkbox
            className="mt-0.5"
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

      {problem && !problem.field && <FieldError>{problem.message}</FieldError>}
      {editable && (
        <div className="flex justify-end">
          <Button variant="primary" type="submit" disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save policy
          </Button>
        </div>
      )}
    </Card>
  );
}
