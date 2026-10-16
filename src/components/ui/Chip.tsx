import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type ChipTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  /** Filled, for an effect that has been applied (an approval added minutes back). */
  | "successSolid"
  | "dangerSolid";

const TONE: Record<ChipTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  brand: "border-[rgba(34,34,204,0.25)] bg-[rgba(34,34,204,0.06)] text-[rgb(34_34_204)]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  successSolid: "border-emerald-600 bg-emerald-600 text-white",
  dangerSolid: "border-rose-600 bg-rose-600 text-white",
};

const DOT: Record<ChipTone, string> = {
  neutral: "bg-slate-400",
  brand: "bg-[rgb(34_34_204)]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  violet: "bg-violet-500",
  successSolid: "bg-white",
  dangerSolid: "bg-white",
};

/** A small status label, in the shape the members table already uses for its pills. */
export function Chip({
  tone = "neutral",
  icon: Icon,
  dot = false,
  pulse = false,
  title,
  className = "",
  wrap = false,
  children,
}: {
  tone?: ChipTone;
  icon?: LucideIcon;
  /** A coloured dot before the text (for live states). */
  dot?: boolean;
  /** Animate the dot, for something happening right now. */
  pulse?: boolean;
  title?: string;
  className?: string;
  /** Let a long label wrap onto more lines instead of being cut off. */
  wrap?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
        wrap ? "whitespace-normal" : "whitespace-nowrap"
      } ${TONE[tone]} ${className}`}
    >
      {dot && (
        <span aria-hidden className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOT[tone]}`}
            />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
        </span>
      )}
      {Icon && <Icon aria-hidden className="h-3 w-3 shrink-0" />}
      <span className={wrap ? "min-w-0 break-words" : "truncate"}>{children}</span>
    </span>
  );
}
