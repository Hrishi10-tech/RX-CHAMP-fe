/** SPEC 2.5 / 5.5 `GET /idle-settings`. */
export type ReasonKind = "BREAK" | "THINKING" | "MEETING" | "HARDWARE" | "OTHER" | "CUSTOM";

export interface IdleReason {
  key: string;
  label: string;
  kind: ReasonKind | string;
  builtIn: boolean;
}

export interface DepartmentIdleSetting {
  departmentId: string;
  /** null = the organisation's default. */
  enabled: boolean | null;
  minutes: number | null;
  reasonKeys: string[] | null;
}

export interface IdleSettings {
  defaultEnabled: boolean;
  defaultMinutes: number;
  reasons: IdleReason[];
  departments: DepartmentIdleSetting[];
}
