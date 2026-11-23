"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { ReasonPresetsEditor } from "@/features/settings/components/ReasonPresetsEditor";
import { errorCode, errorDetails, errorMessage } from "@/lib/api";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { useAppSettings, useUpdateSettings } from "@/features/settings/hooks/useSettings";
import {
  BOOLEAN_SETTINGS,
  NUMERIC_SETTINGS,
  draftFromSettings,
  settingsFieldOf,
  settingsPatch,
  validateSettings,
  type NumericSettingMeta,
  type SettingsDraft,
  type SettingsErrors,
} from "@/features/settings/lib/validate";
import type {
  AppSettingsView,
  BooleanSettingKey,
  NumericSettingKey,
} from "@/features/settings/types";
import { Checkbox, FieldError, Hint, Input } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/layout/Page";

const GROUPS: {
  title: string;
  description: string;
  keys: NumericSettingKey[];
  withBlock?: boolean;
  /** 3.3: the switch for manual focus adjustments. */
  withAdjustments?: boolean;
  /** Yes or no settings shown under the numbers. */
  bools?: BooleanSettingKey[];
}[] = [
  {
    title: "Approvals",
    description: "How long managers have to decide breaks, skips, meetings and away time.",
    keys: ["approvalSlaHours"],
    withBlock: true,
  },
  {
    title: "Attendance",
    description:
      "How a day's focus time becomes a full day, a half day or absent, and what counts as a late start.",
    keys: ["fullDayPct", "halfDayPct", "lateStartGraceMin"],
    bools: ["requireLateStartReason"],
  },
  {
    title: "Activity",
    description:
      "Quiet hours, seen by Admins and managers with activity access only. Activity never changes focus time.",
    keys: ["quietHourActiveMin", "quietHoursFlag"],
  },
  {
    title: "Breaks",
    description:
      "Scheduled breaks are paid; this buffer pays a little more each day. Break time beyond it is unpaid.",
    keys: ["breakBufferMin"],
  },
  {
    title: "Forgotten End Day",
    description:
      "When a day nobody ended is closed for them, and at what time. A live meeting keeps it open.",
    keys: ["forgottenEndDayIdleMin", "autoCloseAfterShiftEndMin"],
  },
  {
    title: "Focus adjustments",
    description:
      "Corrections by hand while a rollout beds in. Every adjustment keeps its reason and who made it.",
    keys: [],
    withAdjustments: true,
  },
];

