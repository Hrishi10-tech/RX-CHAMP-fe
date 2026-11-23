"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  KeyRound,
  Loader2,
  Play,
  Plug,
  Power,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnPrimary,
  btnSecondary,
  btnSmall,
  cardBase,
  checkboxBase,
  errorText,
  hintBase,
  inputBase,
  labelBase,
  textareaBase,
  thBase,
} from "@/components/ui/classes";
import { errorDetails, errorMessage } from "@/lib/api";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { PAYROLL_PAUSED_LABEL } from "@/features/reports/lib/timeFigures";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import {
  useAttendanceStatus,
  useBiometricSettings,
  useCreateKey,
  useImportPunches,
  useIntegrationKeys,
  useRevokeKey,
  useRunPull,
  useSaveBiometricSettings,
  useTestPull,
} from "@/features/attendance/hooks/useAttendance";
import { csvParts, dayTime, sinceText } from "@/features/attendance/lib/format";
import type {
  AuthType,
  BiometricSettingsPatch,
  BiometricSettingsView,
  IngestResult,
  KeyView,
  PullConfig,
  PullPreset,
  PullRunResult,
  TimeFormat,
} from "@/features/attendance/types";

// ---- Status --------------------------------------------------------------------------------

export function StatusStrip() {
  const q = useAttendanceStatus();
  const s = q.data;
  if (q.isLoading) return <LoadingState label="Loading the status…" />;
  if (q.isError || !s)
    return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const tiles: { label: string; value: string; sub?: string; tone?: string }[] = [
    {
      label: "Biometric people",
      value: String(s.people.biometric),
      sub: `${s.people.agent} on the agent${s.people.withoutCode ? ` · ${s.people.withoutCode} without an ID` : ""}`,
      tone: s.people.withoutCode ? "text-amber-700" : undefined,
    },
    {
      label: "Punches today",
      value: String(s.punchesToday),
      sub: s.lastPunchAt ? `Last punch ${dayTime(s.lastPunchAt)}` : "No punch yet",
    },
    {
      label: "Last received",
      value: sinceText(s.lastReceivedAt),
      sub: s.keys.active
        ? `${s.keys.active} active ${s.keys.active === 1 ? "key" : "keys"}`
        : "No active key",
    },
    {
      label: "Codes nobody has",
      value: String(s.unmatchedCodes),
      tone: s.unmatchedCodes ? "text-amber-700" : undefined,
      sub: s.unmatchedCodes ? "See the Unmatched tab" : "Every punch has its person",
    },
    {
      label: "Pull",
      value: s.pull.enabled
        ? s.pull.lastError
          ? "Failing"
          : s.pull.lastOkAt
            ? "Running"
            : "Not run yet"
        : "Off",
      tone: s.pull.lastError ? "text-rose-700" : undefined,
      sub:
        s.pull.lastError ??
        (s.pull.lastOkAt
          ? `Last read ${sinceText(s.pull.lastOkAt)}, ${s.pull.lastCount} stored`
          : s.pull.enabled
            ? `Every few minutes (${s.pull.preset.toLowerCase()})`
            : "Push, pull or import below"),
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="bg-white px-3 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t.label}
          </dt>
          <dd className={`mt-0.5 text-lg font-bold tabular-nums ${t.tone ?? "text-slate-900"}`}>
            {t.value}
          </dd>
          {t.sub && <dd className="text-xs text-slate-500">{t.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

// ---- The integration switch (3.6) --------------------------------------------------------------

/**
 * The switch behind the payroll pause: while it is off, biometric staff's payroll is not
 * calculated. The organisation admin turns it on when the device is connected, and each
 * stretch it was on stays in the history, which decides the days calculated. 4.0: each
 * organisation runs its own integration, so the switch is the organisation's in view: its
 * admin (or a Super Admin acting in it) changes it, the Super Manager reads it. On "All
 * organisations" there is no one switch to show.
 */
export function IntegrationSwitchSection({
  settings,
  canEdit,
}: {
  settings: BiometricSettingsView;
  canEdit: boolean;
}) {
  const save = useSaveBiometricSettings();
  const { org, mixed } = useOrgsInView();
  const [asking, setAsking] = useState(false);
  const on = settings.integrationOn;
  const periods = settings.integrationPeriods ?? [];
  const current = periods.find((p) => p.toDate === null);

  async function confirm() {
    try {
      await save.mutateAsync({ integrationOn: !on });
      toast.success(on ? "Integration switched off" : "Integration switched on", {
        description: on
          ? "Biometric staff's payroll is paused from tomorrow."
          : "Biometric staff's payroll is calculated from today.",
      });
      setAsking(false);
    } catch (err) {
      toast.error("Couldn't change it", { description: errorMessage(err) });
    }
  }

  if (mixed) {
    return (
      <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="integration-title">
        <h2
          id="integration-title"
          className="flex items-center gap-2 text-base font-bold text-slate-900"
        >
          <Power className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
          Biometric integration
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Each organisation runs its own integration. Pick an organisation to see whether its
          integration is on.
        </p>
      </section>
    );
  }

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="integration-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="integration-title"
            className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900"
          >
            <Power className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            Biometric integration
            <Chip tone={on ? "success" : "neutral"} dot={on}>
              {on ? "On" : "Off"}
            </Chip>
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {on && current
              ? `On since ${formatDayWithWeekday(current.fromDate)}${org?.name ? ` for ${org.name}` : ""}. Payroll is calculated for biometric staff on the days it is on.`
              : `Off${org?.name ? ` for ${org.name}` : ""}. Biometric staff's payroll shows "${PAYROLL_PAUSED_LABEL}" and is left out of payroll runs and exports. Their days, punches and focus time are tracked as usual.`}
          </p>
          {!canEdit && (
            <p className="mt-1 text-xs text-slate-500">
              The organisation admin switches it on once the device is connected.
            </p>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            className={on ? btnSecondary : btnPrimary}
            onClick={() => setAsking(true)}
          >
            {on ? "Switch off" : "Switch on"}
          </button>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          When it has been on
        </p>
        {periods.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">It has not been on yet.</p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 md:hidden">
              {periods.map((p) => (
                <li key={p.startedAt} className="px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-900">
                    {formatDayWithWeekday(p.fromDate)} to{" "}
                    {p.toDate ? formatDayWithWeekday(p.toDate) : "now"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[
                      p.startedByName ? `On by ${p.startedByName}` : null,
                      p.endedByName ? `off by ${p.endedByName}` : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-2 hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th scope="col" className={thBase}>
                      From
                    </th>
                    <th scope="col" className={thBase}>
                      To
                    </th>
                    <th scope="col" className={thBase}>
                      Switched on by
                    </th>
                    <th scope="col" className={thBase}>
                      Switched off by
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.startedAt} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-2 tabular-nums text-slate-900">
                        {formatDayWithWeekday(p.fromDate)}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">
                        {p.toDate ? formatDayWithWeekday(p.toDate) : "Still on"}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{p.startedByName ?? ""}</td>
                      <td className="px-4 py-2 text-slate-700">{p.endedByName ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog
        open={asking}
        onClose={() => setAsking(false)}
        onConfirm={() => void confirm()}
        loading={save.isPending}
        icon={Power}
        title={on ? "Switch the integration off?" : "Switch the integration on?"}
        description={
          on
            ? "Biometric staff's payroll is paused from tomorrow. Days already calculated stay as they are."
            : "Biometric staff's payroll is calculated from today. Earlier days stay paused: nothing is worked out again by itself."
        }
        confirmLabel={on ? "Switch off" : "Switch on"}
      />
    </section>
  );
}

// ---- Keys and the push -----------------------------------------------------------------------

function NewKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateKey();
  const [name, setName] = useState("");
  const [made, setMade] = useState<{ key: string; view: KeyView } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setName("");
    setMade(null);
    setProblem(null);
    create.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setProblem("Name the key: where it is used, 2 to 80 characters.");
      return;
    }
    try {
      setMade(await create.mutateAsync(name));
    } catch (err) {
      setProblem(errorMessage(err) ?? "Couldn't make the key.");
    }
  }

  async function copy() {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made.key);
      toast.success("Key copied");
    } catch {
      toast.error("Couldn't copy: select the key and copy it by hand.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={made ? "Your new key" : "Make an integration key"}
      className="max-w-md"
    >
      {made ? (
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Copy it now.</span> It is shown this
            once; RX Vision keeps only a hash of it. Give it to whoever runs the connector. Punches
            sent with it count for this organisation&apos;s people only.
          </p>
          <div className="flex items-stretch gap-2">
            <code
              className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900"
              aria-label="The key"
            >
              {made.key}
            </code>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => void copy()}
              aria-label="Copy the key"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" className={btnPrimary} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
          <div>
            <label htmlFor="key-name" className={labelBase}>
              Where it is used
            </label>
            <input
              id="key-name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="eSSL connector, Chennai office"
              className={`mt-1.5 ${inputBase}`}
              data-autofocus
            />
            <p className={problem ? errorText : hintBase}>
              {problem ??
                "One key per connector or device, so one can be revoked without the others."}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={btnSecondary}
              onClick={onClose}
              disabled={create.isPending}
            >
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Make key
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

const SAMPLE = `{ "punches": [
  { "code": "E1042", "time": "2026-11-04T09:02:11+05:30", "direction": "IN", "deviceId": "GATE-1", "externalId": "88123" }
] }`;

function PushSection({ canEdit, pushPath }: { canEdit: boolean; pushPath: string }) {
  const keys = useIntegrationKeys(canEdit);
  const revoke = useRevokeKey();
  const [making, setMaking] = useState(false);
  const [revoking, setRevoking] = useState<KeyView | null>(null);
  // 4.0: the portal proxies /api to the API, so the push address is this site's.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin.replace(/\/$/, "")}${pushPath}`;

  async function confirmRevoke() {
    if (!revoking) return;
    try {
      await revoke.mutateAsync(revoking.id);
      toast.success(`Key revoked: ${revoking.name}`, {
        description: "It stopped working at once.",
      });
      setRevoking(null);
    } catch (err) {
      toast.error("Couldn't revoke it", { description: errorMessage(err) });
    }
  }

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="push-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="push-title"
            className="flex items-center gap-2 text-base font-bold text-slate-900"
          >
            <Plug className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            Push: the device sends punches
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            The biometric system, or a small connector beside it, posts punches with one of this
            organisation&apos;s integration keys; the key decides the organisation, and its codes
            match this organisation&apos;s people only. Safe to resend: a punch already stored is
            counted as a duplicate.
          </p>
        </div>
        {canEdit && (
          <button type="button" className={btnPrimary} onClick={() => setMaking(true)}>
            <KeyRound className="h-4 w-4" aria-hidden />
            Make a key
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">POST {url}</p>
          <p className="mt-1">
            Header <code className="font-mono">X-Biometric-Key: rxb_…</code>, JSON body, up to 500
            punches a call. <code className="font-mono">time</code> is ISO 8601 with an offset, a
            local <code className="font-mono">YYYY-MM-DD HH:MM:SS</code> in the business time zone,
            or epoch seconds. <code className="font-mono">direction</code> is IN, OUT, the words set
            in Settings, or left out.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-2 font-mono text-[11px] text-slate-800 ring-1 ring-slate-200">
            {SAMPLE}
          </pre>
          <p className="mt-2">
            The answer says what was stored, what was already there, codes nobody has yet, and each
            punch ignored and why.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Integration keys
          </p>
          {!canEdit ? (
            <p className="mt-2 text-sm text-slate-500">
              The organisation admin makes and revokes keys.
            </p>
          ) : keys.isLoading ? (
            <LoadingState label="Loading keys…" />
          ) : (keys.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No key yet. Make one and give it to the connector.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {(keys.data ?? []).map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">
                      {k.name}{" "}
                      <span className="font-mono text-xs font-normal text-slate-500">
                        {k.prefix}…
                      </span>
                    </span>
                    <span className="block text-xs text-slate-500">
                      {k.active
                        ? k.lastUsedAt
                          ? `Last used ${sinceText(k.lastUsedAt)}${k.lastUsedIp ? ` from ${k.lastUsedIp}` : ""}`
                          : "Never used"
                        : `Revoked ${dayTime(k.revokedAt)}`}
                    </span>
                  </span>
                  {k.active ? (
                    <button
                      type="button"
                      className={`${btnSmall} border-rose-200 text-rose-600 hover:bg-rose-50`}
                      onClick={() => setRevoking(k)}
                    >
                      Revoke
                    </button>
                  ) : (
                    <Chip tone="neutral">Revoked</Chip>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <NewKeyDialog open={making} onClose={() => setMaking(false)} />
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => void confirmRevoke()}
        loading={revoke.isPending}
        destructive
        icon={KeyRound}
        title="Revoke this key?"
        description={
          revoking
            ? `${revoking.name} stops working at once. Make a new key for the connector first if it is still in use.`
            : undefined
        }
        confirmLabel="Revoke"
      />
    </section>
  );
}

// ---- The pull adapter ------------------------------------------------------------------------

const AUTH_OPTIONS: { value: AuthType; label: string }[] = [
  { value: "NONE", label: "No sign-in" },
  { value: "BEARER", label: "Bearer token" },
  { value: "TOKEN", label: "Token header (Token …)" },
  { value: "JWT", label: "JWT header (JWT …)" },
  { value: "HEADER", label: "API key in a header" },
  { value: "BASIC", label: "Basic (user and password)" },
  { value: "LOGIN", label: "Sign in for a token (BioTime)" },
];
const TIME_OPTIONS: { value: TimeFormat; label: string }[] = [
  { value: "AUTO", label: "Work it out" },
  { value: "ISO", label: "ISO 8601" },
  { value: "LOCAL", label: "Local, YYYY-MM-DD HH:MM:SS" },
  { value: "EPOCH_S", label: "Epoch seconds" },
  { value: "EPOCH_MS", label: "Epoch milliseconds" },
];

type PullForm = Omit<PullConfig, "everyMin" | "overlapMin"> & {
  everyMin: string;
  overlapMin: string;
  inWords: string[];
  outWords: string[];
};

function formOf(p: PullConfig): PullForm {
  return {
    ...p,
    fields: { ...p.fields },
    everyMin: String(p.everyMin),
    overlapMin: String(p.overlapMin),
  };
}

function PullResult({ r }: { r: PullRunResult }) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 text-sm ${r.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}
      aria-live="polite"
    >
      <p className="flex items-center gap-1.5 font-semibold">
        {r.ok ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4" aria-hidden />
        )}
        {r.ok
          ? `Read ${r.read} ${r.read === 1 ? "row" : "rows"} over ${r.pages} ${r.pages === 1 ? "page" : "pages"}`
          : (r.error ?? "Failed")}
      </p>
      <p className="mt-0.5 text-xs opacity-80">
        Window {dayTime(r.from)} to {dayTime(r.to)}
      </p>
      {r.sample && r.sample.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left font-semibold">
                <th className="pr-3">code</th>
                <th className="pr-3">time</th>
                <th className="pr-3">direction</th>
                <th className="pr-3">device</th>
                <th>external id</th>
              </tr>
            </thead>
            <tbody>
              {r.sample.map((row, i) => (
                <tr key={i} className="font-mono">
                  <td className="pr-3">{String(row.code ?? "")}</td>
                  <td className="pr-3">{String(row.time ?? "")}</td>
                  <td className="pr-3">{String(row.direction ?? "")}</td>
                  <td className="pr-3">{String(row.deviceId ?? "")}</td>
                  <td>{String(row.externalId ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.stored && (
        <p className="mt-1.5 text-xs">
          Stored {r.stored.stored}, already there {r.stored.duplicates}, nobody has the code{" "}
          {r.stored.unmatched}, ignored {r.stored.ignored.length}, days updated{" "}
          {r.stored.daysUpdated}.
        </p>
      )}
    </div>
  );
}

function PullSection({ settings, canEdit }: { settings: BiometricSettingsView; canEdit: boolean }) {
  const save = useSaveBiometricSettings();
  const test = useTestPull();
  const run = useRunPull();
  const [form, setForm] = useState<PullForm>(() => formOf(settings.pull));
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [result, setResult] = useState<PullRunResult | null>(null);
  useEffect(() => {
    setForm(formOf(settings.pull));
  }, [settings.pull]);

  const patch = useMemo<BiometricSettingsPatch>(() => {
    const p = settings.pull;
    const pull: NonNullable<BiometricSettingsPatch["pull"]> = {};
    const keys = [
      "enabled",
      "preset",
      "url",
      "authType",
      "authHeader",
      "username",
      "loginUrl",
      "tokenPath",
      "tokenScheme",
      "sinceParam",
      "untilParam",
      "queryTimeFormat",
      "listPath",
      "nextPath",
      "timeFormat",
    ] as const;
    for (const k of keys) if (form[k] !== p[k]) (pull as Record<string, unknown>)[k] = form[k];
    if (form.inWords.join("|") !== p.inWords.join("|")) pull.inWords = form.inWords;
    if (form.outWords.join("|") !== p.outWords.join("|")) pull.outWords = form.outWords;
    if (Number(form.everyMin) !== p.everyMin) pull.everyMin = Number(form.everyMin);
    if (Number(form.overlapMin) !== p.overlapMin) pull.overlapMin = Number(form.overlapMin);
    const fields: Partial<PullConfig["fields"]> = {};
    for (const f of ["code", "time", "direction", "deviceId", "externalId"] as const)
      if (form.fields[f] !== p.fields[f]) fields[f] = form.fields[f];
    if (Object.keys(fields).length) pull.fields = fields;
    const out: BiometricSettingsPatch = {};
    if (Object.keys(pull).length) out.pull = pull;
    if (secret) out.secret = secret;
    if (password) out.password = password;
    return out;
  }, [form, settings.pull, secret, password]);
  const dirty = Object.keys(patch).length > 0;

  function set<K extends keyof PullForm>(key: K, value: PullForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setProblem(null);
  }
  const words = (list: string[]) => list.join(", ");
  const parseWords = (s: string) =>
    s
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 20);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    try {
      await save.mutateAsync(patch);
      setSecret("");
      setPassword("");
      toast.success("Pull settings saved");
    } catch (err) {
      setProblem({
        field: (errorDetails(err)?.field as string | undefined)?.replace(/^pull\./, ""),
        message: errorMessage(err) ?? "Couldn't save.",
      });
    }
  }

  async function onTest() {
    setResult(null);
    try {
      setResult(await test.mutateAsync());
    } catch (err) {
      toast.error("The test could not run", { description: errorMessage(err) });
    }
  }
  async function onRun() {
    setResult(null);
    try {
      const r = await run.mutateAsync();
      setResult(r);
      if (r.ok) toast.success(`Pulled: ${r.stored?.stored ?? 0} stored`);
    } catch (err) {
      toast.error("The pull could not run", { description: errorMessage(err) });
    }
  }

  const text = (
    key: keyof Omit<
      PullForm,
      | "fields"
      | "inWords"
      | "outWords"
      | "enabled"
      | "preset"
      | "authType"
      | "queryTimeFormat"
      | "timeFormat"
    >,
    label: string,
    hint?: string,
    placeholder?: string,
  ) => (
    <div>
      <label htmlFor={`pull-${key}`} className={labelBase}>
        {label}
      </label>
      <input
        id={`pull-${key}`}
        value={form[key] as string}
        disabled={!canEdit}
        placeholder={placeholder}
        onChange={(e) => set(key, e.target.value as never)}
        className={`mt-1.5 ${inputBase} h-10 font-mono text-xs`}
      />
      <p className={problem?.field === key ? errorText : hintBase}>
        {problem?.field === key ? problem.message : hint}
      </p>
    </div>
  );
  const field = (key: keyof PullConfig["fields"], label: string) => (
    <div>
      <label htmlFor={`pull-field-${key}`} className={labelBase}>
        {label}
      </label>
      <input
        id={`pull-field-${key}`}
        value={form.fields[key]}
        disabled={!canEdit}
        onChange={(e) => set("fields", { ...form.fields, [key]: e.target.value })}
        className={`mt-1.5 ${inputBase} h-10 font-mono text-xs`}
      />
    </div>
  );
  const needsSecret = ["BEARER", "TOKEN", "JWT", "HEADER"].includes(form.authType);
  const needsPassword = form.authType === "BASIC" || form.authType === "LOGIN";

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="pull-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="pull-title"
            className="flex items-center gap-2 text-base font-bold text-slate-900"
          >
            <RefreshCw className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
            Pull: RX Vision reads the device&apos;s API
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            This organisation&apos;s own pull: its address and sign-in are never shared with another
            organisation. Every few minutes, re-reading the last minutes each time so a late sync is
            never missed. The server needs a route to the device&apos;s address; it never reads
            link-local addresses.
            {canEdit ? "" : " Only the organisation admin changes, tests or runs it."}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => void onTest()}
              disabled={test.isPending || dirty}
            >
              {test.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plug className="h-4 w-4" aria-hidden />
              )}
              Test connection
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => void onRun()}
              disabled={run.isPending || dirty}
            >
              {run.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              Pull now
            </button>
          </div>
        )}
      </div>
      {dirty && canEdit && (
        <p className="mt-2 text-xs text-amber-700">Save the settings before testing them.</p>
      )}
      {result && (
        <div className="mt-3">
          <PullResult r={result} />
        </div>
      )}
      <form onSubmit={submit} noValidate className="mt-4 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pull-preset" className={labelBase}>
              Biometric system
            </label>
            <Select
              id="pull-preset"
              value={form.preset}
              onValueChange={(v) => set("preset", v as PullPreset)}
              options={[
                { value: "GENERIC", label: "Any JSON API (set the fields below)" },
                { value: "BIOTIME", label: "ZKTeco BioTime (fills the fields)" },
              ]}
              disabled={!canEdit}
              aria-label="Biometric system"
            />
            <p className={hintBase}>
              Choosing BioTime fills the sign-in, paths and field names; the address, user and
              password are yours.
            </p>
          </div>
          <label className="flex items-center gap-2 self-end pb-6 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className={checkboxBase}
              checked={form.enabled}
              disabled={!canEdit}
              onChange={(e) => set("enabled", e.target.checked)}
            />
            Pull switched on
          </label>
          {text(
            "url",
            "Punches URL",
            "GET, with the window as query parameters.",
            "http://10.0.0.5/iclock/api/transactions/",
          )}
          <div>
            <label htmlFor="pull-authType" className={labelBase}>
              Sign-in
            </label>
            <Select
              id="pull-authType"
              value={form.authType}
              onValueChange={(v) => set("authType", v as AuthType)}
              options={AUTH_OPTIONS}
              disabled={!canEdit}
              aria-label="Sign-in"
            />
          </div>
          {form.authType === "HEADER" && text("authHeader", "Header name", undefined, "X-API-Key")}
          {(form.authType === "BASIC" || form.authType === "LOGIN") &&
            text("username", "User name")}
          {form.authType === "LOGIN" &&
            text(
              "loginUrl",
              "Sign-in URL",
              "POST { username, password } here.",
              "http://10.0.0.5/jwt-api-token-auth/",
            )}
          {form.authType === "LOGIN" &&
            text("tokenPath", "Token path in the answer", undefined, "token")}
          {form.authType === "LOGIN" &&
            text(
              "tokenScheme",
              "Token scheme",
              'How the token is sent: "Token", "JWT" or "Bearer".',
              "Token",
            )}
          {needsSecret && (
            <div>
              <label htmlFor="pull-secret" className={labelBase}>
                Token or API key{" "}
                {settings.secretSet && <span className="font-normal text-emerald-700">(set)</span>}
              </label>
              <input
                id="pull-secret"
                type="password"
                value={secret}
                disabled={!canEdit}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={settings.secretSet ? "Leave empty to keep it" : ""}
                className={`mt-1.5 ${inputBase} h-10`}
                autoComplete="off"
              />
              <p className={hintBase}>Stored on the server, never shown again.</p>
            </div>
          )}
          {needsPassword && (
            <div>
              <label htmlFor="pull-password" className={labelBase}>
                Password{" "}
                {settings.passwordSet && (
                  <span className="font-normal text-emerald-700">(set)</span>
                )}
              </label>
              <input
                id="pull-password"
                type="password"
                value={password}
                disabled={!canEdit}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={settings.passwordSet ? "Leave empty to keep it" : ""}
                className={`mt-1.5 ${inputBase} h-10`}
                autoComplete="new-password"
              />
              <p className={hintBase}>Stored on the server, never shown again.</p>
            </div>
          )}
        </div>
        <details
          className="rounded-xl border border-slate-200 px-4 py-3"
          open={form.preset === "GENERIC"}
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            How the answer is read
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {text("sinceParam", "Query parameter: from", undefined, "start_time")}
            {text("untilParam", "Query parameter: to", undefined, "end_time")}
            <div>
              <label htmlFor="pull-queryTimeFormat" className={labelBase}>
                Window written as
              </label>
              <Select
                id="pull-queryTimeFormat"
                value={form.queryTimeFormat}
                onValueChange={(v) => set("queryTimeFormat", v as TimeFormat)}
                options={TIME_OPTIONS.filter((o) => o.value !== "AUTO")}
                disabled={!canEdit}
                aria-label="Window time format"
              />
            </div>
            {text(
              "listPath",
              "List path",
              'Where the rows are ("data", "results"); empty when the answer is the list.',
              "data",
            )}
            {text(
              "nextPath",
              "Next page path",
              "Where the next page's URL is; empty for one page.",
              "next",
            )}
            <div>
              <label htmlFor="pull-timeFormat" className={labelBase}>
                Row time written as
              </label>
              <Select
                id="pull-timeFormat"
                value={form.timeFormat}
                onValueChange={(v) => set("timeFormat", v as TimeFormat)}
                options={TIME_OPTIONS}
                disabled={!canEdit}
                aria-label="Row time format"
              />
            </div>
            {field("code", "Field: code")}
            {field("time", "Field: time")}
            {field("direction", "Field: direction")}
            {field("deviceId", "Field: device")}
            {field("externalId", "Field: row id")}
            <div>
              <label htmlFor="pull-inWords" className={labelBase}>
                Check-in words
              </label>
              <input
                id="pull-inWords"
                defaultValue={words(form.inWords)}
                key={`in-${settings.pull.inWords.join("|")}`}
                disabled={!canEdit}
                onBlur={(e) => set("inWords", parseWords(e.target.value))}
                placeholder="0, 3, 4"
                className={`mt-1.5 ${inputBase} h-10 font-mono text-xs`}
              />
              <p className={hintBase}>Comma separated; IN and OUT always count.</p>
            </div>
            <div>
              <label htmlFor="pull-outWords" className={labelBase}>
                Check-out words
              </label>
              <input
                id="pull-outWords"
                defaultValue={words(form.outWords)}
                key={`out-${settings.pull.outWords.join("|")}`}
                disabled={!canEdit}
                onBlur={(e) => set("outWords", parseWords(e.target.value))}
                placeholder="1, 2, 5"
                className={`mt-1.5 ${inputBase} h-10 font-mono text-xs`}
              />
            </div>
            <div>
              <label htmlFor="pull-everyMin" className={labelBase}>
                Read every (minutes)
              </label>
              <input
                id="pull-everyMin"
                type="number"
                min={settings.bounds.everyMin?.min ?? 1}
                max={settings.bounds.everyMin?.max ?? 60}
                value={form.everyMin}
                disabled={!canEdit}
                onChange={(e) => set("everyMin", e.target.value)}
                className={`mt-1.5 ${inputBase} h-10`}
              />
            </div>
            <div>
              <label htmlFor="pull-overlapMin" className={labelBase}>
                Going back (minutes)
              </label>
              <input
                id="pull-overlapMin"
                type="number"
                min={settings.bounds.overlapMin?.min ?? 0}
                max={settings.bounds.overlapMin?.max ?? 720}
                value={form.overlapMin}
                disabled={!canEdit}
                onChange={(e) => set("overlapMin", e.target.value)}
                className={`mt-1.5 ${inputBase} h-10`}
              />
              <p className={hintBase}>
                Each read starts this far before the last one, for devices that sync late.
              </p>
            </div>
          </div>
        </details>
        {problem && !problem.field && <p className={errorText}>{problem.message}</p>}
        {problem?.field &&
          ![
            "url",
            "authHeader",
            "username",
            "loginUrl",
            "tokenPath",
            "tokenScheme",
            "sinceParam",
            "untilParam",
            "listPath",
            "nextPath",
          ].includes(problem.field) && <p className={errorText}>{problem.message}</p>}
        {canEdit && (
          <div className="flex justify-end">
            <button type="submit" className={btnPrimary} disabled={!dirty || save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Save pull settings
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

// ---- CSV import -----------------------------------------------------------------------------

function ImportSection() {
  const importCsv = useImportPunches();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; of: number } | null>(null);
  const [result, setResult] = useState<(IngestResult & { rows: number }) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setResult(null);
  }

  async function run() {
    const parts = csvParts(text);
    if (!parts.length) {
      toast.error("Paste or choose a CSV with a header row and at least one punch.");
      return;
    }
    setResult(null);
    const total: IngestResult & { rows: number } = {
      received: 0,
      stored: 0,
      duplicates: 0,
      unmatched: 0,
      lockedOut: 0,
      daysUpdated: 0,
      ignored: [],
      rows: 0,
    };
    try {
      for (let i = 0; i < parts.length; i++) {
        setProgress({ done: i, of: parts.length });
        const r = await importCsv.mutateAsync(parts[i]);
        total.received += r.received;
        total.stored += r.stored;
        total.duplicates += r.duplicates;
        total.unmatched += r.unmatched;
        total.lockedOut += r.lockedOut;
        total.daysUpdated += r.daysUpdated;
        total.rows += r.rows;
        // Row numbers as the whole file has them.
        total.ignored.push(
          ...r.ignored.map((x) => ({ index: x.index + i * 2000, reason: x.reason })),
        );
      }
      setResult(total);
      toast.success(`Imported: ${total.stored} stored`, {
        description: `${total.duplicates} already there, ${total.unmatched} with a code nobody has, ${total.ignored.length} ignored.`,
      });
    } catch (err) {
      toast.error("The import stopped", { description: errorMessage(err) });
    } finally {
      setProgress(null);
    }
  }

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="import-title">
      <h2 id="import-title" className="flex items-center gap-2 text-base font-bold text-slate-900">
        <FileUp className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
        Import a CSV export
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        For a backfill, or a device with no API. A header row, then{" "}
        <code className="font-mono text-xs">code,time</code> and optionally{" "}
        <code className="font-mono text-xs">direction,deviceId,externalId</code>; common BioTime and
        eSSL column names are recognised. A long file is sent in parts of 2,000 rows.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"code,time,direction,deviceId\nE1042,2026-11-04 09:02:11,IN,GATE-1"}
          className={`${textareaBase} font-mono text-xs`}
          aria-label="CSV text"
        />
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.txt"
            className="sr-only"
            onChange={(e) => void pick(e.target.files?.[0])}
            aria-label="Choose a CSV file"
          />
          <button
            type="button"
            className={`${btnSecondary} w-full`}
            onClick={() => fileRef.current?.click()}
          >
            <Download className="h-4 w-4" aria-hidden />
            {fileName ? `File: ${fileName}` : "Choose a file"}
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            onClick={() => void run()}
            disabled={importCsv.isPending || !text.trim()}
          >
            {importCsv.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {progress ? `Sending part ${progress.done + 1} of ${progress.of}…` : "Import"}
          </button>
        </div>
      </div>
      {result && (
        <div
          className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700"
          aria-live="polite"
        >
          <p className="font-semibold text-slate-900">
            {result.rows} rows: {result.stored} stored, {result.duplicates} already there,{" "}
            {result.unmatched} with a code nobody has, {result.lockedOut} in a locked month,{" "}
            {result.daysUpdated} days worked out again.
          </p>
          {result.ignored.length > 0 && (
            <ul className="mt-1.5 max-h-40 overflow-y-auto text-xs text-rose-700">
              {result.ignored.slice(0, 50).map((x) => (
                <li key={x.index}>
                  Row {x.index}: {x.reason}
                </li>
              ))}
              {result.ignored.length > 50 && <li>…and {result.ignored.length - 50} more</li>}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Integration (3.5): the status, the switch behind the payroll pause (3.6), keys and the
 * push, the pull adapter, a CSV import. 4.0: the organisation's own; the switch, keys,
 * changes, tests, pulls and imports are its admin's (the Super Manager sees the status, the
 * switch and the pull settings, read only).
 */
export function IntegrationPanel({ canEdit }: { canEdit: boolean }) {
  const status = useAttendanceStatus();
  const settings = useBiometricSettings();
  return (
    <div className="space-y-5">
      <StatusStrip />
      {settings.data && <IntegrationSwitchSection settings={settings.data} canEdit={canEdit} />}
      <PushSection
        canEdit={canEdit}
        pushPath={status.data?.pushPath ?? "/api/v1/biometric/punches"}
      />
      {settings.isLoading ? (
        <LoadingState label="Loading the pull settings…" />
      ) : settings.isError || !settings.data ? (
        <ErrorState message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />
      ) : (
        <PullSection settings={settings.data} canEdit={canEdit} />
      )}
      {canEdit && <ImportSection />}
    </div>
  );
}
