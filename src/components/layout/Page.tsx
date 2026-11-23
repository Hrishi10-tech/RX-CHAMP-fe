import type { HTMLAttributes } from "react";

import { cn } from "@/components/ui/cn";

/**
 * A page's width (W-32): one width for forms and single-record pages, centred; dashboards and
 * lists use the whole content area. Pages used to pick 4xl, 5xl or 6xl each.
 */
export function Page({
  width = "wide",
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { width?: "form" | "wide" }) {
  return (
    <div
      className={cn(width === "form" ? "mx-auto w-full max-w-5xl" : "w-full", className)}
      {...rest}
    />
  );
}
