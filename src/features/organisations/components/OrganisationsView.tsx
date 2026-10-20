"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Eye, Pencil, Plus, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, cardBase } from "@/components/ui/classes";
import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";
import type { Column } from "@/components/ui/types";
import { errorCode, errorMessage } from "@/lib/api";
import { formatDay, dateKeyOf } from "@/lib/time/businessTime";
import { selectOrg, useSelectedOrg } from "@/lib/org/selection";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import {
  useDeleteOrganisation,
  useOrganisations,
} from "@/features/organisations/hooks/useOrganisations";
import { CreateAdminDialog, OrgNameDialog } from "@/features/organisations/components/OrgDialogs";
import { OrgContentsDialog } from "@/features/organisations/components/OrgContentsDialog";
import type { OrganisationView } from "@/features/organisations/types";

function created(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${formatDay(dateKeyOf(d))} ${d.getFullYear()}`;
}

/** SPEC 5.1 / 7.1 Organisations: list, add, rename, delete, create its Admin. */
export function OrganisationsView() {
  const router = useRouter();
  const selected = useSelectedOrg();
  const list = useOrganisations();
  const remove = useDeleteOrganisation();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<OrganisationView | null>(null);
  const [adminFor, setAdminFor] = useState<OrganisationView | null>(null);
  const [deleting, setDeleting] = useState<OrganisationView | null>(null);
  const [viewing, setViewing] = useState<OrganisationView | null>(null);

  function open(org: OrganisationView) {
    selectOrg({ id: org.id, name: org.name });
    router.push("/dashboard/overview");
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Organisation deleted", { description: deleting.name });
      setDeleting(null);
    } catch (err) {
      const notEmpty = errorCode(err) === "ORG_NOT_EMPTY";
      toast.error(notEmpty ? "It still has people" : "Couldn't delete the organisation", {
        description: notEmpty
          ? `Remove or move the active people in ${deleting.name} first.`
          : (errorMessage(err) ?? "Please try again."),
      });
    }
  }

  const columns = useMemo<Column<OrganisationView>[]>(
    () => [
      {
        key: "name",
        header: "Organisation",
        render: (o) => (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]">
              <Building2 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {o.name}
                {selected?.id === o.id && (
                  <span className="ml-2 rounded-full bg-[rgba(34,34,204,0.08)] px-2 py-0.5 text-[10px] font-bold uppercase text-[rgb(34_34_204)]">
                    Selected
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">Created {created(o.createdAt) || "—"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "admin",
        header: "Admin",
        render: (o) =>
          o.admin ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{o.admin.name}</p>
              <p className="truncate text-xs text-slate-400">{o.admin.email}</p>
            </div>
          ) : (
            <span className="text-sm font-semibold text-amber-700">No admin yet</span>
          ),
      },
      { key: "staff", header: "Staff", align: "right", render: (o) => o.counts.staff },
      { key: "managers", header: "Managers", align: "right", render: (o) => o.counts.managers },
      {
        key: "departments",
        header: "Departments",
        align: "right",
        render: (o) => o.counts.departments,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (o) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewing(o);
              }}
              title="Departments and people"
              aria-label={`Departments and people of ${o.name}`}
              className={`${rowActionButtonClass} ${rowActionHover.primary}`}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open(o);
              }}
              title="Work in this organisation"
              aria-label={`Open ${o.name}`}
              className={`${rowActionButtonClass} ${rowActionHover.primary}`}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <ActionMenu
              label={`More actions for ${o.name}`}
              triggerClassName={`${rowActionButtonClass} ${rowActionHover.primary}`}
              items={[
                { label: "Rename", icon: Pencil, onSelect: () => setRenaming(o) },
                ...(o.admin
                  ? []
                  : [{ label: "Create admin", icon: ShieldPlus, onSelect: () => setAdminFor(o) }]),
                {
                  label: "Delete",
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => setDeleting(o),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.id],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisations"
        subtitle="Each organisation is a hard boundary: its own Admin, people, shifts and settings. Click one to see its departments and people."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add organisation
          </button>
        }
      />

      {list.isPending ? (
        <div className={cardBase}>
          <LoadingState label="Loading organisations…" />
        </div>
      ) : list.isError ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(list.error)}
            onRetry={() => void list.refetch()}
            retrying={list.isFetching}
          />
        </div>
      ) : (
        <DataTable
          title={`Organisations (${list.data.length})`}
          data={list.data}
          columns={columns}
          getRowKey={(o) => o.id}
          onRowClick={setViewing}
          countNoun="organisation"
          minWidth={760}
          emptyMessage="No organisations yet."
        />
      )}

      <OrgNameDialog
        open={adding || renaming !== null}
        organisation={renaming}
        onClose={() => {
          setAdding(false);
          setRenaming(null);
        }}
        onCreated={(org) => setAdminFor(org)}
      />
      <CreateAdminDialog organisation={adminFor} onClose={() => setAdminFor(null)} />
      <OrgContentsDialog
        key={viewing?.id ?? "none"}
        organisation={viewing}
        onClose={() => setViewing(null)}
        onOpen={(org) => {
          setViewing(null);
          open(org);
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !remove.isPending && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        destructive
        icon={Trash2}
        title="Delete this organisation?"
        confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
        description={
          deleting ? (
            <>
              <span className="font-semibold text-slate-700">{deleting.name}</span> will be removed.
              An organisation with active people can&apos;t be deleted.
            </>
          ) : null
        }
      />
    </div>
  );
}
