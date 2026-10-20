"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { btnPrimary, btnSecondary, errorText } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { NO_GRANTS, type Grants } from "@/constants/roles";
import { DepartmentPicker } from "@/features/departments/components/DepartmentPicker";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { setUserGrants } from "@/features/users/api/access";
import { updateUser } from "@/features/users/api/updateUser";
import { GrantsEditor } from "@/features/users/components/GrantsEditor";
import type { TeamMember } from "@/types";

function Footer({
  onClose,
  saving,
  label,
}: {
  onClose: () => void;
  saving: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
      <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
        Cancel
      </button>
      <button type="submit" className={btnPrimary} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {label}
      </button>
    </div>
  );
}

/** A manager's view grants (SPEC 5.3 `POST /users/:id/grants`). */
export function GrantsDialog({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [grants, setGrants] = useState<Grants>(NO_GRANTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) setGrants({ ...member.grants });
  }, [member]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setSaving(true);
    try {
      await setUserGrants(member.id, grants);
      const any = grants.screenshots || grants.timeline || grants.activity;
      toast.success("Access saved", {
        description: any
          ? `${member.name} sees the Team page with what you allowed.`
          : `${member.name} no longer sees the Team page.`,
      });
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Couldn't save the access", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={member !== null}
      onClose={() => !saving && onClose()}
      title="What this manager can see"
      description={
        member
          ? `${member.name}: for staff in ${member.departments.map((d) => d.name).join(", ") || "their departments"}. Managers never edit people.`
          : undefined
      }
      className="max-w-lg"
    >
      <form onSubmit={save}>
        <div className="px-6 py-5">
          <GrantsEditor value={grants} onChange={setGrants} disabled={saving} />
        </div>
        <Footer onClose={onClose} saving={saving} label="Save access" />
      </form>
    </Modal>
  );
}

/** Moves a person to another department (staff: one; a manager: any number). */
export function MemberDepartmentDialog({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const departments = useDepartments(member !== null);
  const [ids, setIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const manager = member?.role === "MANAGER";

  useEffect(() => {
    if (member) {
      setIds(member.departments.map((d) => d.id));
      setError(null);
    }
  }, [member]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (ids.length === 0) {
      setError(manager ? "Pick at least one department." : "Pick a department.");
      return;
    }
    setSaving(true);
    try {
      await updateUser(member.id, manager ? { departmentIds: ids } : { departmentId: ids[0] });
      toast.success("Department changed", { description: member.name });
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err) ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={member !== null}
      onClose={() => !saving && onClose()}
      title={manager ? "Departments" : "Department"}
      description={member ? member.name : undefined}
      className="max-w-lg"
    >
      <form onSubmit={save}>
        <div className="px-6 py-5">
          <DepartmentPicker
            departments={departments.data ?? []}
            value={ids}
            onChange={(next) => {
              setIds(next);
              setError(null);
            }}
            multiple={manager}
            label={manager ? "Departments" : "Department"}
            invalid={Boolean(error)}
          />
          {error && <p className={errorText}>{error}</p>}
        </div>
        <Footer onClose={onClose} saving={saving} label="Save" />
      </form>
    </Modal>
  );
}
