"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Eye, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { cardBase } from "@/components/ui/classes";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input } from "@/components/ui/Field";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  PEOPLE_PAGE,
  departmentIdOf,
  nameOf,
  useCalendarPeople,
  useClearWorkWeek,
  useSaveWorkWeek,
} from "@/features/calendar/hooks/useCalendar";
import {
  CALENDAR_SOURCE_LABEL,
  orgWeekText,
  personSource,
  workWeekInputOf,
  workWeekText,
} from "@/features/calendar/lib/calendar";
import type { CalendarSource, CalendarView, WorkWeekInput } from "@/features/calendar/types";

import { PersonYear } from "./PersonYear";
import { WorkWeekForm } from "./WorkWeekForm";

const SOURCE_TONE: Record<CalendarSource, ChipTone> = {
  OVERRIDE: "violet",
  PERSON: "brand",
  DEPARTMENT: "info",
  ORGANISATION: "neutral",
};

interface Row {
  id: string;
  name: string;
  /** 3.6 */
  avatarId: string | null;
  department: string | null;
  source: Exclude<CalendarSource, "OVERRIDE">;
  summary: string;
  own: boolean;
}

/** "Asha, Ravi and 3 more". */
function namesText(names: string[], max = 6): string {
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown} and ${names.length - max} more` : shown;
}

function plural(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

/**
 * 3.5 People: what decides each person's working days, and a week of their own
 * where one person differs from their department. Admins pick people to set one
 * week for all of them at once; anyone here can preview a person's year.
 */
export function PeopleWeeks({
  view,
  editable,
  departmentNames,
}: {
  view: CalendarView;
  editable: boolean;
  departmentNames: Map<string, string>;
}) {
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);
  const query = useCalendarPeople(q);
  // Picks survive a new search: id -> name.
  const [chosen, setChosen] = useState<Map<string, string>>(new Map());
  const [setting, setSetting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [previewing, setPreviewing] = useState<{ id: string; name: string } | null>(null);
  const save = useSaveWorkWeek();
  const clear = useClearWorkWeek();
  const ownIds = useMemo(() => new Set(view.people.map((p) => p.id)), [view.people]);
  const orgWeek = orgWeekText(view);

  const rows = useMemo<Row[]>(
    () =>
      (query.data?.users ?? []).map((u) => {
        const departmentId = departmentIdOf(u);
        const { source, week } = personSource({ id: u.id, departmentId }, view);
        const deptName =
          (departmentId && departmentNames.get(departmentId)) ||
          (typeof u.department === "string" ? u.department : u.department?.name) ||
          u.departmentRef?.name ||
          null;
        return {
          id: u.id,
          name: nameOf(u),
          avatarId: u.avatarId ?? null,
          department: deptName,
          source,
          summary: week ? workWeekText(week) : orgWeek,
          own: source === "PERSON",
        };
      }),
    [query.data, view, departmentNames, orgWeek],
  );
  const picked = [...chosen.entries()].map(([id, name]) => ({ id, name }));
  const pickedOwn = picked.filter((p) => ownIds.has(p.id));
  const allPicked = rows.length > 0 && rows.every((r) => chosen.has(r.id));
  const total = query.data?.total ?? 0;

  function toggle(row: Row, on: boolean) {
    setChosen((prev) => {
      const next = new Map(prev);
      if (on) next.set(row.id, row.name);
      else next.delete(row.id);
      return next;
    });
  }

  function toggleAll() {
    setChosen((prev) => {
      const next = new Map(prev);
      for (const r of rows) {
        if (allPicked) next.delete(r.id);
        else next.set(r.id, r.name);
      }
      return next;
    });
  }

  async function submit(input: WorkWeekInput) {
    const ids = picked.map((p) => p.id);
    try {
      await save.mutateAsync({ scope: "people", ids, input });
      toast.success(`Working week set for ${plural(ids.length)}`, {
        description: "Their own week now decides their working days.",
      });
      setSetting(false);
      setChosen(new Map());
    } catch (err) {
      toast.error("Couldn't save the working week", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  async function confirmClear() {
    const ids = pickedOwn.map((p) => p.id);
    try {
      await clear.mutateAsync({ scope: "people", ids });
      toast.success(`Own week removed for ${plural(ids.length)}`, {
        description: "Their department's week, or the organisation's, decides again.",
      });
      setClearing(false);
      setChosen(new Map());
    } catch (err) {
      toast.error("Couldn't remove it", { description: errorMessage(err) ?? "Please try again." });
    }
  }

  const yearButton = (r: Row) => (
    <Button
      variant="small"
      type="button"
      onClick={() => setPreviewing({ id: r.id, name: r.name })}
      aria-label={`Preview ${r.name}'s year`}
    >
      <Eye className="h-3.5 w-3.5" aria-hidden />
      Year
    </Button>
  );

  const sourceChip = (r: Row) => (
    <Chip tone={SOURCE_TONE[r.source]} wrap>
      {CALENDAR_SOURCE_LABEL[r.source]}
    </Chip>
  );

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="people-weeks-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 md:max-w-xl">
          <h2 id="people-weeks-title" className="text-base font-bold text-primary">
            People
          </h2>
          <p className="mt-0.5 text-sm text-quiet">
            What decides each person&apos;s working days: a day set on the calendar, then their own
            week, their department&apos;s, and last the organisation&apos;s.
            {editable ? " Pick people to set one week of their own for all of them at once." : ""}
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people…"
            aria-label="Search people"
            className="pl-9"
          />
        </label>
      </div>

      {editable && picked.length > 0 && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand/20 bg-brand/4 px-3.5 py-2.5 text-sm"
          aria-label="Picked people"
        >
          <span className="font-semibold text-primary">{plural(picked.length)} picked</span>
          <Button variant="small" type="button" onClick={() => setSetting(true)}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Set their working week
          </Button>
          {pickedOwn.length > 0 && (
            <Button
              variant="small"
              type="button"
              className="border-attention-edge text-attention hover:bg-attention-wash"
              onClick={() => setClearing(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove their own week
            </Button>
          )}
          <Button variant="ghost" type="button" onClick={() => setChosen(new Map())}>
            Clear
          </Button>
        </div>
      )}

      <div className="mt-3">
        {query.isPending ? (
          <LoadingState label="Loading people…" />
        ) : query.isError ? (
          <ErrorState
            title="Couldn't load the people"
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-quiet">Nobody matches.</p>
        ) : (
          <>
            {/* Phones: one card a person. */}
            <div className="md:hidden">
              {editable && (
                <label className="flex items-center gap-2.5 border-b border-divider py-2.5 text-sm font-semibold text-body">
                  <Checkbox checked={allPicked} onChange={toggleAll} />
                  Pick everyone listed
                </label>
              )}
              <ul className="divide-y divide-divider">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className={`flex gap-3 py-3 ${chosen.has(r.id) ? "bg-brand/3" : ""}`}
                  >
                    {editable && (
                      <Checkbox
                        className="mt-1"
                        checked={chosen.has(r.id)}
                        onChange={(e) => toggle(r, e.target.checked)}
                        aria-label={`Pick ${r.name}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <PersonAvatar name={r.name} avatarId={r.avatarId} userId={r.id} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-primary">{r.name}</p>
                          <p className="text-xs text-quiet">{r.department ?? "No department"}</p>
                        </div>
                        {yearButton(r)}
                      </div>
                      <p className="mt-1.5 text-sm text-body">{r.summary}</p>
                      <div className="mt-1.5">{sourceChip(r)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="whitespace-nowrap border-b border-divider text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
                    {editable && (
                      <th className="w-8 px-2 py-2.5">
                        <Checkbox
                          checked={allPicked}
                          onChange={toggleAll}
                          aria-label="Pick everyone listed"
                        />
                      </th>
                    )}
                    <th className="px-3 py-2.5">Person</th>
                    <th className="px-3 py-2.5">Working week</th>
                    <th className="px-3 py-2.5">Decided by</th>
                    <th className="px-3 py-2.5 text-right">
                      <span className="sr-only">Preview</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {rows.map((r) => (
                    <tr key={r.id} className={`align-top ${chosen.has(r.id) ? "bg-brand/3" : ""}`}>
                      {editable && (
                        <td className="px-2 py-3">
                          <Checkbox
                            checked={chosen.has(r.id)}
                            onChange={(e) => toggle(r, e.target.checked)}
                            aria-label={`Pick ${r.name}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <p className="flex items-center gap-2 font-semibold text-primary">
                          <PersonAvatar
                            name={r.name}
                            avatarId={r.avatarId}
                            userId={r.id}
                            size={24}
                          />
                          {r.name}
                        </p>
                        <p className="text-xs text-quiet">{r.department ?? "No department"}</p>
                      </td>
                      <td className="px-3 py-3 text-body">{r.summary}</td>
                      <td className="px-3 py-3">{sourceChip(r)}</td>
                      <td className="px-3 py-3 text-right">{yearButton(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > rows.length && (
              <p className="mt-3 text-xs text-quiet">
                Showing the first {Math.min(rows.length, PEOPLE_PAGE)} of {total}. Search to find
                someone else.
              </p>
            )}
          </>
        )}
      </div>

      <Modal
        open={setting}
        onClose={() => !save.isPending && setSetting(false)}
        title={`One working week for ${plural(picked.length)}`}
      >
        {setting && (
          <WorkWeekForm
            initial={
              picked.length === 1
                ? workWeekInputOf(view.people.find((p) => p.id === picked[0].id))
                : null
            }
            busy={save.isPending}
            onSubmit={submit}
            onCancel={() => setSetting(false)}
            submitLabel={`Set for ${plural(picked.length)}`}
            lead={
              <p className="text-sm text-soft">
                {namesText(picked.map((p) => p.name))}. Their own week comes before their
                department&apos;s and the organisation&apos;s.
              </p>
            }
          />
        )}
      </Modal>
      <ConfirmDialog
        open={clearing}
        onClose={() => setClearing(false)}
        onConfirm={() => void confirmClear()}
        loading={clear.isPending}
        destructive
        icon={Trash2}
        title="Remove their own week?"
        description={`${pickedOwn.length} of the ${picked.length} picked ${
          pickedOwn.length === 1 ? "has" : "have"
        } one. Their department's week, or the organisation's, decides again.`}
        confirmLabel="Remove"
      />
      <Modal
        open={previewing !== null}
        onClose={() => setPreviewing(null)}
        title={previewing ? `${previewing.name}: the year` : undefined}
        className="max-w-5xl"
      >
        {previewing && (
          <div className="px-4 py-5 sm:px-6">
            <PersonYear userId={previewing.id} personName={previewing.name} />
          </div>
        )}
      </Modal>
    </section>
  );
}
