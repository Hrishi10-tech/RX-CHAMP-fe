"use client";

import { useCallback, useState } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  Camera,
  CameraOff,
  Check,
  Eye,
  KeyRound,
  Lock,
  LockOpen,
  MousePointerBan,
  MousePointerClick,
  Network,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";
import { errorMessage } from "@/lib/api";
import { DownloadAgentRowButton } from "@/features/agent/components/DownloadAgentRowButton";
import { useSession } from "@/features/auth/hooks/useSession";
import { deleteUser } from "@/features/users/api/deleteUser";
import { canChangeMember } from "@/features/users/lib/memberAccess";
import { setUserIdle } from "@/features/users/api/access";
import { setUserScreenshots } from "@/features/users/api/setUserScreenshots";
import { setUserStatus } from "@/features/users/api/setUserStatus";
import {
  GrantsDialog,
  MemberDepartmentDialog,
} from "@/features/users/components/MemberAccessDialogs";
import {
  SetPasswordModal,
  type SetPasswordTarget,
} from "@/features/users/components/SetPasswordModal";
import type {
  MemberScreenshotsTarget,
  MemberStatusTarget,
  UseMemberActionsOptions,
  UseMemberActionsResult,
} from "@/features/users/types";
import type { TeamMember } from "@/types";

/**
 * Turns this member's automatic screenshots on or off, after a confirm: it
 * changes what is recorded about a person.
 */
