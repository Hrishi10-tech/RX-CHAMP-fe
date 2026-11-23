"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { Select } from "@/components/ui/Select";
import { ErrorState, LoadingState, RefreshFailedNotice } from "@/components/ui/StatePanel";
import type { SelectOption } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { todayKey } from "@/lib/time/businessTime";
import { monthOfDate } from "@/lib/time/months";
import { useReportPeople } from "@/features/reports/hooks/useReports";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { departmentIcon } from "@/features/departments/lib/icons";
import {
  REPORT_KIND_TEXT,
  departmentsIn,
  initialPeriod,
  monthOptions,
  periodLabel,
  reportTarget,
  resolvePeriod,
  resolveWho,
  type PeriodChoice,
  type PeriodMode,
  type ReportDepartment,
  type WhoChoice,
  type WhoMode,
} from "@/features/reports/lib/period";
import { ChoiceChip } from "@/components/ui/ChoiceChip";
import { ChoiceGroup } from "@/features/reports/components/ChoiceGroup";
import { DayCalendar } from "@/features/reports/components/DayCalendar";
import type { ReportPerson } from "@/features/reports/types";
import { Checkbox, Input } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button, buttonClass } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

function StepLabel({ n, children }: { n: number; children: string }) {
  return (
    <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-quiet">
      {n} · {children}
    </legend>
  );
}

function PeoplePicker({
  people,
  departments,
  choice,
  onChange,
  isSuperAdmin,
}: {
  people: ReportPerson[];
  departments: ReportDepartment[];
  choice: WhoChoice;
  onChange: (next: WhoChoice) => void;
  isSuperAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const withPeople = useMemo(() => departmentsIn(people, departments), [people, departments]);
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

  // A department is worth offering when there is more than one to choose from,
  // or to an Admin, whose "everyone" also covers people without a department.
  const offerDepartments = withPeople.length > 1 || (isSuperAdmin && withPeople.length > 0);
  const modes: { value: WhoMode; label: string }[] = [
    {
      value: "everyone",
      label: `${isSuperAdmin ? "Everyone" : "Everyone in my departments"} · ${people.length}`,
    },
    ...(offerDepartments ? [{ value: "department" as const, label: "A department" }] : []),
    { value: "pick", label: "Pick people" },
  ];

  const departmentOptions: SelectOption[] = withPeople.map((d) => ({
    value: d.id,
    label: d.name,
    description: `${d.count} ${d.count === 1 ? "person" : "people"}`,
    icon: departmentIcon(d.icon),
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

      {choice.mode === "department" && (
        <div className="max-w-sm">
          <Select
            aria-label="Department"
            value={choice.departmentId}
            onValueChange={(departmentId) => onChange({ ...choice, departmentId })}
            options={departmentOptions}
            placeholder="Pick a department"
            searchable={departmentOptions.length > 8}
            searchPlaceholder="Search departments…"
            className="!mt-0"
          />
        </div>
      )}

      {choice.mode === "pick" && (
        <div className="space-y-2">
          <label className="relative block max-w-sm">
            <span className="sr-only">Search people</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or department"
              className="pl-9 font-normal"
            />
          </label>
          <div className="flex items-center justify-between gap-2 text-sm text-soft">
            <span aria-live="polite">
              {choice.picked.length} of {people.length} picked
            </span>
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                onChange({ ...choice, picked: allPicked ? [] : people.map((p) => p.id) })
              }
              className="px-2 py-1"
            >
              {allPicked ? "Clear all" : "Select all"}
            </Button>
          </div>
          <ul className="scrollbar-slim max-h-72 space-y-1 overflow-y-auto rounded-xl border border-card p-1.5">
            {visible.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-quiet">Nobody matches.</li>
            ) : (
              visible.map((p) => {
                const on = picked.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 ${
                        on ? "bg-brand/7" : "hover:bg-fill"
                      }`}
                    >
                      <Checkbox checked={on} onChange={() => toggle(p.id)} />
                      <PersonAvatar name={p.name} avatarId={p.avatarId} userId={p.id} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-primary">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-quiet">
                          {[p.department, p.role === "MANAGER" ? "Manager" : null]
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
        <p className="max-w-sm rounded-xl bg-fill px-3.5 py-2.5 text-sm text-soft">
          <span className="font-semibold text-strong">
            {periodLabel({ kind: "month", month: monthOfDate(today) }, today)}.
          </span>{" "}
          Today counts up to now; the numbers settle when the month ends.
        </p>
      )}

      {choice.mode === "month" && (
        <div className="w-full max-w-sm rounded-xl border border-card bg-card p-3">
          <div className="flex items-center justify-between">
            <IconButton onClick={() => setYear((y) => y - 1)} label="Previous year">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </IconButton>
            <p className="text-sm font-semibold text-primary" aria-live="polite">
              {year}
            </p>
            <IconButton
              onClick={() => setYear((y) => Math.min(thisYear, y + 1))}
              disabled={year >= thisYear}
              label="Next year"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
          <div
            role="group"
            aria-label={`Months of ${year}`}
            className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4"
          >
            {months.map((m) => {
              const on = choice.month === m.month;
              return (
                <ChoiceChip
                  key={m.month}
                  on={on}
                  disabled={m.disabled}
                  onClick={() => onChange({ ...choice, month: m.month })}
                  className="h-9 w-full px-1"
                >
                  {m.label}
                </ChoiceChip>
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
  const departments = useDepartments();
  const [who, setWho] = useState<WhoChoice>({ mode: "everyone", departmentId: "", picked: [] });
  const [period, setPeriod] = useState<PeriodChoice>(() => initialPeriod(today));

  const list = people.data ?? [];
  const deptList = useMemo<ReportDepartment[]>(
    () => (departments.data ?? []).map((d) => ({ id: d.id, name: d.name, icon: d.icon })),
    [departments.data],
  );
  const resolved = resolveWho(who, list, isSuperAdmin, deptList);
  const resolvedPeriod = resolvePeriod(period, today);
  const target = resolvedPeriod ? reportTarget(resolved, resolvedPeriod) : null;

  return (
    <Card as="section" aria-labelledby="create-report" className="p-4 sm:p-6">
      <h2 id="create-report" className="text-base font-bold text-primary">
        Create a report
      </h2>
      <p className="mt-1 text-sm text-quiet">
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
        <p className="mt-6 rounded-xl bg-fill px-4 py-6 text-center text-sm text-soft">
          Nobody to report on yet. The staff of your departments appear here.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <PeoplePicker
              people={list}
              departments={deptList}
              choice={who}
              onChange={setWho}
              isSuperAdmin={isSuperAdmin}
            />
            <PeriodPicker choice={period} onChange={setPeriod} today={today} />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-card bg-fill px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-body" aria-live="polite">
              <span className="font-semibold text-primary">{resolved.label}</span>
              {resolvedPeriod ? ` · ${periodLabel(resolvedPeriod, today)}` : " · pick a day"}
              <span className="mt-0.5 block text-xs text-quiet">
                {target
                  ? REPORT_KIND_TEXT[target.kind]
                  : resolved.count === 0
                    ? "Pick at least one person."
                    : "Pick a period."}
              </span>
            </p>
            {target ? (
              <Link href={target.href} className={`${buttonClass("primary")} shrink-0`}>
                Generate report
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <Button variant="primary" type="button" disabled className="shrink-0">
                Generate report
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
