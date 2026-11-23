import { forwardRef, type ButtonHTMLAttributes } from "react";

import { focusRing } from "@/components/ui/classes";
import { cn } from "@/components/ui/cn";

/**
 * A button that is only an icon (step back a day, close, open a row): square, 40 px, and 44 px on
 * a phone (U-4). `label` is required: an icon alone says nothing to a screen reader.
 */
export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  /** "plain" sits on a card; "boxed" carries the card border (a stepper on its own). */
  variant?: "plain" | "boxed";
};

export const iconButtonClass = (variant: "plain" | "boxed" = "plain", className?: string) =>
  cn(
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-quiet transition hover:bg-panel hover:text-strong disabled:cursor-not-allowed disabled:opacity-40 max-sm:h-11 max-sm:w-11",
    variant === "boxed" && "border border-card bg-fill text-primary hover:bg-edge",
    focusRing,
    className,
  );

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "plain", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={iconButtonClass(variant, className)}
      {...rest}
    />
  );
});
