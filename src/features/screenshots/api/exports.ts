import { apiClient, type ApiResponse } from "@/lib/api";
import { unwrap } from "@/lib/api/list";

/** Screenshot reports, monthly archives and monthly deletion (3.2, fixes 6 and 7). */

export type ExportKind = "PERSON_REPORT" | "MONTH_ARCHIVE" | "MONTH_PURGE";
export type ExportStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELLED";
export type ReportMode = "DAY" | "RANGE" | "MONTH" | "TIME_WINDOW";

export interface ExportJobView {
  id: string;
  kind: ExportKind;
  status: ExportStatus;
  title: string;
  userId: string | null;
  month: string | null;
  total: number;
  done: number;
  missing: number;
  progress: { fraction: number; etaSec: number | null; elapsedSec: number };
  stage: string;
  bytes: number;
  fileName: string | null;
  downloadable: boolean;
  complete: boolean;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  downloadedAt: string | null;
  expiresAt: string | null;
}

export interface ReportRequest {
  userId: string;
  mode: ReportMode;
  date?: string;
  fromDate?: string;
  toDate?: string;
  month?: string;
  fromTime?: string;
  toTime?: string;
}

export interface ReportEstimate {
  total: number;
  estimatedSec: number;
  estimatedBytes: number;
  periodLabel: string;
}

export interface MonthArchiveView {
  month: string;
  label: string;
  ended: boolean;
  screenshots: number;
  dueBy: string;
  overdue: boolean;
  latestArchive: ExportJobView | null;
  qualifyingArchive: ExportJobView | null;
  deletable: number;
  newerThanArchive: number;
  canDelete: boolean;
  deleteBlockedBy: string | null;
  deleteBlockedText: string | null;
  lastPurge: ExportJobView | null;
  running: ExportJobView | null;
}

export interface ArchiveNudge {
  month: string;
  label: string;
  screenshots: number;
  dueBy: string;
  overdue: boolean;
  step: "ARCHIVE" | "DOWNLOAD" | "DELETE";
  message: string;
}

const BASE = "/api/v1/screenshots";

export async function estimateReport(req: ReportRequest): Promise<ReportEstimate> {
  const { data } = await apiClient.post<ApiResponse<ReportEstimate>>(
    `${BASE}/exports/estimate`,
    req,
  );
  return unwrap(data, "Failed to count the screenshots");
}

export async function startReport(req: ReportRequest): Promise<ExportJobView> {
  const { data } = await apiClient.post<ApiResponse<ExportJobView>>(`${BASE}/exports/report`, req);
  return unwrap(data, "Failed to start the report");
}

export async function getExport(id: string): Promise<ExportJobView> {
  const { data } = await apiClient.get<ApiResponse<ExportJobView>>(
    `${BASE}/exports/${encodeURIComponent(id)}`,
  );
  return unwrap(data, "Failed to read the progress");
}

export async function cancelExport(id: string): Promise<ExportJobView> {
  const { data } = await apiClient.post<ApiResponse<ExportJobView>>(
    `${BASE}/exports/${encodeURIComponent(id)}/cancel`,
    {},
  );
  return unwrap(data, "Failed to cancel");
}

export async function downloadLink(
  id: string,
): Promise<{ url: string; fileName: string; expiresAt: string | null }> {
  const { data } = await apiClient.get<
    ApiResponse<{ url: string; fileName: string; expiresAt: string | null }>
  >(`${BASE}/exports/${encodeURIComponent(id)}/download`);
  return unwrap(data, "Failed to get the file");
}

export async function listArchives(): Promise<MonthArchiveView[]> {
  const { data } = await apiClient.get<ApiResponse<MonthArchiveView[]>>(`${BASE}/archives`);
  return unwrap(data, "Failed to load the archive months");
}

/** The month to archive and delete next, or null (nothing due, or not a Super Admin). */
export async function getArchiveNudge(): Promise<ArchiveNudge | null> {
  const { data } = await apiClient.get<ApiResponse<ArchiveNudge | null>>(`${BASE}/archives/nudge`);
  return data?.success ? (data.data ?? null) : null;
}

export async function startArchive(month: string): Promise<ExportJobView> {
  const { data } = await apiClient.post<ApiResponse<ExportJobView>>(
    `${BASE}/archives/${encodeURIComponent(month)}/archive`,
    {},
  );
  return unwrap(data, "Failed to start the archive");
}

export async function startPurge(month: string): Promise<ExportJobView> {
  const { data } = await apiClient.post<ApiResponse<ExportJobView>>(
    `${BASE}/archives/${encodeURIComponent(month)}/delete`,
    {},
  );
  return unwrap(data, "Failed to start deleting");
}
