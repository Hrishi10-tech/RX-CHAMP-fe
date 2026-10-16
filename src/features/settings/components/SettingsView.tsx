"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnPrimary,
  btnSecondary,
  cardBase,
  checkboxBase,
  errorText,
  hintBase,
  inputBase,
  inputInvalid,
} from "@/components/ui/classes";
import { errorCode, errorDetails, errorMessage } from "@/lib/api";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useAppSettings, useUpdateSettings } from "@/features/settings/hooks/useSettings";
import {
  NUMERIC_SETTINGS,
  draftFromSettings,
  settingsFieldOf,
  settingsPatch,
  validateSettings,
  type NumericSettingMeta,
  type SettingsDraft,
  type SettingsErrors,
} from "@/features/settings/lib/validate";
import type { AppSettingsView, NumericSettingKey } from "@/features/settings/types";

const GROUPS: {
  title: string;
  description: string;
  keys: NumericSettingKey[];
  withBlock?: boolean;
}[] = [
  {
    title: "Approvals",
    description: "How long managers have to decide breaks, skips and meetings.",
    keys: ["approvalSlaHours"],
    withBlock: true,
  },
  {
    title: "Attendance",
    description:
      "How a day's focus time becomes a full day, a half day or absent, and what counts as a late start.",
    keys: ["fullDayPct", "halfDayPct", "lateStartGraceMin"],
  },
  {
    title: "Activity",
    description:
      "Quiet hours, seen by managers and Super Admins only. Activity never changes focus time.",
    keys: ["quietHourActiveMin", "quietHoursFlag"],
  },
  {
    title: "Forgotten End Day",
    description: "When a day nobody ended is closed for them.",
    keys: ["autoCloseAfterShiftEndMin"],
  },
];

const META = new Map(NUMERIC_SETTINGS.map((m) => [m.key, m]));

function NumberRow({
  meta,
  value,
  error,
  disabled,
  onChange,
}: {
  meta: NumericSettingMeta;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `setting-${meta.key}`;
  return (
    <div className="grid gap-2 border-t border-slate-100 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {meta.label}
        </label>
        <p id={`${id}-help`} className="mt-0.5 text-sm text-slate-500">
          {meta.help}
        </p>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={meta.min}
            max={meta.max}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-help ${id}-bounds${error ? ` ${id}-error` : ""}`}
            className={`${inputBase} w-28 tabular-nums ${error ? inputInvalid : ""}`}
          />
          <span className="whitespace-nowrap text-sm font-medium text-slate-500">{meta.unit}</span>
        </div>
        <p id={`${id}-bounds`} className={hintBase}>
          {meta.min} to {meta.max} · default {meta.default}
        </p>
        {error && (
          <p id={`${id}-error`} className={errorText} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function SettingsForm({ settings }: { settings: AppSettingsView }) {
  const [draft, setDraft] = useState<SettingsDraft>(() => draftFromSettings(settings));
  const [serverErrors, setServerErrors] = useState<SettingsErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const save = useUpdateSettings();

  // A save (or another Super Admin's) brings new values; take them unless something was being edited.
  const original = useMemo(() => draftFromSettings(settings), [settings]);
  const [shown, setShown] = useState(original);
  if (shown !== original) {
    setShown(original);
    if (JSON.stringify(draft) === JSON.stringify(shown)) setDraft(original);
  }
  const dirty = JSON.stringify(original) !== JSON.stringify(draft);

  const check = validateSettings(draft);
  // Field problems show once a save was tried, or straight away for values out of range.
  const localErrors: SettingsErrors = submitted
    ? check.errors
    : Object.fromEntries(
        Object.entries(check.errors).filter(
          ([key]) => (draft[key as NumericSettingKey] ?? "").trim() !== "",
        ),
      );
  const errors: SettingsErrors = { ...localErrors, ...serverErrors };

  function set(key: NumericSettingKey, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setServerErrors((e) => {
      const next = { ...e };
      delete next[key];
      if (key === "fullDayPct" || key === "halfDayPct") {
        delete next.fullDayPct;
        delete next.halfDayPct;
      }
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.values) {
      toast.error("Fix the highlighted settings first.");
      return;
    }
    const patch = settingsPatch(settings, check.values);
    if (Object.keys(patch).length === 0) {
      toast.info("Nothing to save", { description: "The settings are unchanged." });
      return;
    }
    try {
      await save.mutateAsync(patch);
      setSubmitted(false);
      toast.success("Settings saved", { description: "They apply from now on, to everyone." });
    } catch (err) {
      const field = settingsFieldOf(errorDetails(err));
      const message = errorMessage(err) ?? "Please try again.";
      if (field && (errorCode(err) === "VALIDATION_ERROR" || errorCode(err) === undefined)) {
        setServerErrors({ [field]: message });
      } else {
        toast.error("Couldn't save the settings", { description: message });
      }
    }
  }

  const pending = save.isPending;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {GROUPS.map((group) => (
        <section
          key={group.title}
          aria-labelledby={`group-${group.title}`}
          className={`${cardBase} px-4 py-4 sm:px-6`}
        >
          <h2 id={`group-${group.title}`} className="text-base font-bold text-slate-900">
            {group.title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{group.description}</p>
          <div className="mt-2">
            {group.keys.map((key) => {
              const meta = META.get(key);
              return meta ? (
                <NumberRow
                  key={key}
                  meta={meta}
                  value={draft[key]}
                  error={errors[key]}
                  disabled={pending}
                  onChange={(v) => set(key, v)}
                />
              ) : null;
            })}
            {group.withBlock && (
              <div className="border-t border-slate-100 py-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className={`${checkboxBase} mt-0.5`}
                    checked={draft.blockManagerEndDayWhenOverdue}
                    disabled={pending}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, blockManagerEndDayWhenOverdue: e.target.checked }))
                    }
                    aria-describedby="block-help"
                  />
                  <span>
                    <span className="font-semibold text-slate-800">
                      Stop managers ending their day while an approval is overdue
                    </span>
                    <span id="block-help" className="mt-0.5 block text-slate-500">
                      The desktop app asks them to decide it first. Super Admins are never stopped.
                      Default on.
                    </span>
                  </span>
                </label>
                {errors.blockManagerEndDayWhenOverdue && (
                  <p className={errorText} role="alert">
                    {errors.blockManagerEndDayWhenOverdue}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:shadow-sm">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          {dirty ? (
            <span className="font-semibold text-amber-700">Unsaved changes</span>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              <span className="text-slate-600">Saved</span>
            </>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => {
              setDraft(original);
              setServerErrors({});
              setSubmitted(false);
            }}
            disabled={!dirty || pending}
            className={btnSecondary}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Undo changes
          </button>
          <button type="submit" disabled={!dirty || pending} className={btnPrimary}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Settings (Super Admin): the organisation rules in SPEC 1.10. */
export function SettingsView() {
  const query = useAppSettings();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Rules for approvals, attendance and activity. They apply to everyone in the organisation."
      />
      {query.isLoading ? (
        <div className={cardBase}>
          <LoadingState label="Loading settings…" />
        </div>
      ) : query.isError || !query.data ? (
        <div className={cardBase}>
          <ErrorState
            title="Couldn't load the settings"
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        </div>
      ) : (
        <SettingsForm settings={query.data} />
      )}
    </div>
  );
}
