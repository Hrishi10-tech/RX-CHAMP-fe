import { cleanParams } from "@/lib/api/list";
import type { TeamDayParams, TeamMonthParams } from "@/features/reports/types";

/** `GET /reports/team/day?date=&userIds=a,b`. No ids = everyone in scope. */
export function buildTeamDayQuery(params: TeamDayParams): Record<string, string> {
  return cleanParams({ date: params.date, userIds: params.userIds }) as Record<string, string>;
}

/** `GET /reports/team/month?month=&managerId=&userIds=a,b` (and its export.xlsx). */
export function buildTeamMonthQuery(params: TeamMonthParams): Record<string, string> {
  return cleanParams({
    month: params.month,
    managerId: params.managerId,
    userIds: params.userIds,
  }) as Record<string, string>;
}

/** Ids from a URL value "a,b,c": trimmed, deduplicated, empties dropped. */
export function parseIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  );
}

/** A safe piece of a file name: "Asha Kumar" -> "asha-kumar". */
export function fileSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "report"
  );
}
