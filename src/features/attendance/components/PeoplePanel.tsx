"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Fingerprint, Loader2, Monitor, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnSmall,
  cardBase,
  checkboxBase,
  errorText,
  hintBase,
  inputBase,
  inputInvalid,
} from "@/components/ui/classes";
import { errorCode, errorDetails, errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatDay } from "@/lib/time/businessTime";
import {
  useAttendancePeople,
  useSetAttendancePeople,
} from "@/features/attendance/hooks/useAttendance";
import { CODE_RE, sinceText } from "@/features/attendance/lib/format";
import type { AttendanceSource, PersonAttendanceView } from "@/features/attendance/types";

export function SourceChip({ source }: { source: AttendanceSource }) {
  return source === "BIOMETRIC" ? (
    <Chip tone="brand" icon={Fingerprint}>
      Biometric
    </Chip>
  ) : (
    <Chip tone="neutral" icon={Monitor}>
      Agent
    </Chip>
  );
}

interface RowDraft {
  userId: string;
  name: string;
  source: AttendanceSource;
  code: string;
}

/**
 * Set how people check in (3.5; 4.0: the organisation's admin): the source and the
 * biometric ID of each, one or many at once. Someone on biometric needs an ID; an ID
 * belongs to one person of the organisation.
 */
export function SetAttendanceDialog({
  people,
  presetCode,
  onClose,
}: {
  people: PersonAttendanceView[] | null;
  /** From the Unmatched tab: the code to give the one person picked. */
  presetCode?: string;
  onClose: () => void;
}) {
  const save = useSetAttendancePeople();
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [all, setAll] = useState<AttendanceSource | "">("");
  const [problem, setProblem] = useState<{ index?: number; message: string } | null>(null);

  useEffect(() => {
    if (!people) return;
    setRows(
      people.map((p) => ({
        userId: p.userId,
        name: p.name,
        source: p.attendanceSource,
        code: presetCode ?? p.biometricCode ?? "",
      })),
    );
    setAll("");
    setProblem(null);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, presetCode]);

  if (!people) return null;

  function setRow(i: number, patch: Partial<RowDraft>) {
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
    setProblem(null);
  }

  function setEveryone(source: AttendanceSource) {
    setAll(source);
    setRows((rs) => rs.map((r) => ({ ...r, source })));
    setProblem(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const bad = rows.findIndex(
      (r) =>
        (r.source === "BIOMETRIC" && !r.code.trim()) ||
        (r.code.trim() && !CODE_RE.test(r.code.trim())),
    );
    if (bad >= 0) {
      setProblem({
        index: bad,
        message: rows[bad].code.trim()
          ? "A biometric ID is 1 to 64 letters or digits."
          : `${rows[bad].name} checks in by biometric: give their biometric ID.`,
      });
      return;
    }
    try {
      const res = await save.mutateAsync(
        rows.map((r) => ({
          userId: r.userId,
          attendanceSource: r.source,
          biometricCode: r.code.trim() || null,
        })),
      );
      toast.success(
        `Attendance set for ${res.updated.length} ${res.updated.length === 1 ? "person" : "people"}`,
        {
          description: res.rematched
            ? `${res.rematched} earlier ${res.rematched === 1 ? "punch" : "punches"} matched to them.`
            : undefined,
        },
      );
      onClose();
    } catch (err) {
      const field = errorDetails(err)?.field as string | undefined;
      const m = field ? /^items\.(\d+)\./.exec(field) : null;
      const code = errorDetails(err)?.code as string | undefined;
      const index = m
        ? Number(m[1])
        : errorCode(err) === "BIOMETRIC_CODE_TAKEN" && code
          ? rows.findIndex(
              (r) =>
                r.code
                  .trim()
                  .toUpperCase()
                  .replace(/\s+/g, "")
                  .replace(/^0+(?=\d)/, "") === code,
            )
          : undefined;
      setProblem({
        index: index !== undefined && index >= 0 ? index : undefined,
        message: errorMessage(err) ?? "Couldn't save.",
      });
    }
  }

  return (
    <Modal
      open={!!people}
      onClose={onClose}
      title={
        people.length === 1
          ? `${people[0].name}: how they check in`
          : `How ${people.length} people check in`
      }
      description="Agent: the desktop app tracks the day. Biometric: the day comes from the device, by the ID it knows the person by. A change applies from today."
      className="max-w-2xl"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-5 py-5 sm:px-6">
        {people.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Everyone:</span>
            <SegmentedTabs
              label="Set everyone"
              size="sm"
              value={all}
              onChange={(v) => v && setEveryone(v as AttendanceSource)}
              tabs={[
                { value: "AGENT", label: "Agent" },
                { value: "BIOMETRIC", label: "Biometric" },
              ]}
            />
          </div>
        )}
        <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {rows.map((r, i) => (
            <li
              key={r.userId}
              className="grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_11rem] sm:items-center"
            >
              <span className="truncate text-sm font-semibold text-slate-900">{r.name}</span>
              <SegmentedTabs
                label={`${r.name}: source`}
                size="sm"
                value={r.source}
                onChange={(v) => setRow(i, { source: v as AttendanceSource })}
                tabs={[
                  { value: "AGENT", label: "Agent" },
                  { value: "BIOMETRIC", label: "Biometric" },
                ]}
              />
              <div>
                <input
                  value={r.code}
                  onChange={(e) => setRow(i, { code: e.target.value })}
                  placeholder="Biometric ID"
                  aria-label={`${r.name}: biometric ID`}
                  className={`${inputBase} h-10 ${problem?.index === i ? inputInvalid : ""}`}
                />
                {problem?.index === i && <p className={errorText}>{problem.message}</p>}
              </div>
            </li>
          ))}
        </ul>
        <p className={hintBase}>
          The ID is the code the device sends for the person (its employee code), unique within this
          organisation. Case and spaces do not matter; an all-digit code matches with or without
          leading zeros.
        </p>
        {problem && problem.index === undefined && <p className={errorText}>{problem.message}</p>}
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

/** A person's department, as GET /biometric/people names it. */
function departmentText(p: PersonAttendanceView): string {
  return p.department?.trim() || "No department";
}

/**
 * Everyone active in the organisation with how they check in, their ID and their
 * last punch. 4.0: one organisation at a time, so no organisation chip.
 */
export function PeoplePanel({ canEdit }: { canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"ALL" | AttendanceSource>("ALL");
  const debounced = useDebouncedValue(search.trim(), 300);
  const query = useAttendancePeople({
    search: debounced || undefined,
    source: source === "ALL" ? undefined : source,
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PersonAttendanceView[] | null>(null);
  const picked = rows.filter((r) => chosen.has(r.userId));
  const allPicked = rows.length > 0 && rows.every((r) => chosen.has(r.userId));

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="att-people-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="att-people-title" className="text-base font-bold text-slate-900">
            Who checks in how
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Agent: the desktop app tracks the day. Biometric: the day runs from the first punch to
            the last; the desktop app, if installed, does not start it.
            {canEdit ? " Pick people to set many at once." : ""}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedTabs
            label="Which people"
            size="sm"
            value={source}
            onChange={setSource}
            tabs={[
              { value: "ALL", label: "Everyone" },
              { value: "AGENT", label: "Agent" },
              { value: "BIOMETRIC", label: "Biometric" },
            ]}
          />
          <label className="relative block w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or ID…"
              aria-label="Search people"
              className={`${inputBase} pl-9`}
            />
          </label>
        </div>
      </div>
      {canEdit && picked.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(34,34,204,0.2)] bg-[rgba(34,34,204,0.04)] px-3.5 py-2.5 text-sm">
          <span className="font-semibold text-slate-900">
            {picked.length} {picked.length === 1 ? "person" : "people"} picked
          </span>
          <button type="button" className={btnSmall} onClick={() => setEditing(picked)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Set how they check in
          </button>
          <button type="button" className={btnGhost} onClick={() => setChosen(new Set())}>
            Clear
          </button>
        </div>
      )}
      <div className="mt-3">
        {query.isLoading ? (
          <LoadingState label="Loading people…" />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nobody matches.</p>
        ) : (
          <>
            {/* Phone: one card a person. */}
            <div className="md:hidden">
              {canEdit && (
                <label className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className={checkboxBase}
                    checked={allPicked}
                    onChange={() =>
                      setChosen(allPicked ? new Set() : new Set(rows.map((r) => r.userId)))
                    }
                  />
                  Pick everyone listed
                </label>
              )}
              <ul className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <li
                    key={p.userId}
                    className={`flex gap-3 py-3 ${chosen.has(p.userId) ? "bg-[rgba(34,34,204,0.03)]" : ""}`}
                  >
                    {canEdit && (
                      <input
                        type="checkbox"
                        className={`${checkboxBase} mt-1`}
                        checked={chosen.has(p.userId)}
                        onChange={(e) =>
                          setChosen((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(p.userId);
                            else next.delete(p.userId);
                            return next;
                          })
                        }
                        aria-label={`Pick ${p.name}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{p.name}</p>
                          <p className="truncate text-xs text-slate-500">{departmentText(p)}</p>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            className={btnSmall}
                            onClick={() => setEditing([p])}
                            aria-label={`Change how ${p.name} checks in`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Change
                          </button>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <SourceChip source={p.attendanceSource} />
                        {p.attendanceSource === "BIOMETRIC" && p.attendanceSourceFrom && (
                          <span>since {formatDay(p.attendanceSourceFrom)}</span>
                        )}
                        <span>
                          ID{" "}
                          {p.biometricCode ? (
                            <span className="font-mono text-slate-800">{p.biometricCode}</span>
                          ) : p.attendanceSource === "BIOMETRIC" ? (
                            <span className="font-semibold text-amber-700">missing</span>
                          ) : (
                            "none"
                          )}
                        </span>
                        <span>Last punch: {sinceText(p.lastPunchAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="whitespace-nowrap border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {canEdit && (
                      <th className="w-8 px-2 py-2.5">
                        <input
                          type="checkbox"
                          className={checkboxBase}
                          checked={allPicked}
                          onChange={() =>
                            setChosen(allPicked ? new Set() : new Set(rows.map((r) => r.userId)))
                          }
                          aria-label="Pick everyone listed"
                        />
                      </th>
                    )}
                    <th className="px-3 py-2.5">Person</th>
                    <th className="px-3 py-2.5">Checks in by</th>
                    <th className="px-3 py-2.5">Biometric ID</th>
                    <th className="px-3 py-2.5">Last punch</th>
                    {canEdit && (
                      <th className="px-3 py-2.5 text-right">
                        <span className="sr-only">Change</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr
                      key={p.userId}
                      className={`align-top ${chosen.has(p.userId) ? "bg-[rgba(34,34,204,0.03)]" : ""}`}
                    >
                      {canEdit && (
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            className={checkboxBase}
                            checked={chosen.has(p.userId)}
                            onChange={(e) =>
                              setChosen((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(p.userId);
                                else next.delete(p.userId);
                                return next;
                              })
                            }
                            aria-label={`Pick ${p.name}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{departmentText(p)}</p>
                      </td>
                      <td className="px-3 py-3">
                        <SourceChip source={p.attendanceSource} />
                        {p.attendanceSource === "BIOMETRIC" && p.attendanceSourceFrom && (
                          <span className="mt-1 block text-xs text-slate-500">
                            since {formatDay(p.attendanceSourceFrom)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-700">
                        {p.biometricCode ?? (
                          <span className="font-sans text-slate-400">
                            {p.attendanceSource === "BIOMETRIC" ? "Missing" : "–"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                        {sinceText(p.lastPunchAt)}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            className={btnSmall}
                            onClick={() => setEditing([p])}
                            aria-label={`Change how ${p.name} checks in`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Change
                          </button>
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
      <SetAttendanceDialog
        people={editing}
        onClose={() => {
          setEditing(null);
          setChosen(new Set());
        }}
      />
    </section>
  );
}
