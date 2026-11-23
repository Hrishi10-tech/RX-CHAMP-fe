import { forwardRef, type ButtonHTMLAttributes } from "react";

import {
  btnDanger,
  btnDangerOutline,
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnSmall,
  btnSuccess,
} from "@/components/ui/classes";
import { cn } from "@/components/ui/cn";

/**
 * The portal's buttons, in the agent's control styles (D-88, D-89):
 * - primary: the one filled teal button on a screen, the dark brand label
 * - secondary: the neutral fill, for everything else that matters
 * - attention: an amber confirm for a destructive step (there is no red); attention-outline its quiet form
 * - success: a green confirm (Approve)
 * - ghost: a teal text button
 * - small: the bordered button of table rows and cards
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "attention"
  | "attention-outline"
  | "ghost"
  | "small";

const VARIANT: Record<ButtonVariant, string> = {
  primary: btnPrimary,
  secondary: btnSecondary,
  success: btnSuccess,
  attention: btnDanger,
  "attention-outline": btnDangerOutline,
  ghost: btnGhost,
  small: btnSmall,
};

/** A button's classes, for a link or label that must look like one. */
export function buttonClass(variant: ButtonVariant = "secondary", className?: string) {
  return cn(VARIANT[variant], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

/** A native button: `type` is passed through as written (a button in a form still submits by default). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className, ...rest },
  ref,
) {
  return <button ref={ref} className={buttonClass(variant, className)} {...rest} />;
});
