"use client";

import { useState } from "react";
import { Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";
import { errorCode, errorMessage } from "@/lib/api";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { DepartmentDialog } from "@/features/departments/components/DepartmentDialog";
import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import { useDeleteDepartment, useDepartments } from "@/features/departments/hooks/useDepartments";
import type { DepartmentView } from "@/features/departments/types";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function DepartmentCard({
  department,
  onEdit,
  onDelete,
}: {
  department: DepartmentView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const managers = department.managers;
  return (
    <Card as="article" className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <DepartmentIcon icon={department.icon} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-primary">{department.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-quiet">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {plural(department.staffCount, "staff member", "staff")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${department.name}`}
            title="Edit"
            className={`${rowActionButtonClass} ${rowActionHover.primary}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${department.name}`}
            title="Delete"
            className={`${rowActionButtonClass} ${rowActionHover.danger}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 border-t border-divider pt-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
          {managers.length === 1 ? "Manager" : "Managers"}
        </p>
        {managers.length ? (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {managers.map((m) => (
              <li
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-panel py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-body"
              >
                <PersonAvatar name={m.name} avatarId={m.avatarId} userId={m.id} size={20} />
                {m.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-attention">No manager yet</p>
        )}
      </div>
    </Card>
  );
}

/** SPEC 7.2 Departments: cards with icon, staff and managers; add, edit, delete. */
export function DepartmentsView() {
  const list = useDepartments();
  const remove = useDeleteDepartment();
  const [editing, setEditing] = useState<DepartmentView | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<DepartmentView | null>(null);
  const departments = list.data ?? [];

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Department deleted", { description: deleting.name });
      setDeleting(null);
    } catch (err) {
      const notEmpty = errorCode(err) === "DEPARTMENT_NOT_EMPTY";
      toast.error(notEmpty ? "Move its staff first" : "Couldn't delete the department", {
        description: notEmpty
          ? `${deleting.name} still has active staff. Move them to another department, then delete it.`
          : (errorMessage(err) ?? "Please try again."),
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Staff belong to one department; managers look after one or more."
        actions={
          <Button type="button" variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add department
          </Button>
        }
      />

      {list.isPending ? (
        <Card>
          <LoadingState label="Loading departments…" />
        </Card>
      ) : list.isError ? (
        <Card>
          <ErrorState
            message={errorMessage(list.error)}
            onRetry={() => void list.refetch()}
            retrying={list.isFetching}
          />
        </Card>
      ) : departments.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No departments yet"
            message="Add the first one, then put people in it from Team management."
            action={
              <Button type="button" variant="primary" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add department
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <DepartmentCard
              key={d.id}
              department={d}
              onEdit={() => setEditing(d)}
              onDelete={() => setDeleting(d)}
            />
          ))}
        </div>
      )}

      <DepartmentDialog
        open={adding || editing !== null}
        department={editing}
        existing={departments}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !remove.isPending && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        destructive
        icon={Trash2}
        title="Delete this department?"
        confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
        description={
          deleting ? (
            <>
              <span className="font-semibold text-body">{deleting.name}</span> will be removed. Its
              managers are unassigned; a department with active staff can&apos;t be deleted.
            </>
          ) : null
        }
      />
    </div>
  );
}
