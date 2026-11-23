"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Ban, Loader2, Lock, Plus } from "lucide-react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
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
  inputInvalid,
  labelBase,
  textareaBase,
} from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { addDaysToKey, dateKeyOf, formatDay, todayKey } from "@/lib/time/businessTime";
import {
  useAddPunch,
  useAttendancePeople,
  usePunches,
  useVoidPunch,
} from "@/features/attendance/hooks/useAttendance";
import {
  dayTime,
  localPunchText,
  localPunchTime,
  PUNCH_SOURCE_LABEL,
} from "@/features/attendance/lib/format";
import type { PunchView } from "@/features/attendance/types";

const NOTE_MIN = 3;
const NOTE_MAX = 300;

/** The business day of a punch ("13 Oct"), not the UTC date its ISO string starts with. */
function punchDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateKeyOf(d);
}

/**
 * A missing punch added by hand, with a reason (4.0: the organisation's admin or the
 * Super Manager), for someone of the organisation in view on biometric.
 */
export function AddPunchDialog({
  open,
  onClose,
  presetUserId,
}: {
  open: boolean;
  onClose: () => void;
  presetUserId?: string;
}) {
  const people = useAttendancePeople({ source: "BIOMETRIC" }, open);
  const add = useAddPunch();
  const [userId, setUserId] = useState(presetUserId ?? "");
  const [time, setTime] = useState("");
  const [direction, setDirection] = useState<"" | "IN" | "OUT">("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUserId(presetUserId ?? "");
    setTime("");
    setDirection("");
    setNote("");
    setTouched(false);
    setProblem(null);
    add.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetUserId]);

  const options = useMemo(
    () =>
      (people.data ?? []).map((p) => ({
        value: p.userId,
        label: p.name,
        // A punch needs the person's ID (the API answers NO_BIOMETRIC_CODE without one).
        description: p.biometricCode
          ? `ID ${p.biometricCode}`
          : "No biometric ID yet: the organisation admin gives one on People",
        disabled: !p.biometricCode,
      })),
    [people.data],
  );
  const noteProblem =
    note.trim().length < NOTE_MIN
      ? `Say why, at least ${NOTE_MIN} characters.`
      : note.trim().length > NOTE_MAX
        ? `Keep it under ${NOTE_MAX} characters.`
        : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!userId || !time || noteProblem) return;
    try {
      const saved = await add.mutateAsync({
        userId,
        time: localPunchTime(time),
        direction: direction || undefined,
        note,
      });
      toast.success(`Punch added: ${saved.userName}, ${dayTime(saved.punchedAt)}`, {
        description: "Their day has been worked out again.",
      });
      onClose();
    } catch (err) {
      setProblem(errorMessage(err) ?? "Couldn't add the punch.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a punch by hand"
      description="For a device that was down or a forgotten check-out. It stays in the log with your name and the reason."
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div>
          <label htmlFor="punch-person" className={labelBase}>
            Who
          </label>
          <Select
            id="punch-person"
            value={userId}
            onValueChange={(v) => {
              setUserId(v);
              setProblem(null);
            }}
            options={options}
            placeholder={people.isLoading ? "Loading…" : "Pick a biometric person"}
            searchable
            searchPlaceholder="Search people…"
            invalid={touched && !userId}
            aria-label="Who"
          />
          {touched && !userId && <p className={errorText}>Pick a person.</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label htmlFor="punch-time" className={labelBase}>
              When (business time)
            </label>
            <input
              id="punch-time"
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`mt-1.5 ${inputBase} ${touched && !time ? inputInvalid : ""}`}
            />
            {touched && !time ? (
              <p className={errorText}>Pick the time.</p>
            ) : (
              localPunchText(time) && <p className={hintBase}>{localPunchText(time)}</p>
            )}
          </div>
          <div>
            <span className={labelBase}>Direction</span>
            <div className="mt-1.5">
              <SegmentedTabs
                label="Direction"
                size="sm"
                value={direction}
                onChange={setDirection}
                tabs={[
                  { value: "", label: "Not said" },
                  { value: "IN", label: "In" },
                  { value: "OUT", label: "Out" },
                ]}
              />
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="punch-note" className={labelBase}>
            Why
          </label>
          <textarea
            id="punch-note"
            rows={2}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => {
              setNote(e.target.value);
              setProblem(null);
            }}
            className={`mt-1.5 ${textareaBase} ${touched && noteProblem ? inputInvalid : ""}`}
            placeholder="Forgot to punch out; confirmed by the manager"
          />
          <p className={problem || (touched && noteProblem) ? errorText : hintBase}>
            {problem ??
              (touched && noteProblem) ??
              "Not in a month locked for payroll, and not in the future."}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={add.isPending}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={add.isPending}>
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Add punch
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VoidPunchDialog({ punch, onClose }: { punch: PunchView | null; onClose: () => void }) {
  const voidIt = useVoidPunch();
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    setReason("");
    setProblem(null);
  }, [punch?.id]);
  if (!punch) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < NOTE_MIN) {
      setProblem(`Say why, at least ${NOTE_MIN} characters.`);
      return;
    }
    try {
      await voidIt.mutateAsync({ id: punch!.id, reason });
      toast.success("Punch voided", {
        description: "It stays in the log, struck through; the day has been worked out again.",
      });
      onClose();
    } catch (err) {
      setProblem(errorMessage(err) ?? "Couldn't void it.");
    }
  }

  return (
    <Modal open={!!punch} onClose={onClose} title="Void this punch?" className="max-w-md">
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
          <p className="font-semibold text-slate-900">
            {punch.userName ?? `Code ${punch.code}`}, {dayTime(punch.punchedAt)}
            {punch.direction ? ` (${punch.direction === "IN" ? "in" : "out"})` : ""}
          </p>
          <p className="text-slate-600">
            {PUNCH_SOURCE_LABEL[punch.source]}
            {punch.deviceId ? ` · ${punch.deviceId}` : ""}
          </p>
        </div>
        <div>
          <label htmlFor="void-reason" className={labelBase}>
            Why
          </label>
          <textarea
            id="void-reason"
            rows={2}
            value={reason}
            maxLength={NOTE_MAX}
            onChange={(e) => setReason(e.target.value)}
            className={`mt-1.5 ${textareaBase}`}
            placeholder="Punched twice by mistake"
            data-autofocus
          />
          <p className={problem ? errorText : hintBase}>
            {problem ??
              "A voided punch is never deleted: the log keeps it, struck through, with your name."}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={onClose}
            disabled={voidIt.isPending}
          >
            Keep it
          </button>
          <button
            type="submit"
            className={`${btnPrimary} bg-rose-600 hover:bg-rose-700`}
            disabled={voidIt.isPending}
          >
            {voidIt.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Void punch
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * The organisation's punch log, newest first, with filters; punches by hand and voids
 * (4.0: the organisation's admin and the Super Manager).
 */
export function PunchesPanel({
  canWrite,
  initialCode,
}: {
  canWrite: boolean;
  initialCode?: string;
}) {
  const today = todayKey();
  const [from, setFrom] = useState(addDaysToKey(today, -6));
  const [to, setTo] = useState(today);
  const [code, setCode] = useState(initialCode ?? "");
  const [device, setDevice] = useState("");
  const [unmatched, setUnmatched] = useState(false);
  const [voided, setVoided] = useState(false);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<PunchView | null>(null);
  const query = usePunches({
    from,
    to,
    code: code.trim() || undefined,
    deviceId: device.trim() || undefined,
    unmatched,
    includeVoided: voided,
    limit: 500,
  });
  const items = query.data?.items ?? [];

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="punches-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="punches-title" className="text-base font-bold text-slate-900">
            Punch log
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Every punch the device sent, pulled, imported or added by hand, newest first. Nothing
            here is ever deleted.
          </p>
        </div>
        {canWrite && (
          <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add punch
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <label className="block text-xs font-semibold text-slate-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`${inputBase} mt-1 h-10`}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          To
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className={`${inputBase} mt-1 h-10`}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Biometric ID
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Any"
            className={`${inputBase} mt-1 h-10`}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          Device
          <input
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            placeholder="Any"
            className={`${inputBase} mt-1 h-10`}
          />
        </label>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className={checkboxBase}
            checked={unmatched}
            onChange={(e) => setUnmatched(e.target.checked)}
          />
          Codes nobody has
        </label>
        <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className={checkboxBase}
            checked={voided}
            onChange={(e) => setVoided(e.target.checked)}
          />
          Show voided
        </label>
      </div>
      <div className="mt-3">
        {query.isLoading ? (
          <LoadingState label="Loading punches…" />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No punches match.</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500">
              {query.data?.total ?? items.length} {query.data?.total === 1 ? "punch" : "punches"}
              {(query.data?.total ?? 0) > items.length ? `, the newest ${items.length} shown` : ""}
            </p>
            {/* Phone: one card a punch. */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((p) => (
                <li key={p.id} className={`py-3 ${p.voided ? "text-slate-400" : "text-slate-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`font-semibold tabular-nums ${p.voided ? "line-through" : "text-slate-900"}`}
                      >
                        {dayTime(p.punchedAt)}
                        {p.direction === "IN" ? " · In" : p.direction === "OUT" ? " · Out" : ""}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
                        {p.userName && (
                          <PersonAvatar
                            name={p.userName}
                            avatarId={p.avatarId}
                            userId={p.userId ?? undefined}
                            size={20}
                          />
                        )}
                        {p.userName ?? <Chip tone="warning">Nobody has this ID</Chip>}
                        <span className="font-mono text-xs">{p.code}</span>
                        {p.lockedOut && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <Lock className="h-3 w-3" aria-hidden /> locked month
                          </span>
                        )}
                      </p>
                    </div>
                    {canWrite && !p.voided && (
                      <button
                        type="button"
                        className={`${btnSmall} border-rose-200 text-rose-600 hover:bg-rose-50`}
                        onClick={() => setVoiding(p)}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden />
                        Void
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {PUNCH_SOURCE_LABEL[p.source]}
                    {p.addedBy ? ` by ${p.addedBy}` : ""}
                    {p.deviceId ? ` · ${p.deviceId}` : ""}
                    {p.dayKey !== punchDay(p.punchedAt) ? ` · day ${formatDay(p.dayKey)}` : ""}
                  </p>
                  {p.note && <p className="mt-0.5 text-xs text-slate-500">{p.note}</p>}
                  {p.voided && (
                    <p className="mt-0.5 text-xs text-rose-600">
                      Voided by {p.voidedBy ?? "someone"}: {p.voidReason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="whitespace-nowrap border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2.5">When</th>
                    <th className="px-3 py-2.5">Person</th>
                    <th className="px-3 py-2.5">ID</th>
                    <th className="px-3 py-2.5">Direction</th>
                    <th className="px-3 py-2.5">Device</th>
                    <th className="px-3 py-2.5">How it came</th>
                    <th className="px-3 py-2.5">Day</th>
                    {canWrite && (
                      <th className="px-3 py-2.5 text-right">
                        <span className="sr-only">Void</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <tr
                      key={p.id}
                      className={`align-top ${p.voided ? "text-slate-400 line-through" : "text-slate-700"}`}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums">
                        {dayTime(p.punchedAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        {p.userName && (
                          <PersonAvatar
                            name={p.userName}
                            avatarId={p.avatarId}
                            userId={p.userId ?? undefined}
                            size={20}
                            className="mr-1.5 align-middle"
                          />
                        )}
                        {p.userName ?? <Chip tone="warning">Nobody has this ID</Chip>}
                        {p.lockedOut && (
                          <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-amber-700 no-underline">
                            <Lock className="h-3 w-3" aria-hidden /> locked month
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono">{p.code}</td>
                      <td className="px-3 py-2.5">
                        {p.direction === "IN" ? (
                          "In"
                        ) : p.direction === "OUT" ? (
                          "Out"
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {p.deviceId || <span className="text-slate-400">–</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {PUNCH_SOURCE_LABEL[p.source]}
                        {p.addedBy && (
                          <span className="block text-xs text-slate-500">{p.addedBy}</span>
                        )}
                        {p.note && (
                          <span className="block max-w-[16rem] text-xs text-slate-500">
                            {p.note}
                          </span>
                        )}
                        {p.voided && (
                          <span className="block max-w-[16rem] text-xs text-rose-600 no-underline">
                            Voided by {p.voidedBy ?? "someone"}: {p.voidReason}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">{formatDay(p.dayKey)}</td>
                      {canWrite && (
                        <td className="px-3 py-2.5 text-right">
                          {!p.voided && (
                            <button
                              type="button"
                              className={`${btnSmall} border-rose-200 text-rose-600 hover:bg-rose-50`}
                              onClick={() => setVoiding(p)}
                            >
                              <Ban className="h-3.5 w-3.5" aria-hidden />
                              Void
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <AddPunchDialog open={adding} onClose={() => setAdding(false)} />
      <VoidPunchDialog punch={voiding} onClose={() => setVoiding(null)} />
    </section>
  );
}