function ScreenshotsMemberButton({
  member,
  onSelect,
}: {
  member: TeamMember;
  onSelect: (target: MemberScreenshotsTarget) => void;
}) {
  const enabled = member.screenshotsEnabled;
  const Icon = enabled ? Camera : CameraOff;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ member, enable: !enabled });
      }}
      title={enabled ? "Screenshots on. Click to turn off." : "Screenshots off. Click to turn on."}
      aria-label={`${enabled ? "Turn off" : "Turn on"} automatic screenshots for ${member.name}`}
      aria-pressed={enabled}
      className={`${rowActionButtonClass} ${
        enabled
          ? "border-[rgba(34,34,204,0.35)] bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)] hover:bg-[rgba(34,34,204,0.14)]"
          : rowActionHover.primary
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** What the input tracking icon says for a person's override (SPEC 2.5). */
export function idleLook(enabled: boolean | null): { label: string; title: string } {
  if (enabled === true) return { label: "On", title: "Input tracking on for this person" };
  if (enabled === false) return { label: "Off", title: "Input tracking off for this person" };
  return { label: "Department", title: "Input tracking follows the department setting" };
}

/**
 * Input tracking on/off for one person (the away pop-up, SPEC 2.5). The icon
 * shows the override; the menu sets it on, off, or back to the department.
 */
function IdleMemberButton({
  member,
  onSet,
}: {
  member: TeamMember;
  onSet: (member: TeamMember, enabled: boolean | null) => void;
}) {
  const state = member.idleEnabled;
  const look = idleLook(state);
  const Icon = state === false ? MousePointerBan : MousePointerClick;
  const options: { value: boolean | null; label: string; icon: typeof Icon }[] = [
    { value: true, label: "Track input", icon: MousePointerClick },
    { value: false, label: "Don't track input", icon: MousePointerBan },
    { value: null, label: "Use department setting", icon: Undo2 },
  ];
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          title={`${look.title}. Click to change.`}
          aria-label={`Input tracking for ${member.name}: ${look.label}`}
          className={`${rowActionButtonClass} ${
            state === true
              ? "border-[rgba(34,34,204,0.35)] bg-[rgba(34,34,204,0.08)] text-[rgb(34_34_204)] hover:bg-[rgba(34,34,204,0.14)]"
              : state === false
                ? "text-rose-500 hover:text-rose-600"
                : `text-slate-400 ${rowActionHover.primary}`
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[14rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          <Dropdown.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Input tracking
          </Dropdown.Label>
          {options.map((o) => {
            const ItemIcon = o.icon;
            return (
              <Dropdown.Item
                key={String(o.value)}
                onSelect={() => onSet(member, o.value)}
                className="flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-600 outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-slate-900"
              >
                <ItemIcon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{o.label}</span>
                {state === o.value && (
                  <Check className="h-4 w-4 text-[rgb(34_34_204)]" aria-hidden />
                )}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export function useMemberActions({
  onChanged,
  onEdit,
}: UseMemberActionsOptions): UseMemberActionsResult {
  const { user: me, role: viewerRole } = useSession();
  const myId = me?.id;
  const [passwordTarget, setPasswordTarget] = useState<SetPasswordTarget | null>(null);
  const [grantsTarget, setGrantsTarget] = useState<TeamMember | null>(null);
  const [departmentTarget, setDepartmentTarget] = useState<TeamMember | null>(null);

  const [statusTarget, setStatusTarget] = useState<MemberStatusTarget | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [screenshotsTarget, setScreenshotsTarget] = useState<MemberScreenshotsTarget | null>(null);
  const [screenshotsSaving, setScreenshotsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setIdle = useCallback(
    async (member: TeamMember, enabled: boolean | null) => {
      try {
        await setUserIdle(member.id, {
          enabled,
          minutes: enabled === null ? null : member.idleMinutes,
        });
        toast.success("Input tracking changed", {
          description:
            enabled === null
              ? `${member.name} follows the department setting.`
              : `${member.name}: ${enabled ? "on" : "off"}.`,
        });
        onChanged("updated");
      } catch (err) {
        toast.error("Couldn't change input tracking", {
          description: errorMessage(err) ?? "Please try again.",
        });
      }
    },
    [onChanged],
  );

  async function handleConfirmScreenshots() {
    if (!screenshotsTarget) return;
    const { member, enable } = screenshotsTarget;
    setScreenshotsSaving(true);
    try {
      await setUserScreenshots(String(member.id), enable);
      toast.success(enable ? "Screenshots turned on" : "Screenshots turned off", {
        description: enable
          ? `${member.name} will be screenshotted automatically again.`
          : `${member.name} will stop being screenshotted automatically. Tracking and manual capture still work.`,
      });
      setScreenshotsTarget(null);
      onChanged("updated");
    } catch (err) {
      toast.error("Couldn't change screenshots", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setScreenshotsSaving(false);
    }
  }

  async function handleConfirmStatus() {
    if (!statusTarget) return;
    const { member, block } = statusTarget;
    setStatusSaving(true);
    try {
      await setUserStatus(String(member.id), block ? "DISABLED" : "ACTIVE");
      toast.success(block ? "Member blocked" : "Member unblocked", {
        description: block
          ? `${member.name} can no longer sign in.`
          : `${member.name} can sign in again.`,
      });
      setStatusTarget(null);
      onChanged("updated");
    } catch (err) {
      toast.error(block ? "Couldn't block member" : "Couldn't unblock member", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(String(deleteTarget.id));
      toast.success("Member deleted", {
        description: `${deleteTarget.name} has been removed.`,
      });
      setDeleteTarget(null);
      onChanged("deleted");
    } catch (err) {
      toast.error("Couldn't delete", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const renderActions = useCallback(
    (m: TeamMember) => {
      const self = String(m.id) === myId;
      const manager = m.role === "MANAGER";
      const admin = m.role === "ADMIN" || m.role === "SUPER_ADMIN";
      if (!canChangeMember(viewerRole, myId, m)) {
        return (
          <div className="flex justify-end gap-2">
            {self ? (
              // Your own computer: the plain installer (the API issues none for yourself).
              <DownloadAgentRowButton userId={String(m.id)} userName={m.name} self />
            ) : (
              <span className="text-xs text-slate-400">No changes here</span>
            )}
          </div>
        );
      }
      return (
        <div className="flex justify-end gap-2">
          <ScreenshotsMemberButton member={m} onSelect={setScreenshotsTarget} />
          <IdleMemberButton member={m} onSet={setIdle} />
          <DownloadAgentRowButton userId={String(m.id)} userName={m.name} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(m);
            }}
            title="Edit member"
            aria-label={`Edit ${m.name}`}
            className={`${rowActionButtonClass} ${rowActionHover.primary}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {/* Rarer actions live in the menu so the row fits a laptop screen. */}
          <ActionMenu
            label={`More actions for ${m.name}`}
            triggerClassName={`${rowActionButtonClass} ${rowActionHover.primary} data-[state=open]:bg-slate-50`}
            items={[
              ...(admin
                ? []
                : [
                    {
                      label: manager ? "Departments" : "Department",
                      icon: Network,
                      onSelect: () => setDepartmentTarget(m),
                    },
                  ]),
              ...(manager
                ? [{ label: "Grants", icon: Eye, onSelect: () => setGrantsTarget(m) }]
                : []),
              // Your own password is changed from the user menu (it needs the current one).
              ...(!self
                ? [
                    {
                      label: "Set password",
                      icon: KeyRound,
                      onSelect: () => setPasswordTarget({ id: String(m.id), name: m.name }),
                    },
                  ]
                : []),
              ...(self
                ? []
                : [
                    m.status === "Inactive"
                      ? {
                          label: "Unblock member",
                          icon: LockOpen,
                          onSelect: () => setStatusTarget({ member: m, block: false }),
                        }
                      : {
                          label: "Block member",
                          icon: Lock,
                          onSelect: () => setStatusTarget({ member: m, block: true }),
                        },
                    {
                      label: "Delete member",
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => setDeleteTarget(m),
                    },
                  ]),
            ]}
          />
        </div>
      );
    },
    [myId, viewerRole, onEdit, setIdle],
  );

  const dialogs = (
    <>
      <SetPasswordModal target={passwordTarget} onClose={() => setPasswordTarget(null)} />
      <GrantsDialog
        member={grantsTarget}
        onClose={() => setGrantsTarget(null)}
        onSaved={() => onChanged("updated")}
      />
      <MemberDepartmentDialog
        member={departmentTarget}
        onClose={() => setDepartmentTarget(null)}
        onSaved={() => onChanged("updated")}
      />

      <ConfirmDialog
        open={screenshotsTarget !== null}
        onClose={() => {
          if (!screenshotsSaving) setScreenshotsTarget(null);
        }}
        onConfirm={handleConfirmScreenshots}
        loading={screenshotsSaving}
        title="Are you sure?"
        confirmLabel={
          screenshotsSaving
            ? screenshotsTarget?.enable
              ? "Turning on…"
              : "Turning off…"
            : screenshotsTarget?.enable
              ? "Turn on"
              : "Turn off"
        }
        description={
          screenshotsTarget ? (
            <>
              <span className="font-semibold text-slate-700">{screenshotsTarget.member.name}</span>{" "}
              {screenshotsTarget.enable
                ? "will be screenshotted automatically again, about every 5 minutes."
                : "will stop being screenshotted automatically. Activity tracking and manual capture are unaffected, and you can turn this back on at any time."}
            </>
          ) : null
        }
      />

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => {
          if (!statusSaving) setStatusTarget(null);
        }}
        onConfirm={handleConfirmStatus}
        loading={statusSaving}
        title="Are you sure?"
        confirmLabel={
          statusSaving
            ? statusTarget?.block
              ? "Blocking…"
              : "Unblocking…"
            : statusTarget?.block
              ? "Block"
              : "Unblock"
        }
        description={
          statusTarget ? (
            <>
              <span className="font-semibold text-slate-700">{statusTarget.member.name}</span>{" "}
              {statusTarget.block
                ? "will be signed out and blocked from signing in. You can unblock them at any time."
                : "will be able to sign in again."}
            </>
          ) : null
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        destructive
        title="Are you sure?"
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        description={
          deleteTarget ? (
            <>
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be
              permanently removed. This can&apos;t be undone.
            </>
          ) : null
        }
      />
    </>
  );

  return { renderActions, dialogs };
}
