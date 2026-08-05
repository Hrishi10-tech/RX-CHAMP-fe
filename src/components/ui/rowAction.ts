/**
 * Shared look for the square icon buttons in a table's Actions column.
 * One neutral background for every action; only the hover tint differs, so the
 * row reads as a set rather than a row of coloured chips.
 */
export const rowActionButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:opacity-70";

export const rowActionHover = {
  primary: "hover:text-[rgb(34_34_204)]",
  danger: "hover:text-red-600",
  warning: "hover:text-amber-600",
  success: "hover:text-emerald-600",
} as const;
