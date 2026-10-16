"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/ui/PasswordField";
import {
  btnPrimary,
  btnSecondary,
  checkboxBase,
  errorText,
  hintBase,
  labelBase,
} from "@/components/ui/classes";
import { errorCode, errorMessage } from "@/lib/api";
import { changePassword } from "@/features/auth/api/changePassword";
import { PASSWORD_RULE, newPasswordProblem } from "@/features/auth/lib/passwordRules";

interface FieldErrors {
  current?: string;
  next?: string;
  confirm?: string;
}

/** "Change password" from the user menu. Needs the current password. */
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({ mutationFn: changePassword });

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setSignOutOthers(false);
    setErrors({});
    mutation.reset();
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (!mutation.isPending) onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: FieldErrors = {};
    if (!current) found.current = "Enter your current password.";
    const problem = newPasswordProblem(next);
    if (problem) found.next = problem;
    else if (next === current) found.next = "Pick a password you are not using now.";
    if (!found.next && confirm !== next) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      const result = await mutation.mutateAsync({
        currentPassword: current,
        newPassword: next,
        signOutOtherDevices: signOutOthers,
      });
      toast.success("Password changed", {
        description: result.signedOutOtherDevices
          ? "You stay signed in here. Every other device, the desktop app too, must sign in again."
          : "You stay signed in here and on your other devices.",
      });
      onClose();
    } catch (err) {
      const code = errorCode(err);
      const message = errorMessage(err) ?? "Please try again.";
      if (code === "WRONG_PASSWORD") setErrors({ current: message });
      else if (code === "WEAK_PASSWORD" || code === "SAME_PASSWORD") setErrors({ next: message });
      else toast.error("Couldn't change your password", { description: message });
    }
  }

  const pending = mutation.isPending;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      description="Use something you don't use anywhere else."
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        <div>
          <label htmlFor="cp-current" className={labelBase}>
            Current password
          </label>
          <PasswordField
            id="cp-current"
            data-autofocus
            autoComplete="current-password"
            value={current}
            invalid={!!errors.current}
            aria-describedby={errors.current ? "cp-current-error" : undefined}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={pending}
          />
          {errors.current && (
            <p id="cp-current-error" className={errorText}>
              {errors.current}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cp-next" className={labelBase}>
            New password
          </label>
          <PasswordField
            id="cp-next"
            autoComplete="new-password"
            value={next}
            invalid={!!errors.next}
            aria-describedby="cp-next-hint"
            onChange={(e) => setNext(e.target.value)}
            disabled={pending}
          />
          <p id="cp-next-hint" className={errors.next ? errorText : hintBase}>
            {errors.next ?? PASSWORD_RULE}
          </p>
        </div>

        <div>
          <label htmlFor="cp-confirm" className={labelBase}>
            Confirm new password
          </label>
          <PasswordField
            id="cp-confirm"
            autoComplete="new-password"
            value={confirm}
            invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "cp-confirm-error" : undefined}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={pending}
          />
          {errors.confirm && (
            <p id="cp-confirm-error" className={errorText}>
              {errors.confirm}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className={`${checkboxBase} mt-0.5`}
            checked={signOutOthers}
            onChange={(e) => setSignOutOthers(e.target.checked)}
            disabled={pending}
          />
          <span>
            Sign out my other devices
            <span className="block text-xs text-slate-500">
              The desktop app too. This device stays signed in.
            </span>
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} disabled={pending} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden />
            )}
            {pending ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
