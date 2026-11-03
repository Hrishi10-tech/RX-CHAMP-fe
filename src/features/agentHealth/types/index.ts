/**
 * Agent health (3.3): per person, is the desktop agent reaching the server, is
 * the day running, are screenshots arriving. Built so "screenshots only work
 * for some people" can be traced to the person and the cause.
 */
export type AgentHealthFlag =
  | "NEVER_REPORTED"
  | "SIGNED_OUT"
  | "AGENT_OFFLINE"
  | "DAY_NOT_STARTED"
  | "SCREENSHOTS_OFF"
  | "NO_SCREENSHOTS_TODAY"
  | "SCREENSHOTS_STALE"
  | "UPLOAD_REFUSED"
  | "OLD_AGENT";

export type AgentLiveStatus = "ACTIVE" | "IDLE" | "OFFLINE" | "NEVER";

export interface UploadRefusalView {
  at: string;
  status: number;
  code: string;
  reason: string;
  bytes: number | null;
}

export interface AgentHealthRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  /** 4.0: scope is by department; there is no manager line. */
  departmentId: string | null;
  companyId: string | null;
  companyName: string | null;
  agent: {
    version: string | null;
    signedIn: boolean;
    lastContactAt: string | null;
    lastSampleAt: string | null;
    lastActiveAt: string | null;
    samplesToday: number;
    status: AgentLiveStatus;
  };
  day: {
    state: "NOT_STARTED" | "OPEN" | "ENDED";
    startedAt: string | null;
    endedAt: string | null;
    workday: boolean;
    shiftStart: string | null;
  };
  screenshots: {
    enabled: boolean;
    lastAt: string | null;
    today: number;
    lastRefusal: UploadRefusalView | null;
  };
  flags: AgentHealthFlag[];
}

export interface AgentHealthSummary {
  people: number;
  tracking: number;
  offline: number;
  notStarted: number;
  ended: number;
  screenshotsOff: number;
  noScreenshots: number;
  refused: number;
}

export interface AgentHealthView {
  date: string;
  /** The organisation in view; null when "All organisations" is (rows carry companyName). */
  organisationId: string | null;
  timezone: string;
  asOf: string;
  summary: AgentHealthSummary;
  rows: AgentHealthRow[];
}

export interface GetAgentHealthParams {
  /** Super Admin or Super Manager: one organisation (default: the one in view, or all). */
  companyId?: string;
  /** One department the viewer may see. */
  departmentId?: string;
  /** Only people with at least one flag. */
  problemsOnly?: boolean;
}
