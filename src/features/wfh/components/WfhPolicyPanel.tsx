"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorDetails, errorMessage } from "@/lib/api";
import type { ApproverRoute } from "@/features/leave/types";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { policyRuleText, ROUTE_TEXT } from "@/features/wfh/lib/format";
import { useSaveWfhPolicy, useWfhPolicy } from "@/features/wfh/hooks/useWfh";
import type { CreditBasis, WfhPolicyPatch, WfhPolicyView } from "@/features/wfh/types";
import { Card } from "@/components/ui/Card";
import { Checkbox, FieldError, Hint, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

interface Form {
  enabled: boolean;
  noticeDays: string;
  capped: boolean;
  maxDaysPerMonth: string;
  approver: ApproverRoute;
  creditBasis: CreditBasis;
}

function formOf(p: WfhPolicyView): Form {
  return {
    enabled: p.enabled,
    noticeDays: String(p.noticeDays),
    capped: p.maxDaysPerMonth !== null,
    maxDaysPerMonth: p.maxDaysPerMonth === null ? "4" : String(p.maxDaysPerMonth),
    approver: p.approver,
    creditBasis: p.creditBasis,
  };
}

/**
 * The work-from-home policy (3.5 on 4.0): each organisation keeps its own. Its
 * admins (the Admin, a Super Admin inside it) set the notice, the monthly cap,
 * what a day at home credits and who approves; the Super Manager reads it. On
 * "All organisations" there is no one policy to show, so it asks for one.
 */
export function WfhPolicyPanel() {
  const { mixed } = useOrgsInView();
  const q = useWfhPolicy(!mixed);
  const save = useSaveWfhPolicy();
  const [form, setForm] = useState<Form | null>(null);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);

  useEffect(() => {
    if (q.data) setForm(formOf(q.data));
  }, [q.data]);

  if (mixed) {
    return (
      <Card as="section" aria-label="Work-from-home policy">
        <EmptyState
          icon={Building2}
          title="Each organisation has its own policy"
          message="Pick an organisation in the switch at the top to see its work-from-home policy."
        />
      </Card>
    );
  }
  if (q.isLoading || (!form && !q.isError)) return <LoadingState label="Loading the policy…" />;
  if (q.isError || !q.data || !form)
    return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const p = q.data;
  const editable = p.canEdit;

  const patch: WfhPolicyPatch = {};
  if (form.enabled !== p.enabled) patch.enabled = form.enabled;
  if (Number(form.noticeDays) !== p.noticeDays) patch.noticeDays = Number(form.noticeDays);
  const cap = form.capped ? Number(form.maxDaysPerMonth) : null;
  if (cap !== p.maxDaysPerMonth) patch.maxDaysPerMonth = cap;
  if (form.approver !== p.approver) patch.approver = form.approver;
  if (form.creditBasis !== p.creditBasis) patch.creditBasis = form.creditBasis;
  const dirty = Object.keys(patch).length > 0;

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setProblem(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    try {
      await save.mutateAsync(patch);
      toast.success("Work-from-home policy saved");
    } catch (err) {
      setProblem({
        field: errorDetails(err)?.field as string | undefined,
        message: errorMessage(err) ?? "Couldn't save.",
      });
    }
  }

  return (
    <Card as="form" onSubmit={submit} noValidate className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary">Work-from-home policy</h2>
          <p className="text-sm text-quiet">
            {policyRuleText(p)}
            {editable ? "" : " Only the organisation admin changes it."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-body">
          <Checkbox
            checked={form.enabled}
            disabled={!editable}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Requests on
        </label>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-quiet">
          Asking
        </legend>
        <div>
          <Label htmlFor="wfh-notice">Notice (days ahead)</Label>
          <Input
            id="wfh-notice"
            type="number"
            inputMode="numeric"
            step={1}
            min={p.bounds.noticeDays?.min ?? 0}
            max={p.bounds.noticeDays?.max ?? 30}
            value={form.noticeDays}
            disabled={!editable}
            onChange={(e) => set("noticeDays", e.target.value)}
            className="mt-1.5"
          />
          <Hint error={problem?.field === "noticeDays"}>
            {problem?.field === "noticeDays"
              ? problem.message
              : "0 allows the same day. Schedules need no notice."}
          </Hint>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-body">
            <Checkbox
              checked={form.capped}
              disabled={!editable}
              onChange={(e) => set("capped", e.target.checked)}
            />
            Cap the days a month
          </label>
          {form.capped && (
            <div className="mt-3">
              <Label htmlFor="wfh-cap">At most, a month</Label>
              <Input
                id="wfh-cap"
                type="number"
                inputMode="numeric"
                step={1}
                min={p.bounds.maxDaysPerMonth?.min ?? 1}
                max={p.bounds.maxDaysPerMonth?.max ?? 31}
                value={form.maxDaysPerMonth}
                disabled={!editable}
                onChange={(e) => set("maxDaysPerMonth", e.target.value)}
                className="mt-1.5"
              />
              <Hint error={problem?.field === "maxDaysPerMonth"}>
                {problem?.field === "maxDaysPerMonth"
                  ? problem.message
                  : "Approved and waiting requests together; scheduled days count too."}
              </Hint>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-quiet">
          Approval and credit
        </legend>
        <div>
          <Label htmlFor="wfh-approver">Who approves</Label>
          <Select
            id="wfh-approver"
            value={form.approver}
            onValueChange={(v) => set("approver", v as ApproverRoute)}
            options={p.routes.map((r) => ({
              value: r.value,
              label: ROUTE_TEXT[r.value]?.label ?? r.label,
            }))}
            disabled={!p.canRoute}
            aria-label="Who approves"
          />
          <Hint error={problem?.field === "approver"}>
            {problem?.field === "approver" ? (
              problem.message
            ) : p.canRoute ? (
              "Who decides Staff requests. A Manager's own request goes to the organisation admin (or the Super Manager on that route), an admin's to the Super Admins. Nobody decides their own."
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" aria-hidden /> Set by the organisation admin.
              </span>
            )}
          </Hint>
        </div>
        <div>
          <Label htmlFor="wfh-basis">A full day at home credits at most</Label>
          <Select
            id="wfh-basis"
            value={form.creditBasis}
            onValueChange={(v) => set("creditBasis", v as CreditBasis)}
            options={p.bases.map((b) => ({ value: b.value, label: b.label }))}
            disabled={!editable}
            aria-label="Credit basis"
          />
          <Hint error={problem?.field === "creditBasis"}>
            {problem?.field === "creditBasis"
              ? problem.message
              : "Biometric staff, tracked on the phone: a half day credits half of it, a quarter day a quarter. Time at the office the same day counts in full. Agent staff are tracked by the desktop app as usual."}
          </Hint>
        </div>
      </fieldset>

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
