"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CloudUpload,
  KeyRound,
  LogOut,
  Network,
  Plus,
  ShieldX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnPrimary, btnSmall, cardBase } from "@/components/ui/classes";
import type { Column } from "@/components/ui/types";
import { errorMessage } from "@/lib/api";
import { useOrgScope } from "@/lib/org/selection";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import {
  getSignOutKeys,
  revokeSignOutKey,
  type SignOutKeyView,
} from "@/features/signoutKeys/api/signoutKeys";
import { CreateKeyDialog, whenText } from "@/features/signoutKeys/components/CreateKeyDialog";

export const signOutKeyKeys = {
  all: ["signout-keys"] as const,
  org: (org: string) => [...signOutKeyKeys.all, org] as const,
};

function names(list: { name: string }[], max = 3): string {
  const shown = list
    .slice(0, max)
    .map((x) => x.name)
    .join(", ");
  return list.length > max ? `${shown} and ${list.length - max} more` : shown;
}

export function scopeText(k: Pick<SignOutKeyView, "scope" | "users" | "departments">): string {
  if (k.scope === "ORG") return "Everyone in the organisation";
  if (k.scope === "DEPARTMENTS") return names(k.departments) || "Departments";
  return names(k.users) || "People";
}

function stateOf(k: SignOutKeyView): { label: string; tone: "success" | "neutral" | "danger" } {
  if (k.revokedAt) return { label: "Revoked", tone: "danger" };
  if (k.active) return { label: "Active", tone: "success" };
  return { label: "Expired", tone: "neutral" };
}

const STEPS = [
  { icon: LogOut, title: "Sign out", text: "They choose Sign out in the RX Vision app." },
  { icon: CloudUpload, title: "Sync", text: "The app uploads everything it saved offline." },
  { icon: KeyRound, title: "Key", text: "They type the key you gave them." },
  {
    icon: ShieldX,
    title: "Signed out",
    text: "Their sessions end; the old installer stops working.",
  },
];

/** SPEC 7.2 Sign-out keys: create (people, departments, organisation), show once, list, revoke. */
export function SignOutKeysView() {
  const org = useOrgScope();
  const queryClient = useQueryClient();
  const keys = useQuery({ queryKey: signOutKeyKeys.org(org), queryFn: getSignOutKeys });
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<SignOutKeyView | null>(null);

  const revoke = useMutation({
    mutationFn: (id: string) => revokeSignOutKey(id),
    onSuccess: () => {
      toast.success("Key revoked", { description: "It no longer signs anyone out." });
      setRevoking(null);
      return queryClient.invalidateQueries({ queryKey: signOutKeyKeys.all });
    },
    onError: (err) =>
      toast.error("Couldn't revoke the key", {
        description: errorMessage(err) ?? "Please try again.",
      }),
  });

  const columns = useMemo<Column<SignOutKeyView>[]>(
    () => [
      {
        key: "scope",
        header: "Who can use it",
        render: (k) => {
          const Icon = k.scope === "ORG" ? Building2 : k.scope === "DEPARTMENTS" ? Network : Users;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {scopeText(k)}
                </span>
                <span className="block text-xs text-slate-400">
                  {k.scope === "USERS"
                    ? "People"
                    : k.scope === "DEPARTMENTS"
                      ? "Departments"
                      : "Organisation"}
                </span>
              </span>
            </div>
          );
        },
      },
      {
        key: "state",
        header: "State",
        render: (k) => {
          const s = stateOf(k);
          return (
            <Chip tone={s.tone} dot={s.tone === "success"}>
              {s.label}
            </Chip>
          );
        },
      },
      {
        key: "expires",
        header: "Valid until",
        render: (k) => (
          <span className="text-sm text-slate-600">
            {whenText(k.revokedAt ?? k.expiresAt) || "—"}
          </span>
        ),
      },
      {
        key: "created",
        header: "Created",
        render: (k) => (
          <span className="text-sm text-slate-600">
            {whenText(k.createdAt)}
            {k.createdBy ? (
              <span className="block text-xs text-slate-400">by {k.createdBy}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: "uses",
        header: "Uses",
        align: "right",
        render: (k) => <span className="tabular-nums">{k.uses}</span>,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (k) =>
          k.active && !k.revokedAt ? (
            <button type="button" className={btnSmall} onClick={() => setRevoking(k)}>
              Revoke
            </button>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sign-out keys"
        subtitle="The RX Vision app signs out only with a key from you. Each key lasts 24 hours."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Create key
          </button>
        }
      />

      <ol
        className={`${cardBase} grid grid-cols-2 gap-4 p-5 md:grid-cols-4`}
        aria-label="How signing out works"
      >
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)]">
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-800">
                {i + 1}. {s.title}
              </span>
              <span className="block text-xs text-slate-500">{s.text}</span>
            </span>
            {i < STEPS.length - 1 && (
              <ArrowRight
                className="absolute -right-3 top-3 hidden h-4 w-4 text-slate-300 md:block"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>

      {keys.isPending ? (
        <div className={cardBase}>
          <LoadingState label="Loading keys…" />
        </div>
      ) : keys.isError ? (
        <div className={cardBase}>
          <ErrorState
            message={errorMessage(keys.error)}
            onRetry={() => void keys.refetch()}
            retrying={keys.isFetching}
          />
        </div>
      ) : (
        <DataTable
          title="Active and recent keys"
          data={keys.data}
          columns={columns}
          getRowKey={(k) => k.id}
          countNoun="key"
          minWidth={820}
          emptyMessage="No keys yet. Create one when someone needs to sign out of the app."
        />
      )}

      <CreateKeyDialog open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={revoking !== null}
        onClose={() => !revoke.isPending && setRevoking(null)}
        onConfirm={() => revoking && revoke.mutate(revoking.id)}
        loading={revoke.isPending}
        destructive
        title="Revoke this key?"
        confirmLabel={revoke.isPending ? "Revoking…" : "Revoke"}
        description={revoking ? `${scopeText(revoking)} can no longer sign out with it.` : null}
      />
    </div>
  );
}
