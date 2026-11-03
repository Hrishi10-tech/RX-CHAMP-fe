import type { ChipTone } from "@/components/ui/Chip";
import type {
  AgentHealthFlag,
  AgentHealthRow,
  AgentLiveStatus,
} from "@/features/agentHealth/types";

/** Each flag in plain English: what is wrong and what to do about it. */
export const FLAG_COPY: Record<AgentHealthFlag, { label: string; tone: ChipTone; help: string }> = {
  NEVER_REPORTED: {
    label: "Agent never seen",
    tone: "danger",
    help: "No request has ever come from this person's agent. Install it, or check they can sign in.",
  },
  SIGNED_OUT: {
    label: "Signed out",
    tone: "warning",
    help: "No live sign-in: the agent cannot call until the person signs in again.",
  },
  AGENT_OFFLINE: {
    label: "Agent offline",
    tone: "danger",
    help: "The day is open but the agent has not called for over 5 minutes: the computer is asleep, off, or the agent stopped.",
  },
  DAY_NOT_STARTED: {
    label: "No Start Day",
    tone: "warning",
    help: "The agent is running and the shift began over 30 minutes ago, but the person never pressed Start Day. Nothing is tracked or captured until they do.",
  },
  SCREENSHOTS_OFF: {
    label: "Screenshots off",
    tone: "neutral",
    help: "Automatic screenshots are switched off for this person (Team Management).",
  },
  NO_SCREENSHOTS_TODAY: {
    label: "No screenshots today",
    tone: "danger",
    help: "The day has been running over 30 minutes with screenshots on, and none arrived. Check the agent's capture setting and the last refusal, if any.",
  },
  SCREENSHOTS_STALE: {
    label: "Screenshots stopped",
    tone: "warning",
    help: "Screenshots arrived earlier today but none for over 45 minutes while the day is open and the agent is alive.",
  },
  UPLOAD_REFUSED: {
    label: "Upload refused",
    tone: "danger",
    help: "The last screenshot the server saw from this agent was refused. The reason is shown on the row.",
  },
  OLD_AGENT: {
    label: "Old agent",
    tone: "neutral",
    help: "An agent older than 3.1: no Start Day, legacy tracking. Update it.",
  },
};

export const STATUS_COPY: Record<AgentLiveStatus, { label: string; tone: ChipTone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  IDLE: { label: "Idle", tone: "warning" },
  OFFLINE: { label: "Offline", tone: "neutral" },
  NEVER: { label: "Never seen", tone: "danger" },
};

export const DAY_COPY: Record<AgentHealthRow["day"]["state"], string> = {
  NOT_STARTED: "Not started",
  OPEN: "Running",
  ENDED: "Ended",
};

/** "413: Screenshot is 33.0 MB; the limit is 32 MB." */
export function refusalText(r: NonNullable<AgentHealthRow["screenshots"]["lastRefusal"]>): string {
  const what =
    r.code === "TOO_LARGE"
      ? "too large"
      : r.code === "NOT_AN_IMAGE"
        ? "not an image"
        : r.code === "AUTO_OFF"
          ? "screenshots switched off"
          : r.code === "DAY_ENDED"
            ? "after End Day"
            : r.code === "EMPTY" || r.code === "NO_FILE"
              ? "empty upload"
              : r.code.toLowerCase().replace(/_/g, " ");
  const size = r.bytes != null ? ` (${(r.bytes / 1048576).toFixed(1)} MB)` : "";
  return `${what}${size}: ${r.reason}`;
}

/** The rows with something to look at first, then by name. */
export function sortRows(rows: AgentHealthRow[]): AgentHealthRow[] {
  return [...rows].sort((a, b) => b.flags.length - a.flags.length || a.name.localeCompare(b.name));
}
