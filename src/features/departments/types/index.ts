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
  /** 4.1: one computer shared between shifts (shift-end question, automatic sign-out). */
  sharedComputer: boolean;
}

export interface DepartmentInput {
  name: string;
  icon: string;
  sharedComputer?: boolean;
}
