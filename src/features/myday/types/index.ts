/**
 * 4.1: Staff's own pages on the portal (Today, History, Calendar), the phone app's tabs.
 * Day keys "YYYY-MM-DD", instants ISO, durations in seconds.
 */
import type { FocusAdjustmentView } from "@/features/adjustments/types";
import type { BreakRecordView } from "@/features/breaks/types";
import type { MeetingRecordView } from "@/features/meetings/types";
import type {
  DayPunchView,
  PersonDaySummary,
  ReportPerson,
  TimelineSegment,
} from "@/features/reports/types";
import type { ShiftRef } from "@/features/shifts/types";

/** `GET /reports/me/day?date=`: the signed-in person's own day, no activity figures. */
export interface MyDayReport {
  person: ReportPerson;
  summary: PersonDaySummary;
  shift: ShiftRef | null;
  timeline: TimelineSegment[];
  breaks: BreakRecordView[];
  meetings: MeetingRecordView[];
  /** Manual focus adjustments of the day still in force. */
  adjustments: FocusAdjustmentView[];
  /** A biometric person's punches, oldest first; [] for an agent day. */
  punches: DayPunchView[];
}

/** What marks a day on Staff's year: leave or work from home, approved or waiting. */
export interface DayMark {
  kind: "LEAVE" | "WFH";
  /** "CL/SL", "Work from home", with the part when not a full day. */
  label: string;
  pending: boolean;
}