const BOOL_META = new Map(BOOLEAN_SETTINGS.map((m) => [m.key, m]));

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
    <div className="grid gap-2 border-t border-divider py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-strong">
          {meta.label}
        </label>
        <p id={`${id}-help`} className="mt-0.5 text-sm text-quiet">
          {meta.help}
        </p>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Input
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
            invalid={Boolean(error)}
            className="w-28 tabular-nums"
          />
          <span className="whitespace-nowrap text-sm font-medium text-quiet">{meta.unit}</span>
        </div>
        <Hint id={`${id}-bounds`}>
          {meta.min} to {meta.max} · default {meta.default}
        </Hint>
        {error && (
          <FieldError id={`${id}-error`} role="alert">
            {error}
          </FieldError>
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
        <Card
          as="section"
          key={group.title}
          aria-labelledby={`group-${group.title}`}
          className="px-4 py-4 sm:px-6"
        >
          <h2 id={`group-${group.title}`} className="text-base font-bold text-primary">
            {group.title}
          </h2>
          <p className="mt-0.5 text-sm text-quiet">{group.description}</p>
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
            {(group.bools ?? []).map((key) => {
              const meta = BOOL_META.get(key);
              if (!meta) return null;
              return (
                <div key={key} className="border-t border-divider py-4">
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={draft[key]}
                      disabled={pending}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                      aria-describedby={`${key}-help`}
                    />
                    <span>
                      <span className="font-semibold text-strong">{meta.label}</span>
                      <span id={`${key}-help`} className="mt-0.5 block text-quiet">
                        {meta.help}
                      </span>
                    </span>
                  </label>
                </div>
              );
            })}
            {group.withBlock && (
              <div className="border-t border-divider py-4">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={draft.blockManagerEndDayWhenOverdue}
                    disabled={pending}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, blockManagerEndDayWhenOverdue: e.target.checked }))
                    }
                    aria-describedby="block-help"
                  />
                  <span>
                    <span className="font-semibold text-strong">
                      Stop managers ending their day while an approval is overdue
                    </span>
                    <span id="block-help" className="mt-0.5 block text-quiet">
                      The desktop app asks them to decide it first. Admins are never stopped.
                      Default on.
                    </span>
                  </span>
                </label>
                {errors.blockManagerEndDayWhenOverdue && (
                  <FieldError role="alert">{errors.blockManagerEndDayWhenOverdue}</FieldError>
                )}
              </div>
            )}
            {group.withAdjustments && (
              <div className="border-t border-divider py-4 first:border-t-0">
                <label className="flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={draft.focusAdjustmentsEnabled}
                    disabled={pending}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, focusAdjustmentsEnabled: e.target.checked }))
                    }
                    aria-describedby="adjustments-help"
                  />
                  <span>
                    <span className="font-semibold text-strong">
                      Manual focus adjustments by the Super Manager
                    </span>
                    <span id="adjustments-help" className="mt-0.5 block text-quiet">
                      While on, the Super Manager can add minutes to or take minutes off a
                      person&apos;s day in this organisation, with a reason the person sees. Meant
                      for a rollout&apos;s first weeks; switch it off once the agents are settled.
                      The trail stays readable either way. Default on.
                    </span>
                  </span>
                </label>
                {errors.focusAdjustmentsEnabled && (
                  <FieldError role="alert">{errors.focusAdjustmentsEnabled}</FieldError>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-card bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:shadow-sm">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          {dirty ? (
            <span className="font-semibold text-attention">Unsaved changes</span>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-working" aria-hidden />
              <span className="text-soft">Saved</span>
            </>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setDraft(original);
              setServerErrors({});
              setSubmitted(false);
            }}
            disabled={!dirty || pending}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Undo changes
          </Button>
          <Button variant="primary" type="submit" disabled={!dirty || pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// 4.0: holidays live on the Calendar page; 3.x calendars arrive with the calendar merge.
type SettingsTab = "rules" | "answers";

const TABS: { value: SettingsTab; label: string }[] = [
  { value: "rules", label: "Rules" },
  { value: "answers", label: "Quick answers" },
];

/** Settings (the organisation's admins): the rules and the quick answers (3.2). */
export function SettingsView() {
  const query = useAppSettings();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asked = searchParams.get("tab");
  const tab: SettingsTab = TABS.some((t) => t.value === asked) ? (asked as SettingsTab) : "rules";
  return (
    <Page width="form" className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Rules for approvals, attendance, activity and pay; the quick answers offered in every comment box; holidays and working days. They apply to everyone."
      />
      <SegmentedTabs
        label="Settings"
        idPrefix="settings"
        value={tab}
        onChange={(next) =>
          router.replace(next === "rules" ? pathname : `${pathname}?tab=${next}`, { scroll: false })
        }
        tabs={TABS}
      />
      <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
        {tab === "answers" ? (
          <ReasonPresetsEditor />
        ) : query.isLoading ? (
          <Card>
            <LoadingState label="Loading settings…" />
          </Card>
        ) : query.isError || !query.data ? (
          <Card>
            <ErrorState
              title="Couldn't load the settings"
              message={errorMessage(query.error)}
              onRetry={() => query.refetch()}
              retrying={query.isFetching}
            />
          </Card>
        ) : (
          <SettingsForm settings={query.data} />
        )}
      </div>
    </Page>
  );
}
