/** Mirrors SPEC 3.1 section 3.3 (Meetings). Instants are ISO; `date` is a business day key. */
import type { BreakApprovalStatus } from "@/features/breaks/types";

export interface MeetingParticipant {
  /** Set when the participant is a person in the company; free names have none. */
  id?: string;
  name: string;
}

export type MeetingMode = "LIVE" | "PAST";

export interface MeetingRecordView {
  id: string;
  date: string;
  mode: MeetingMode;
  agenda: string;
  participants: MeetingParticipant[];
  startedAt: string;
  endedAt: string | null;
  inProgress: boolean;
  /** Live seconds while in progress, the total once ended. */
  durationSec: number;
  approvalStatus: BreakApprovalStatus;
  dueAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  decidedByName: string | null;
}

export interface ParticipantOption {
  id: string;
  name: string;
  department: string | null;
}
