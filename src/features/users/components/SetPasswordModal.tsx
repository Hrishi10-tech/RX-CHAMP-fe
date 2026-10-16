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
import { errorMessage } from "@/lib/api";
import { PASSWORD_RULE, newPasswordProblem } from "@/features/auth/lib/passwordRules";
import { setUserPassword } from "@/features/users/api/setUserPassword";

export interface SetPasswordTarget {
  id: string;
  name: string;
}

/**
 * Sets a new password for someone else: a Super Admin for anyone, a Manager for
 * their own staff. The person is not told the password; hand it over privately.
 */
export function SetPasswordModal({
  target,
  onClose,
}: {
  target: SetPasswordTarget | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [signOutEverywhere, setSignOutEverywhere] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { id: string; password: string; signOut: boolean }) =>
      setUserPassword(vars.id, vars.password, vars.signOut),
  });

  const targetId = target?.id;
  useEffect(() => {
    if (!targetId) return;
    setPassword("");
    setSignOutEverywhere(false);
    setError(null);
    mutation.reset();
    // Reset when a different person is picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  function close() {
    if (!mutation.isPending) onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    const problem = newPasswordProblem(password);
    setError(problem);
    if (problem) return;
    try {
      const result = await mutation.mutateAsync({
        id: target.id,
        password,
        signOut: signOutEverywhere,
      });
      toast.success("Password set", {
        description: result.signedOut
          ? `${target.name} was signed out everywhere and must sign in with the new password.`
          : `Share it with ${target.name} privately. They can change it from their user menu.`,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err) ?? "Couldn't set the password. Please try again.");
    }
  }

  const pending = mutation.isPending;

  return (
    <Modal
      open={target !== null}
      onClose={close}
      title="Set password"
      description={target ? `For ${target.name}.` : undefined}
      className="max-w-md"
    >
      <form onSubmit={submit} noValidate className="space-y-4 px-6 py-5">
        <div>
          <label htmlFor="sp-password" className={labelBase}>
            New password
          </label>
          <PasswordField
            id="sp-password"
            data-autofocus
            autoComplete="new-password"
            value={password}
            invalid={!!error}
            aria-describedby="sp-password-hint"
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
          <p id="sp-password-hint" className={error ? errorText : hintBase}>
            {error ?? PASSWORD_RULE}
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className={`${checkboxBase} mt-0.5`}
            checked={signOutEverywhere}
            onChange={(e) => setSignOutEverywhere(e.target.checked)}
            disabled={pending}
          />
          <span>
            Sign them out everywhere
            <span className="block text-xs text-slate-500">
              Use this if the account may be compromised. Their desktop app signs out too.
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
            {pending ? "Setting…" : "Set password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
