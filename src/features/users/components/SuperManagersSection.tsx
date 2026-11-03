"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/StatePanel";
import { cardBase } from "@/components/ui/classes";
import type { Column } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { getSuperManagers } from "@/features/users/api/superManagers";
import { MemberFormDialog } from "@/features/users/components/MemberFormDialog";
import { useMemberActions } from "@/features/users/hooks/useMemberActions";
import { mapUserToMember, memberColumns } from "@/features/users/lib/memberTable";
import type { TeamMember } from "@/types";

export const superManagerKeys = {
  all: ["super-managers"] as const,
};

const SUPER_MANAGER_ROLES: ["SUPER_MANAGER"] = ["SUPER_MANAGER"];

/**
 * 3.3: the Super Manager accounts, for a Super Admin. They belong to no
 * organisation, so they are listed apart from the organisations' people. Adding
 * one is Team management's "Add Super Manager" on the platform view (POST
 * /super-managers); here: edit details, set a password, block and delete (the
 * /users/:id endpoints).
 */
export function SuperManagersSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ open: boolean; member: TeamMember | null }>({
    open: false,
    member: null,
  });
  const list = useQuery({ queryKey: superManagerKeys.all, queryFn: getSuperManagers });
  const members = useMemo(() => (list.data ?? []).map(mapUserToMember), [list.data]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: superManagerKeys.all });
  }, [queryClient]);
  const openEdit = useCallback((member: TeamMember) => setForm({ open: true, member }), []);
  const { renderActions, dialogs } = useMemberActions({ onChanged: refresh, onEdit: openEdit });

  const columns = useMemo<Column<TeamMember>[]>(
    () => [
      ...memberColumns.filter((c) => c.key === "name" || c.key === "joined"),
      { key: "email", header: "Email", render: (m) => m.email },
      { key: "actions", header: "Actions", align: "right", render: renderActions },
    ],
    [renderActions],
  );

  return (
    <section aria-label="Super Managers" className="space-y-3">
      {list.isError && !list.data ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(list.error)}
            onRetry={() => void list.refetch()}
            retrying={list.isFetching}
          />
        </div>
      ) : (
        <DataTable
          data={members}
          columns={columns}
          getRowKey={(m) => m.id}
          onRowClick={openEdit}
          countNoun="Super Manager"
          minWidth={720}
          emptyMessage={
            list.isPending
              ? "Loading Super Managers…"
              : "No Super Managers yet. They see every organisation and add Staff."
          }
          title={`Super Managers (${members.length})`}
        />
      )}
      {dialogs}
      <MemberFormDialog
        open={form.open}
        member={form.member}
        roles={SUPER_MANAGER_ROLES}
        onClose={() => setForm({ open: false, member: null })}
        onSaved={refresh}
      />
    </section>
  );
}
