/**
 * The portal's recurring control styles, named once so new screens match the
 * existing ones (Team Management, Add Member, the member dialogs) without copying
 * long class strings around.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]";

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-lg bg-[rgb(34_34_204)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[rgb(28_28_180)] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnSuccess = `inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnDanger = `inline-flex items-center justify-center gap-2 rounded-lg bg-[rgb(236_43_120)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[rgb(214_31_104)] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnDangerOutline = `inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnGhost = `inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-[rgb(34_34_204)] transition hover:bg-[rgba(34,34,204,0.06)] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

/** Small bordered button for table rows and cards. */
export const btnSmall = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const inputBase =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[rgb(34_34_204)] focus:ring-2 focus:ring-[rgba(34,34,204,0.15)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const inputInvalid = "border-red-400 focus:border-red-500 focus:ring-[rgba(239,68,68,0.15)]";

export const textareaBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[rgb(34_34_204)] focus:ring-2 focus:ring-[rgba(34,34,204,0.15)]";

export const labelBase = "text-sm font-semibold text-slate-700";

export const hintBase = "mt-1.5 text-xs text-slate-500";

export const errorText = "mt-1.5 text-xs text-red-600";

export const cardBase = "rounded-2xl border border-slate-200 bg-white shadow-sm";

export const checkboxBase =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[rgb(34_34_204)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]";

/** Table header cell, matching DataTable. */
export const thBase =
  "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600";
