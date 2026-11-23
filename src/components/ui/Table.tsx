import type { ThHTMLAttributes } from "react";

import { thBase } from "@/components/ui/classes";
import { cn } from "@/components/ui/cn";

/** A table header cell, as DataTable draws them. */
export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn(thBase, className)} {...rest} />;
}
