"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { btnDanger, btnSecondary } from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { useDeleteShift } from "@/features/shifts/hooks/useShifts";
import { assignedToday } from "@/features/shifts/lib/usage";
import type { ShiftView } from "@/features/shifts/types";

interface Blocked {
  title: string;
  message: string;
  code?: string;
}

/** The default shift can never be deleted; say so before anyone tries. */
const DEFAULT_BLOCK: Blocked = {
  title: "This is the default shift",
  message: "Make another shift the default first.",
  code: "SHIFT_IS_DEFAULT",
};

/**
 * Confirms deleting a shift. The server refuses the default shift and any shift
 * still assigned, today or later (409 SHIFT_IS_DEFAULT / SHIFT_IN_USE). The
 * default is known here, so it is explained up front; for "in use" the server
 * has the full picture (future assignments too), so its answer is shown here,
 * with the way forward, instead of a toast that disappears.
 */
export function DeleteShiftDialog({
  shift,
  onClose,
}: {
  shift: ShiftView | null;
  onClose: () => void;
}) {
  const remove = useDeleteShift();
  const [refused, setRefused] = useState<Blocked | null>(null);
  const shiftId = shift?.id;

  useEffect(() => {
    setRefused(null);
    remove.reset();
    // Reset whenever another shift is picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  function close() {
    if (!remove.isPending) onClose();
  }

  async function confirm() {
    if (!shift) return;
    try {
      await remove.mutateAsync(shift.id);
      toast.success("Shift deleted", { description: `${shift.name} is gone.` });
      onClose();
    } catch (err) {
      const code = errorCode(err);
      const message = errorMessage(err) ?? "Please try again.";
      if (code === "SHIFT_IS_DEFAULT") {
        setRefused({ title: DEFAULT_BLOCK.title, message, code });
      } else if (code === "SHIFT_IN_USE") {
        setRefused({ title: "This shift is still in use", message, code });
      } else {
        setRefused({ title: "Couldn't delete the shift", message });
      }
    }
  }

  const pending = remove.isPending;
  const blocked = refused ?? (shift?.isDefault ? DEFAULT_BLOCK : null);
  const inUse = shift ? assignedToday(shift.usage) : null;

  return (
    <Modal open={shift !== null} onClose={close} title="Delete shift" className="max-w-md">
      <div className="space-y-4 px-6 py-5">
        {blocked ? (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div className="space-y-1.5">
              <p className="font-semibold">{blocked.title}</p>
              <p>{blocked.message}</p>
              {blocked.code === "SHIFT_IS_DEFAULT" && (
                <p>
                  Everyone whose department has no shift uses it. Pick another shift, then choose
                  Make default in its menu.
                </p>
              )}
              {blocked.code === "SHIFT_IN_USE" && (
                <Link
                  href="/dashboard/shifts/assign"
                  className="inline-block font-semibold text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                >
                  Go to Assign shifts
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm leading-relaxed text-slate-600">
            <p>
              Delete <span className="font-semibold text-slate-900">{shift?.name}</span>? Breaks
              already taken keep their record. This can&apos;t be undone.
            </p>
            {inUse && (
              <p className="text-amber-800">
                Today it&apos;s assigned to {inUse}. Move them to another shift first, or the delete
                will be refused.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={pending} className={btnSecondary}>
            {blocked ? "OK" : "Cancel"}
          </button>
          {!blocked && (
            <button type="button" onClick={confirm} disabled={pending} className={btnDanger}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              {pending ? "Deleting…" : "Delete shift"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
