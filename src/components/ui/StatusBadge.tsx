/** Whether an account may sign in. */
export type Status = "Active" | "Invited" | "Inactive";

const STATUS_STYLES: Record<Status, { pill: string; dot: string }> = {
  Active: {
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Invited: {
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  Inactive: {
    pill: "border-slate-200 bg-slate-50 text-slate-500",
    dot: "bg-slate-400",
  },
};

export const STATUS_DOT: Record<Status, string> = {
  Active: STATUS_STYLES.Active.dot,
  Invited: STATUS_STYLES.Invited.dot,
  Inactive: STATUS_STYLES.Inactive.dot,
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Inactive;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border py-1 pl-2.5 pr-3 text-xs font-semibold shadow-sm ${s.pill}`}
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
