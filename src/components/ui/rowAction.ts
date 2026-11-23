/**
 * Shared look for the square icon buttons in a table's Actions column.
 * One neutral background for every action; only the hover tint differs, so the
 * row reads as a set rather than a row of coloured chips.
 */
export const rowActionButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-card bg-card text-soft shadow-sm transition-colors hover:bg-fill focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 disabled:opacity-70";

export const rowActionHover = {
  primary: "hover:text-brand",
  danger: "hover:text-attention",
  warning: "hover:text-attention",
  success: "hover:text-working",
} as const;
