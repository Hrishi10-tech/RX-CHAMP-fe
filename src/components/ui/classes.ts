/**
 * The portal's recurring control styles, named once so new screens match the
 * existing ones (Team management, Add member, the member dialogs) without copying
 * long class strings around.
 */

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35";

/** U-4: on a phone (under 640 px) a control is at least 44 px on its short side. */
export const touch = "max-sm:min-h-11";

export const btnPrimary = `${touch} inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnSecondary = `${touch} inline-flex items-center justify-center gap-2 rounded-lg border border-card bg-fill px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-edge disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnSuccess = `${touch} inline-flex items-center justify-center gap-2 rounded-lg bg-working px-4 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition hover:bg-working disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnDanger = `${touch} inline-flex items-center justify-center gap-2 rounded-lg bg-attention px-4 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition hover:bg-attention-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnDangerOutline = `${touch} inline-flex items-center justify-center gap-2 rounded-lg border border-attention-edge bg-card px-4 py-2.5 text-sm font-semibold text-attention shadow-sm transition hover:bg-attention-wash disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const btnGhost = `${touch} inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-brand transition hover:bg-brand/6 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

/** Small bordered button for table rows and cards. */
export const btnSmall = `${touch} inline-flex items-center justify-center gap-1.5 rounded-lg border border-card bg-card px-3 py-1.5 text-[0.8125rem] font-semibold text-body shadow-sm transition hover:bg-fill disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const inputBase =
  "h-11 w-full rounded-lg border border-card bg-field px-3 text-sm font-semibold text-primary shadow-sm outline-none transition placeholder:font-normal placeholder:text-neutral focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-fill disabled:text-quiet";

// A value that needs a look: amber, not red (the old focus ring here was red, D-89).
export const inputInvalid = "border-attention focus:border-attention focus:ring-attention/15";

export const textareaBase =
  "w-full rounded-lg border border-card bg-field px-3 py-2.5 text-sm text-primary shadow-sm outline-none transition placeholder:text-neutral focus:border-brand focus:ring-2 focus:ring-brand/15";

export const labelBase = "text-sm font-semibold text-body";

export const hintBase = "mt-1.5 text-xs text-quiet";

export const errorText = "mt-1.5 text-xs text-attention";

export const cardBase = "rounded-2xl border border-card bg-card shadow-sm";

export const checkboxBase =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-edge-strong accent-brand max-sm:h-6 max-sm:w-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35";

/** Table header cell, matching DataTable. */
export const thBase = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-soft";
