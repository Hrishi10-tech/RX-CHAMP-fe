/** Whether an account may sign in. */
export type Status = "Active" | "Invited" | "Inactive";

const STATUS_STYLES: Record<Status, { pill: string; dot: string }> = {
  Active: {
    pill: "border-working-edge bg-working-wash text-working",
    dot: "bg-working",
  },
  Invited: {
    pill: "border-attention-edge bg-attention-wash text-attention",
    dot: "bg-attention",
  },
  Inactive: {
    pill: "border-card bg-fill text-quiet",
    dot: "bg-neutral",
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
