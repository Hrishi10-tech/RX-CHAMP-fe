"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MousePointerClick, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnSmall,
  cardBase,
  errorText,
  inputBase,
  inputInvalid,
} from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useOrgScope } from "@/lib/org/selection";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import type { DepartmentView } from "@/features/departments/types";
import {
  getIdleSettings,
  saveDepartmentIdle,
  saveIdleDefaults,
} from "@/features/tracking/api/idleSettings";
import {
  DEFAULT_REASON_KEYS,
  IDLE_MINUTES,
  REASON_ASKS,
  REASON_LABEL,
  customReasonKey,
  reasonProblems,
  validMinutes,
} from "@/features/tracking/lib/reasons";
import type { DepartmentIdleSetting, IdleReason, IdleSettings } from "@/features/tracking/types";

export const idleKeys = {
  all: ["idle-settings"] as const,
  org: (org: string) => [...idleKeys.all, org] as const,
};

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
        checked ? "bg-[rgb(34_34_204)]" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function DefaultsCard({ settings }: { settings: IdleSettings }) {
  const queryClient = useQueryClient();
  const org = useOrgScope();
  const [enabled, setEnabled] = useState(settings.defaultEnabled);
  const [minutes, setMinutes] = useState(String(settings.defaultMinutes));
  const [reasons, setReasons] = useState<IdleReason[]>(settings.reasons);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setEnabled(settings.defaultEnabled);
    setMinutes(String(settings.defaultMinutes));
    setReasons(settings.reasons);
  }, [settings]);

  const save = useMutation({
    mutationFn: saveIdleDefaults,
    onSuccess: (next) => {
      queryClient.setQueryData(idleKeys.org(org), next);
      toast.success("Input tracking saved", {
        description: "Agents pick it up within 5 minutes, or at once when online.",
      });
    },
    onError: (err) =>
      toast.error("Couldn't save input tracking", {
        description: errorMessage(err) ?? "Please try again.",
      }),
  });

  const minutesValue = validMinutes(minutes);
  const problems = reasonProblems(reasons);
  const newProblem =
    newLabel.trim() &&
    (newLabel.trim().length < REASON_LABEL.min || newLabel.trim().length > REASON_LABEL.max)
      ? `Use ${REASON_LABEL.min} to ${REASON_LABEL.max} characters.`
      : null;
  const dirty =
    enabled !== settings.defaultEnabled ||
    minutes !== String(settings.defaultMinutes) ||
    JSON.stringify(reasons) !== JSON.stringify(settings.reasons);

  function addReason() {
    const label = newLabel.trim();
    if (!label || newProblem) return;
    setReasons((rs) => [
      ...rs,
      {
        key: customReasonKey(
          label,
          rs.map((r) => r.key),
        ),
        label,
        kind: "CUSTOM",
        builtIn: false,
      },
    ]);
    setNewLabel("");
  }

  return (
    <section className={`${cardBase} overflow-hidden`}>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]">
            <MousePointerClick className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Ask why when someone is away</h2>
              <Switch
                checked={enabled}
                onChange={setEnabled}
                label="Input tracking for the organisation"
              />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              The organisation&apos;s default. With no keyboard or mouse input for the minutes
              below, the app asks the person why. Departments and people can differ.
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="idle-minutes" className="text-sm font-semibold text-slate-700">
            Away after
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="w-24 shrink-0">
              <input
                id="idle-minutes"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                aria-invalid={minutesValue === null}
                className={`${inputBase} ${minutesValue === null ? inputInvalid : ""}`}
              />
            </div>
            <span className="text-sm text-slate-500">minutes without input</span>
          </div>
          {minutesValue === null && (
            <p className={errorText}>
              Use a whole number from {IDLE_MINUTES.min} to {IDLE_MINUTES.max}.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 p-5">
        <h2 className="text-sm font-bold text-slate-900">Reasons people can give</h2>
        <p className="mt-1 text-sm text-slate-500">
          Rename the built-in reasons or add your own. Anything but a break needs approval to count
          as focus.
        </p>
        <ul className="mt-4 space-y-2">
          {reasons.map((r) => (
            <li
              key={r.key}
              className="grid gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-[minmax(0,16rem)_1fr_auto] sm:items-center"
            >
              <div>
                <input
                  value={r.label}
                  aria-label={`Label for ${r.builtIn ? r.kind : "custom reason"}`}
                  onChange={(e) =>
                    setReasons((rs) =>
                      rs.map((x) => (x.key === r.key ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  aria-invalid={Boolean(problems[r.key])}
                  className={`${inputBase} ${problems[r.key] ? inputInvalid : ""}`}
                />
                {problems[r.key] && <p className={errorText}>{problems[r.key]}</p>}
              </div>
              <p className="text-xs text-slate-500">
                <span className="mr-1.5 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {r.builtIn ? "Built-in" : "Custom"}
                </span>
                {REASON_ASKS[r.builtIn ? String(r.kind) : "CUSTOM"] ?? REASON_ASKS.CUSTOM}
              </p>
              {r.builtIn ? (
                <span className="hidden w-9 sm:block" />
              ) : (
                <button
                  type="button"
                  onClick={() => setReasons((rs) => rs.filter((x) => x.key !== r.key))}
                  aria-label={`Remove ${r.label || "this reason"}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="sm:w-72">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addReason();
                }
              }}
              placeholder="New reason, e.g. Site visit"
              aria-label="New reason"
              className={`${inputBase} ${newProblem ? inputInvalid : ""}`}
            />
            {newProblem && <p className={errorText}>{newProblem}</p>}
          </div>
          <button
            type="button"
            className={btnSecondary}
            onClick={addReason}
            disabled={!newLabel.trim()}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add reason
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
        {dirty && (
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setEnabled(settings.defaultEnabled);
              setMinutes(String(settings.defaultMinutes));
              setReasons(settings.reasons);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Undo changes
          </button>
        )}
        <button
          type="button"
          className={btnPrimary}
          disabled={
            !dirty || save.isPending || minutesValue === null || Object.keys(problems).length > 0
          }
          onClick={() =>
            minutesValue !== null &&
            save.mutate({ defaultEnabled: enabled, defaultMinutes: minutesValue, reasons })
          }
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </button>
      </div>
    </section>
  );
}

const TRACK_OPTIONS = [
  { value: "default", label: "Organisation default" },
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

function DepartmentRow({
  department,
  setting,
  settings,
}: {
  department: DepartmentView;
  setting: DepartmentIdleSetting;
  settings: IdleSettings;
}) {
  const queryClient = useQueryClient();
  const org = useOrgScope();
  const [track, setTrack] = useState(
    setting.enabled === null ? "default" : setting.enabled ? "on" : "off",
  );
  const [minutes, setMinutes] = useState(setting.minutes === null ? "" : String(setting.minutes));
  const [keys, setKeys] = useState<string[] | null>(setting.reasonKeys);

  useEffect(() => {
    setTrack(setting.enabled === null ? "default" : setting.enabled ? "on" : "off");
    setMinutes(setting.minutes === null ? "" : String(setting.minutes));
    setKeys(setting.reasonKeys);
  }, [setting]);

  const save = useMutation({
    mutationFn: () =>
      saveDepartmentIdle(department.id, {
        enabled: track === "default" ? null : track === "on",
        minutes: minutes.trim() ? validMinutes(minutes) : null,
        reasonKeys: keys,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(idleKeys.org(org), next);
      toast.success("Department saved", { description: department.name });
    },
    onError: (err) =>
      toast.error("Couldn't save the department", {
        description: errorMessage(err) ?? "Please try again.",
      }),
  });

  const minutesBad = minutes.trim() !== "" && validMinutes(minutes) === null;
  const shownKeys = keys ?? DEFAULT_REASON_KEYS;
  const dirty =
    (track === "default" ? null : track === "on") !== setting.enabled ||
    (minutes.trim() ? Number(minutes) : null) !== setting.minutes ||
    JSON.stringify(keys) !== JSON.stringify(setting.reasonKeys);

  function toggleKey(key: string) {
    const current = keys ?? DEFAULT_REASON_KEYS;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setKeys(next.length ? next : current);
  }

  return (
    <li className="grid gap-3 p-4 lg:grid-cols-[minmax(10rem,14rem)_11rem_7rem_minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <DepartmentIcon icon={department.icon} size="sm" />
        <span className="truncate text-sm font-semibold text-slate-800">{department.name}</span>
      </div>
      <div className="[&>button]:mt-0 [&>button]:py-2">
        <Select
          value={track}
          onValueChange={setTrack}
          options={TRACK_OPTIONS.map((o) =>
            o.value === "default"
              ? { ...o, label: `Default (${settings.defaultEnabled ? "on" : "off"})` }
              : o,
          )}
          aria-label={`Input tracking for ${department.name}`}
        />
      </div>
      <div>
        <input
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder={`${settings.defaultMinutes} min`}
          aria-label={`Minutes for ${department.name}`}
          aria-invalid={minutesBad}
          className={`${inputBase} h-10 ${minutesBad ? inputInvalid : ""}`}
        />
      </div>
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={`Reasons for ${department.name}`}
      >
        {settings.reasons.map((r) => {
          const on = shownKeys.includes(r.key);
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggleKey(r.key)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                on
                  ? "border-[rgba(34,34,204,0.35)] bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"
              }`}
            >
              {on && <Check className="h-3 w-3" aria-hidden />}
              {r.label}
            </button>
          );
        })}
        {keys !== null && (
          <button
            type="button"
            onClick={() => setKeys(null)}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:underline"
          >
            Use default set
          </button>
        )}
      </div>
      <button
        type="button"
        className={btnSmall}
        disabled={!dirty || minutesBad || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Save className="h-3.5 w-3.5" aria-hidden />
        )}
        Save
      </button>
    </li>
  );
}

/**
 * SPEC 7.2 Input tracking: the organisation's default (on/off, minutes), the
 * reasons people can give (rename built-ins, add custom ones), and each
 * department's own choice. A person's override is set from Team management.
 */
export function TrackingView() {
  const org = useOrgScope();
  const settings = useQuery({ queryKey: idleKeys.org(org), queryFn: getIdleSettings });
  const departments = useDepartments();

  const byDept = useMemo(() => {
    const map = new Map<string, DepartmentIdleSetting>();
    for (const d of settings.data?.departments ?? []) map.set(d.departmentId, d);
    return map;
  }, [settings.data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Input tracking"
        subtitle="When someone is away from their keyboard and mouse, the RX Vision app asks why. Set who it asks, when, and which answers it offers."
      />
      {settings.isPending ? (
        <div className={cardBase}>
          <LoadingState label="Loading input tracking…" />
        </div>
      ) : settings.isError ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(settings.error)}
            onRetry={() => void settings.refetch()}
            retrying={settings.isFetching}
          />
        </div>
      ) : (
        <>
          <DefaultsCard settings={settings.data} />
          <section className={`${cardBase} overflow-hidden`}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Departments</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Empty means the organisation default. Working on hardware is offered only where you
                add it.
              </p>
            </div>
            {departments.isPending ? (
              <LoadingState label="Loading departments…" />
            ) : (departments.data ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">No departments yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(departments.data ?? []).map((d) => (
                  <DepartmentRow
                    key={d.id}
                    department={d}
                    settings={settings.data}
                    setting={
                      byDept.get(d.id) ?? {
                        departmentId: d.id,
                        enabled: null,
                        minutes: null,
                        reasonKeys: null,
                      }
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
