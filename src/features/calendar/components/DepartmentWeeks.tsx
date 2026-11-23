"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnGhost, btnSmall, cardBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import type { DepartmentView } from "@/features/departments/types";
import { useClearWorkWeek, useSaveWorkWeek } from "@/features/calendar/hooks/useCalendar";
import { orgWeekText, workWeekInputOf, workWeekText } from "@/features/calendar/lib/calendar";
import type { CalendarView, WorkWeekInput, WorkWeekView } from "@/features/calendar/types";

import { WorkWeekForm } from "./WorkWeekForm";

/**
 * 3.5 Department calendars: which days each department works. A department
 * without a week of its own follows the organisation's; a person's own week
 * comes before either.
 */
export function DepartmentWeeks({ view, editable }: { view: CalendarView; editable: boolean }) {
  const departments = useDepartments();
  const [editing, setEditing] = useState<DepartmentView | null>(null);
  const [clearing, setClearing] = useState<DepartmentView | null>(null);
  const save = useSaveWorkWeek();
  const clear = useClearWorkWeek();
  const weeks = useMemo(
    () => new Map<string, WorkWeekView>(view.departments.map((w) => [w.id, w])),
    [view.departments],
  );
  const rows = departments.data ?? [];

  async function submit(input: WorkWeekInput) {
    if (!editing) return;
    try {
      await save.mutateAsync({ scope: "departments", ids: [editing.id], input });
      toast.success(`${editing.name}: working week saved`, {
        description: "Its people's working days follow it, unless they have a week of their own.",
      });
      setEditing(null);
    } catch (err) {
      toast.error("Couldn't save the working week", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  async function confirmClear() {
    if (!clearing) return;
    try {
      await clear.mutateAsync({ scope: "departments", ids: [clearing.id] });
      toast.success(`${clearing.name}: back to the organisation's week`);
      setClearing(null);
    } catch (err) {
      toast.error("Couldn't remove the working week", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  return (
    <section className={`${cardBase} px-4 py-4 sm:px-6`} aria-labelledby="dept-weeks-title">
      <h2 id="dept-weeks-title" className="text-base font-bold text-slate-900">
        Department calendars
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Which days each department works: every Saturday, alternate Saturdays, 2nd and 4th off, and
        so on. A department without one follows the organisation&apos;s week ({orgWeekText(view)}
        ).
      </p>
      <div className="mt-3">
        {departments.isPending ? (
          <LoadingState label="Loading departments…" />
        ) : departments.isError ? (
          <ErrorState
            title="Couldn't load the departments"
            message={errorMessage(departments.error)}
            onRetry={() => void departments.refetch()}
            retrying={departments.isFetching}
          />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No departments yet. Add one under Departments first.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {rows.map((d) => {
              const week = weeks.get(d.id);
              return (
                <li
                  key={d.id}
                  className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:gap-4"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <DepartmentIcon icon={d.icon} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{d.name}</span>
                      <span className="block text-xs text-slate-500">
                        {d.staffCount} {d.staffCount === 1 ? "staff member" : "staff"}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 text-sm text-slate-700 md:w-80">
                    {week ? (
                      workWeekText(week)
                    ) : (
                      <Chip tone="neutral" wrap>
                        Follows the organisation&apos;s week
                      </Chip>
                    )}
                  </span>
                  {editable && (
                    <span className="flex gap-2 md:w-40 md:justify-end">
                      <button type="button" onClick={() => setEditing(d)} className={btnSmall}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {week ? "Change" : "Set week"}
                      </button>
                      {week && (
                        <button
                          type="button"
                          onClick={() => setClearing(d)}
                          className={btnGhost}
                          aria-label={`Remove the working week of ${d.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" aria-hidden />
                        </button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Modal
        open={editing !== null}
        onClose={() => !save.isPending && setEditing(null)}
        title={editing ? `${editing.name}: working days` : undefined}
      >
        {editing && (
          <WorkWeekForm
            initial={workWeekInputOf(weeks.get(editing.id))}
            busy={save.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={clearing !== null}
        onClose={() => setClearing(null)}
        onConfirm={() => void confirmClear()}
        loading={clear.isPending}
        destructive
        icon={Trash2}
        title="Remove this working week?"
        description={
          clearing ? `${clearing.name} follows the organisation's week again.` : undefined
        }
        confirmLabel="Remove"
      />
    </section>
  );
}
