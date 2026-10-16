import { Chip } from "@/components/ui/Chip";
import {
  APPROVAL_LABEL,
  APPROVAL_TONE,
  cellStatusLook,
  timingLabel,
  timingTone,
} from "@/features/breaks/lib/labels";
import type { BreakApprovalStatus, BreakRecordView, TeamCellStatus } from "@/features/breaks/types";

export function TimingChip({ record }: { record: Pick<BreakRecordView, "timing" | "minutesOff"> }) {
  return <Chip tone={timingTone(record.timing)}>{timingLabel(record)}</Chip>;
}

/** Nothing for NOT_REQUIRED unless `showNotRequired`: an on-time break needs no badge. */
export function ApprovalChip({
  status,
  showNotRequired = false,
}: {
  status: BreakApprovalStatus;
  showNotRequired?: boolean;
}) {
  if (status === "NOT_REQUIRED" && !showNotRequired) return null;
  return (
    <Chip tone={APPROVAL_TONE[status]} dot={status === "PENDING"}>
      {APPROVAL_LABEL[status]}
    </Chip>
  );
}

export function CellStatusChip({ status }: { status: TeamCellStatus }) {
  const { label, tone } = cellStatusLook(status);
  return (
    <Chip
      tone={tone}
      dot={status === "IN_PROGRESS" || status === "OPEN"}
      pulse={status === "IN_PROGRESS"}
    >
      {label}
    </Chip>
  );
}
