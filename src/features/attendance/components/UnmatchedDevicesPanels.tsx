"use client";

import { useMemo, useState } from "react";
import { HardDrive, UserPlus } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { errorMessage } from "@/lib/api";
import {
  useAttendancePeople,
  useDevices,
  useUnmatchedCodes,
} from "@/features/attendance/hooks/useAttendance";
import { dayTime, sinceText } from "@/features/attendance/lib/format";
import type { PersonAttendanceView, UnmatchedCodeView } from "@/features/attendance/types";

import { SetAttendanceDialog } from "./PeoplePanel";
import { Hint, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Give a code nobody has to a person of the organisation (4.0: its admin): pick them,
 * then set their source and ID.
 */
function GiveCodeDialog({
  code,
  onClose,
}: {
  code: UnmatchedCodeView | null;
  onClose: () => void;
}) {
  const people = useAttendancePeople({}, !!code);
  const [userId, setUserId] = useState("");
  const [editing, setEditing] = useState<PersonAttendanceView[] | null>(null);
  const options = useMemo(
    () =>
      (people.data ?? []).map((p) => ({
        value: p.userId,
        label: p.name,
        description:
          [p.department, p.biometricCode ? `has ID ${p.biometricCode}` : null]
            .filter(Boolean)
            .join(" · ") || undefined,
      })),
    [people.data],
  );
  if (!code) return null;
  const chosen = (people.data ?? []).find((p) => p.userId === userId) ?? null;
  return (
    <>
      <Modal
        open={!!code && !editing}
        onClose={onClose}
        title={`Who is ${code.code}?`}
        description="Every punch with this ID is matched to them, outside months locked for payroll, and their days are worked out again."
        className="max-w-md"
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-sm text-soft">
            {code.punches} {code.punches === 1 ? "punch" : "punches"} from{" "}
            {code.devices.filter(Boolean).join(", ") || "an unnamed device"},{" "}
            {dayTime(code.firstAt)} to {dayTime(code.lastAt)}.
          </p>
          <div>
            <Label htmlFor="give-person">Person</Label>
            <Select
              id="give-person"
              value={userId}
              onValueChange={setUserId}
              options={options}
              placeholder={people.isLoading ? "Loading…" : "Pick a person"}
              searchable
              searchPlaceholder="Search people…"
              aria-label="Person"
            />
            <Hint>
              Next you confirm whether they check in by biometric from today, or stay on the agent
              with the ID kept for the record.
            </Hint>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={!chosen}
              onClick={() => chosen && setEditing([{ ...chosen, biometricCode: code.code }])}
            >
              Next
            </Button>
          </div>
        </div>
      </Modal>
      <SetAttendanceDialog
        people={editing}
        presetCode={code.code}
        onClose={() => {
          setEditing(null);
          onClose();
        }}
      />
    </>
  );
}

/** Codes the organisation's devices sent that nobody has, with how many punches and when. */
export function UnmatchedPanel({ canEdit }: { canEdit: boolean }) {
  const query = useUnmatchedCodes();
  const [giving, setGiving] = useState<UnmatchedCodeView | null>(null);
  const rows = query.data ?? [];
  return (
    <Card as="section" className="px-4 py-4 sm:px-6" aria-labelledby="unmatched-title">
      <h2 id="unmatched-title" className="text-base font-bold text-primary">
        Codes nobody has
      </h2>
      <p className="mt-0.5 text-sm text-quiet">
        Punches kept with an ID nobody in this organisation holds.{" "}
        {canEdit
          ? "Give the ID to a person on the People tab (or here) and every punch with it is matched."
          : "Once the organisation admin gives the ID to a person, every punch with it is matched."}
      </p>
      <div className="mt-3">
        {query.isLoading ? (
          <LoadingState label="Loading…" />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-quiet">Every punch has its person.</p>
        ) : (
          <ul className="divide-y divide-divider overflow-hidden rounded-xl border border-card">
            {rows.map((u) => (
              <li
                key={u.codeKey}
                className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono font-semibold text-primary">{u.code}</span>
                  <span className="block text-xs text-quiet">
                    {u.punches} {u.punches === 1 ? "punch" : "punches"} ·{" "}
                    {u.devices.filter(Boolean).join(", ") || "unnamed device"} ·{" "}
                    {dayTime(u.firstAt)} to {dayTime(u.lastAt)}
                  </span>
                </span>
                {canEdit && (
                  <Button variant="small" type="button" onClick={() => setGiving(u)}>
                    <UserPlus className="h-3.5 w-3.5" aria-hidden />
                    Give to a person
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <GiveCodeDialog code={giving} onClose={() => setGiving(null)} />
    </Card>
  );
}

/** Devices seen, with punches today and when each last sent. */
export function DevicesPanel() {
  const query = useDevices();
  const rows = query.data ?? [];
  return (
    <Card as="section" className="px-4 py-4 sm:px-6" aria-labelledby="devices-title">
      <h2 id="devices-title" className="text-base font-bold text-primary">
        Devices
      </h2>
      <p className="mt-0.5 text-sm text-quiet">
        Every device id this organisation&apos;s punches named, with when each last reached RX
        Vision. A device that stops sending shows here first.
      </p>
      <div className="mt-3">
        {query.isLoading ? (
          <LoadingState label="Loading devices…" />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error)}
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-quiet">No punches yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-divider md:hidden">
              {rows.map((d) => (
                <li key={d.deviceId} className="py-3 text-sm text-body">
                  <p className="flex items-center gap-1.5 font-semibold text-primary">
                    <HardDrive className="h-4 w-4 text-quiet" aria-hidden />
                    {d.deviceId}
                  </p>
                  <p className="mt-0.5 text-xs text-quiet">
                    {d.punchesToday} today · {d.punches} in all · last punch{" "}
                    {dayTime(d.lastPunchAt)} · last received {sinceText(d.lastReceivedAt)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="whitespace-nowrap border-b border-divider text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
                    <th className="px-3 py-2.5">Device</th>
                    <th className="px-3 py-2.5">Punches today</th>
                    <th className="px-3 py-2.5">Punches in all</th>
                    <th className="px-3 py-2.5">Last punch</th>
                    <th className="px-3 py-2.5">Last received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {rows.map((d) => (
                    <tr key={d.deviceId} className="text-body">
                      <td className="px-3 py-2.5 font-semibold text-primary">
                        <span className="flex items-center gap-1.5">
                          <HardDrive className="h-4 w-4 text-quiet" aria-hidden />
                          {d.deviceId}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{d.punchesToday}</td>
                      <td className="px-3 py-2.5 tabular-nums">{d.punches}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{dayTime(d.lastPunchAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {sinceText(d.lastReceivedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
