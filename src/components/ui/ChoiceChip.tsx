import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

/**
 * A choice drawn as the agent's chip (Button.chip, Button.chip.on): an outlined pill, teal outline,
 * teal text and the brand wash when chosen. Never a solid teal block (D-88). `on` sets aria-pressed.
 */
export const ChoiceChip = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }
>(function ChoiceChip({ on, className, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={on}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-full border px-3 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-40 max-sm:h-11 max-sm:px-4",
        on
          ? "border-brand bg-brand/10 text-brand hover:bg-brand/18"
          : "border-card bg-transparent text-primary hover:bg-fill",
        className,
      )}
      {...rest}
    />
  );
});
