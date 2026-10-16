"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Search, Undo2, UsersRound, X } from "lucide-react";

import { Chip } from "@/components/ui/Chip";
import { Pager } from "@/components/ui/Pager";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnGhost,
  btnPrimary,
  btnSmall,
  cardBase,
  checkboxBase,
  thBase,
} from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { roleLabel } from "@/constants/roles";
import { formatDay } from "@/lib/time/businessTime";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { usePeopleAssignments } from "@/features/shifts/hooks/useAssignments";
import { SourceChip, shiftRefLabel } from "@/features/shifts/components/ShiftBadges";
import {
  OverrideShiftDialog,
  type OverridePerson,
} from "@/features/shifts/components/OverrideShiftDialog";
import { FALLBACK_SHIFT } from "@/features/shifts/components/shiftOptions";
import type { PersonOverride, PersonShiftView, ShiftView } from "@/features/shifts/types";

const PAGE_SIZE = 20;
const ALL_DEPARTMENTS = "__all__";

function overrideText(o: PersonOverride): string {
  return o.effectiveTo
    ? `${formatDay(o.effectiveFrom)} to ${formatDay(o.effectiveTo)}`
    : `Since ${formatDay(o.effectiveFrom)}`;
}

function upcomingText(o: PersonOverride): string {
  const name = o.shift?.name ?? "Department shift";
  return `${name} from ${formatDay(o.effectiveFrom)}${
    o.effectiveTo ? ` to ${formatDay(o.effectiveTo)}` : ""
  }`;
}

function ShiftCell({ person }: { person: PersonShiftView }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="font-semibold text-slate-900">{shiftRefLabel(person.shift)}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceChip source={person.source} />
        {person.override && (
          <span className="text-xs text-slate-500">{overrideText(person.override)}</span>
        )}
      </div>
      {person.upcoming && (
        <p className="text-xs text-sky-700">Next: {upcomingText(person.upcoming)}</p>
      )}
    </div>
  );
}

/**
 * Everyone's shift today (a Manager: their own staff), with personal overrides.
 * Select people to override their shift in one go.
 */
