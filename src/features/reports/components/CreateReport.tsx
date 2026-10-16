"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Search, Users } from "lucide-react";

import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState, RefreshFailedNotice } from "@/components/ui/StatePanel";
import { btnPrimary, cardBase, checkboxBase, inputBase } from "@/components/ui/classes";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { initialsOf } from "@/lib/text/initials";
import { todayKey } from "@/lib/time/businessTime";
import { monthOfDate } from "@/lib/time/months";
import { useReportPeople } from "@/features/reports/hooks/useReports";
import {
  REPORT_KIND_TEXT,
  initialPeriod,
  monthOptions,
  periodLabel,
  reportTarget,
  resolvePeriod,
  resolveWho,
  teamsOf,
  type PeriodChoice,
  type PeriodMode,
  type WhoChoice,
  type WhoMode,
} from "@/features/reports/lib/period";
import { ChoiceGroup } from "@/features/reports/components/ChoiceGroup";
import { DayCalendar } from "@/features/reports/components/DayCalendar";
import type { ReportPerson } from "@/features/reports/types";

const stepBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:cursor-not-allowed disabled:opacity-40";

function StepLabel({ n, children }: { n: number; children: string }) {
  return (
    <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      {n} · {children}
    </legend>
  );
}

function PeoplePicker({
  people,
  choice,
  onChange,
  isSuperAdmin,
}: {
  people: ReportPerson[];
  choice: WhoChoice;
  onChange: (next: WhoChoice) => void;
  isSuperAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const teams = useMemo(() => teamsOf(people), [people]);
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      people.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.department ?? "").toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      ),
    [people, q],
  );
  const picked = new Set(choice.picked);
  const allPicked = people.length > 0 && people.every((p) => picked.has(p.id));

  const modes: { value: WhoMode; label: string }[] = isSuperAdmin
    ? [
        { value: "everyone", label: `Everyone · ${people.length}` },
        { value: "team", label: "A team" },
        { value: "pick", label: "Pick people" },
      ]
    : [
        { value: "everyone", label: `Everyone in my team · ${people.length}` },
        { value: "pick", label: "Pick people" },
      ];

  const teamOptions: SelectOption[] = teams.map((t) => ({
    value: t.id,
    label: `${t.name}'s team`,
    description: `${t.count} ${t.count === 1 ? "person" : "people"}`,
    icon: Users,
  }));

  function toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...choice, picked: [...next] });
  }

  return (
    <fieldset className="min-w-0 space-y-3">
      <StepLabel n={1}>Who</StepLabel>
      <ChoiceGroup
        label="Who"
        value={choice.mode}
        options={modes}
        onChange={(mode) => onChange({ ...choice, mode })}
      />

      {choice.mode === "team" && isSuperAdmin && (
        <div className="max-w-sm">
          <Select
            aria-label="Team"
            value={choice.managerId}
            onValueChange={(managerId) => onChange({ ...choice, managerId })}
            options={teamOptions}
            placeholder="Pick a manager's team"
            searchable={teamOptions.length > 8}
            searchPlaceholder="Search managers…"
            className="!mt-0"
          />
        </div>
      )}

      {choice.mode === "pick" && (
        <div className="space-y-2">
          <label className="relative block max-w-sm">
            <span className="sr-only">Search people</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or department"
              className={`${inputBase} pl-9 font-normal`}
            />
          </label>
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span aria-live="polite">
              {choice.picked.length} of {people.length} picked
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({ ...choice, picked: allPicked ? [] : people.map((p) => p.id) })
              }
              className="rounded-lg px-2 py-1 font-semibold text-[rgb(34_34_204)] hover:bg-[rgba(34,34,204,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
            >
              {allPicked ? "Clear all" : "Select all"}
            </button>
          </div>
          <ul className="scrollbar-slim max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-1.5">
            {visible.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">Nobody matches.</li>
            ) : (
              visible.map((p) => {
                const on = picked.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 ${
                        on ? "bg-[rgba(34,34,204,0.07)]" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className={checkboxBase}
                        checked={on}
                        onChange={() => toggle(p.id)}
                      />
                      <span
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-800"
                      >
                        {initialsOf(p.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {[
                            p.department,
                            isSuperAdmin && p.managerName ? `Manager ${p.managerName}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || p.email}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </fieldset>
  );
}

function PeriodPicker({
  choice,
  onChange,
  today,
}: {
  choice: PeriodChoice;
  onChange: (next: PeriodChoice) => void;
  today: string;
}) {
  const [year, setYear] = useState(
    () => Number(choice.month.slice(0, 4)) || Number(today.slice(0, 4)),
  );
  const thisYear = Number(today.slice(0, 4));
  const months = monthOptions(year, today);

  return (
    <fieldset className="min-w-0 space-y-3">
      <StepLabel n={2}>When</StepLabel>
      <ChoiceGroup<PeriodMode>
        label="When"
        value={choice.mode}
        options={[
          { value: "day", label: "A day" },
          { value: "thisMonth", label: "This month" },
          { value: "month", label: "A month" },
        ]}
        onChange={(mode) => onChange({ ...choice, mode })}
      />

      {choice.mode === "day" && (
        <DayCalendar
          selected={choice.day}
          viewMonth={choice.viewMonth}
          today={today}
          onSelect={(day) => onChange({ ...choice, day })}
          onViewMonth={(viewMonth) => onChange({ ...choice, viewMonth })}
        />
      )}

      {choice.mode === "thisMonth" && (
        <p className="max-w-sm rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            {periodLabel({ kind: "month", month: monthOfDate(today) }, today)}.
          </span>{" "}
          Today counts up to now; the numbers settle when the month ends.
        </p>
      )}

      {choice.mode === "month" && (
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
              className={stepBtn}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold text-slate-900" aria-live="polite">
              {year}
            </p>
            <button
              type="button"
              onClick={() => setYear((y) => Math.min(thisYear, y + 1))}
              disabled={year >= thisYear}
              aria-label="Next year"
              className={stepBtn}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div
            role="group"
            aria-label={`Months of ${year}`}
            className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4"
          >
            {months.map((m) => {
              const on = choice.month === m.month;
              return (
                <button
                  key={m.month}
                  type="button"
                  disabled={m.disabled}
                  aria-pressed={on}
                  onClick={() => onChange({ ...choice, month: m.month })}
                  className={`h-10 rounded-lg border px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:cursor-not-allowed disabled:opacity-40 ${
                    on
                      ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </fieldset>
  );
}

/**
 * Create a report: people (one, several, a team, or everyone in scope) and a
 * period (a day, this month so far, or any month up to now). One person gets
 * every day in detail; several get an overview with each person a click away.
 */
export function CreateReport({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const today = todayKey();
  const people = useReportPeople();
  const [who, setWho] = useState<WhoChoice>({ mode: "everyone", managerId: "", picked: [] });
  const [period, setPeriod] = useState<PeriodChoice>(() => initialPeriod(today));

  const list = people.data ?? [];
  const resolved = resolveWho(who, list, isSuperAdmin);
  const resolvedPeriod = resolvePeriod(period, today);
  const target = resolvedPeriod ? reportTarget(resolved, resolvedPeriod) : null;

  return (
    <section aria-labelledby="create-report" className={`${cardBase} p-4 sm:p-6`}>
      <h2 id="create-report" className="text-base font-bold text-slate-900">
        Create a report
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        One person gets every day in detail. Several people get an overview, with each person a
        click away.
      </p>

      {people.isError && people.data && (
        <div className="mt-4">
          <RefreshFailedNotice
            what="the people list"
            updatedAt={people.dataUpdatedAt}
            onRetry={() => people.refetch()}
            retrying={people.isFetching}
          />
        </div>
      )}
      {people.isLoading ? (
        <LoadingState label="Loading people…" />
      ) : people.isError && !people.data ? (
        <ErrorState
          title="Couldn't load the people you can report on"
          message={errorMessage(people.error)}
          onRetry={() => people.refetch()}
          retrying={people.isFetching}
        />
      ) : list.length === 0 ? (
        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Nobody to report on yet. People who report to you appear here.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <PeoplePicker
              people={list}
              choice={who}
              onChange={setWho}
              isSuperAdmin={isSuperAdmin}
            />
            <PeriodPicker choice={period} onChange={setPeriod} today={today} />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-slate-700" aria-live="polite">
              <span className="font-semibold text-slate-900">{resolved.label}</span>
              {resolvedPeriod ? ` · ${periodLabel(resolvedPeriod, today)}` : " · pick a day"}
              <span className="mt-0.5 block text-xs text-slate-500">
                {target
                  ? REPORT_KIND_TEXT[target.kind]
                  : resolved.count === 0
                    ? "Pick at least one person."
                    : "Pick a period."}
              </span>
            </p>
            {target ? (
              <Link href={target.href} className={`${btnPrimary} shrink-0`}>
                Generate report
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <button type="button" disabled className={`${btnPrimary} shrink-0`}>
                Generate report
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
