"use client";

import { useCallback, useState } from "react";
import { Camera, CameraOff, Lock, LockOpen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { rowActionButtonClass, rowActionHover } from "@/components/ui/rowAction";
import { errorMessage } from "@/lib/api";
import { DownloadAgentRowButton } from "@/features/agent/components/DownloadAgentRowButton";
import { deleteUser } from "@/features/users/api/deleteUser";
import { setUserScreenshots } from "@/features/users/api/setUserScreenshots";
import { setUserStatus } from "@/features/users/api/setUserStatus";
import { EditMemberModal } from "@/features/users/components/EditMemberModal";
import type {
  MemberChange,
  MemberStatusTarget,
  UseMemberActionsOptions,
  UseMemberActionsResult,
} from "@/features/users/types";
import type { TeamMember } from "@/types";


function BlockMemberButton({
  member,
  onSelect,
}: {
  member: TeamMember;
  onSelect: (target: MemberStatusTarget) => void;
}) {
  const blocked = member.status === "Inactive";
  const Icon = blocked ? Lock : LockOpen;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ member, block: !blocked });
      }}
      title={blocked ? "Unblock member" : "Block member"}
      aria-label={`${blocked ? "Unblock" : "Block"} ${member.name}`}
      className={`${rowActionButtonClass} ${
        blocked ? rowActionHover.success : rowActionHover.warning
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}


/**
 * Turns this member's automatic screenshots on or off. Saves on click — there is no
 * confirm step, because it is trivially reversible and a manager may flip several
 * people in a row.
 *
 * Only the periodic capture is affected: activity tracking carries on, and the
 * Capture button on the screenshots timeline still works either way. The tooltip
 * says so, so nobody expects this to stop tracking.
 */
function ScreenshotsMemberButton({
  member,
  onChanged,
}: {
  member: TeamMember;
  onChanged: (change: MemberChange) => void;
}) {
  const [saving, setSaving] = useState(false);
  const enabled = member.screenshotsEnabled;
  const Icon = enabled ? Camera : CameraOff;

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (saving) return;

    setSaving(true);
    try {
      await setUserScreenshots(String(member.id), !enabled);
      toast.success(enabled ? "Screenshots turned off" : "Screenshots turned on", {
        description: enabled
          ? `${member.name} will stop being screenshotted automatically. Tracking and manual capture still work.`
          : `${member.name} will be screenshotted automatically again.`,
      });
      onChanged("updated");
    } catch (err) {
      toast.error("Couldn't change screenshots", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      title={enabled ? "Screenshots on — click to turn off" : "Screenshots off — click to turn on"}
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

export function useMemberActions({ onChanged }: UseMemberActionsOptions): UseMemberActionsResult {
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const [statusTarget, setStatusTarget] = useState<MemberStatusTarget | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    (m: TeamMember) => (
      <div className="flex justify-end gap-2">
        <ScreenshotsMemberButton member={m} onChanged={onChanged} />
        <DownloadAgentRowButton userId={String(m.id)} userName={m.name} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(m);
          }}
          title="Edit member"
          aria-label={`Edit ${m.name}`}
          className={`${rowActionButtonClass} ${rowActionHover.primary}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <BlockMemberButton member={m} onSelect={setStatusTarget} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(m);
          }}
          title="Delete member"
          aria-label={`Delete ${m.name}`}
          className={`${rowActionButtonClass} ${rowActionHover.danger}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ),
    [onChanged],
  );

  const dialogs = (
    <>
      <EditMemberModal
        open={editing !== null}
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={() => onChanged("updated")}
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