export function PeopleTab({
  shifts,
  departments,
  department,
  onDepartmentChange,
}: {
  shifts: ShiftView[] | undefined;
  departments: string[];
  department: string;
  onDepartmentChange: (department: string) => void;
}) {
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 300);
  const [page, setPage] = useState(1);
  // Kept across pages and searches, so a selection can be built up.
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [dialog, setDialog] = useState<{ people: OverridePerson[]; shiftId?: string } | null>(null);

  useEffect(() => setPage(1), [search, department]);

  const params = useMemo(
    () => ({
      search: search || undefined,
      department: department || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [search, department, page],
  );
  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } =
    usePeopleAssignments(params);
  const people = data?.people ?? [];
  const total = data?.meta?.total ?? people.length;

  const departmentOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_DEPARTMENTS, label: "All departments" },
      ...departments.map((d) => ({ value: d, label: d })),
    ],
    [departments],
  );

  const pageIds = people.map((p) => p.userId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggle(person: PersonShiftView) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(person.userId)) next.delete(person.userId);
      else next.set(person.userId, person.name);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allOnPage) for (const id of pageIds) next.delete(id);
      else for (const p of people) next.set(p.userId, p.name);
      return next;
    });
  }

  function openFor(list: OverridePerson[], shiftId?: string) {
    setDialog({ people: list, shiftId });
  }

  const filtered = Boolean(search || department);

  return (
    <section className={cardBase} aria-label="People">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">People</h2>
          <p className="text-sm text-slate-500">
            The shift each person works today, and where it comes from.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[rgb(34_34_204)] focus:ring-2 focus:ring-[rgba(34,34,204,0.15)] sm:w-60"
            />
          </div>
          <div className="sm:w-56">
            <Select
              value={department || ALL_DEPARTMENTS}
              onValueChange={(v) => onDepartmentChange(v === ALL_DEPARTMENTS ? "" : v)}
              options={departmentOptions}
              aria-label="Department"
              className="!mt-0 h-11 !py-0"
            />
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Selected people"
          className="flex flex-col gap-3 border-b border-slate-200 bg-[rgba(34,34,204,0.04)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-slate-800">{selected.size} selected</span>
            <button type="button" onClick={() => setSelected(new Map())} className={btnGhost}>
              <X className="h-4 w-4" aria-hidden />
              Clear
            </button>
          </div>
          <button
            type="button"
            onClick={() => openFor([...selected].map(([id, name]) => ({ id, name })))}
            className={btnPrimary}
          >
            <CalendarClock className="h-4 w-4" aria-hidden />
            Override shift
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Loading people…" />
      ) : isError ? (
        <ErrorState
          title="Couldn't load people"
          message={errorMessage(error)}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : people.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={filtered ? "Nobody matches" : "Nobody here yet"}
          message={
            filtered ? "Try another name or department." : "People appear here once they are added."
          }
        />
      ) : (
        <div className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 sm:px-6 md:hidden">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className={checkboxBase}
                checked={allOnPage}
                onChange={togglePage}
              />
              Select all on this page
            </label>
          </div>
          <ul className="divide-y divide-slate-100 md:hidden">
            {people.map((p) => (
              <li key={p.userId} className="flex gap-3 px-4 py-4">
                <input
                  type="checkbox"
                  className={`${checkboxBase} mt-1`}
                  checked={selected.has(p.userId)}
                  onChange={() => toggle(p)}
                  aria-label={`Select ${p.name}`}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{p.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {roleLabel(p.role)} · {p.department ?? "No department"}
                      </p>
                    </div>
                    <RowAction person={p} onOpen={openFor} />
                  </div>
                  <ShiftCell person={p} />
                </div>
              </li>
            ))}
          </ul>

          <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th scope="col" className="w-12 py-3 pl-6">
                    <input
                      type="checkbox"
                      className={checkboxBase}
                      checked={allOnPage}
                      onChange={togglePage}
                      aria-label="Select everyone on this page"
                    />
                  </th>
                  <th scope="col" className={thBase}>
                    Person
                  </th>
                  <th scope="col" className={thBase}>
                    Department
                  </th>
                  <th scope="col" className={thBase}>
                    Shift today
                  </th>
                  <th scope="col" className={`${thBase} pr-6 text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const isSelected = selected.has(p.userId);
                  return (
                    <tr
                      key={p.userId}
                      className={`border-b border-slate-100 align-top last:border-0 ${
                        isSelected ? "bg-[rgba(34,34,204,0.04)]" : ""
                      }`}
                    >
                      <td className="py-3.5 pl-6">
                        <input
                          type="checkbox"
                          className={checkboxBase}
                          checked={isSelected}
                          onChange={() => toggle(p)}
                          aria-label={`Select ${p.name}`}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                        <Chip tone="brand" className="mt-1">
                          {roleLabel(p.role)}
                        </Chip>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {p.department ?? <span className="text-slate-400">No department</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <ShiftCell person={p} />
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <RowAction person={p} onOpen={openFor} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            noun="person"
          />
        </div>
      )}

      <OverrideShiftDialog
        people={dialog?.people ?? null}
        initialShiftId={dialog?.shiftId}
        shifts={shifts}
        onClose={() => setDialog(null)}
        onDone={(res) =>
          setSelected((prev) => {
            const next = new Map(prev);
            for (const id of res.assigned) next.delete(id);
            return next;
          })
        }
      />
    </section>
  );
}

function RowAction({
  person,
  onOpen,
}: {
  person: PersonShiftView;
  onOpen: (people: OverridePerson[], shiftId?: string) => void;
}) {
  const target = [{ id: person.userId, name: person.name }];
  if (person.override) {
    return (
      <button
        type="button"
        onClick={() => onOpen(target, FALLBACK_SHIFT)}
        className={`${btnSmall} shrink-0`}
        aria-label={`Put ${person.name} back on the department shift`}
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden />
        Back to department
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(target)}
      className={`${btnSmall} shrink-0`}
      aria-label={`Override the shift for ${person.name}`}
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      Override
    </button>
  );
}
