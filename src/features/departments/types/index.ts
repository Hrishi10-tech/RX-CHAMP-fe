/** SPEC 5.2 `GET /departments`. */
export interface DepartmentIdle {
  /** null = the organisation's default. */
  enabled: boolean | null;
  minutes: number | null;
  reasonKeys: string[] | null;
}

export interface DepartmentView {
  id: string;
  name: string;
  icon: string;
  staffCount: number;
  managers: { id: string; name: string }[];
  idle: DepartmentIdle;
}

export interface DepartmentInput {
  name: string;
  icon: string;
}
