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
  neutral: "border-card bg-fill text-soft",
  brand: "border-brand/25 bg-brand/6 text-brand",
  success: "border-working-edge bg-working-wash text-working",
  warning: "border-attention-edge bg-attention-wash text-attention-ink",
  danger: "border-attention-edge bg-attention-wash text-attention",
  info: "border-brand-edge bg-brand-wash text-brand",
  violet: "border-meeting-edge bg-meeting-wash text-meeting",
  successSolid: "border-working bg-working text-on-brand",
  dangerSolid: "border-attention bg-attention text-on-brand",
};

const DOT: Record<ChipTone, string> = {
  neutral: "bg-neutral",
  brand: "bg-brand",
  success: "bg-working",
  warning: "bg-attention",
  danger: "bg-attention",
  info: "bg-brand",
  violet: "bg-meeting",
  successSolid: "bg-card",
  dangerSolid: "bg-card",
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
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold ${
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
