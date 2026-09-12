"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, Loader2, X } from "lucide-react";

import { Select } from "@/components/ui/Select";
import { ROWS_PER_PAGE } from "@/features/analytics/components/TimesheetPage";
import { MAX_REPORT_DAYS, datesBetween } from "@/features/analytics/lib/reportRange";
import {
  PERIOD_OPTIONS,
  periodRange,
  type ReportPeriod,
} from "@/features/analytics/lib/reportPeriod";

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** `01 Sep 2026` — how the chosen range is echoed back before downloading. */
function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return iso;
  }
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-slate-500";

/**
 * Asks for the timesheet's date range. One row is produced per day in the range, so the
 * day count is shown live and an unreasonable span is refused before any fetching.
 *
 * The common spans are presets — picking dates by hand is the exception, so the two date
 * fields only appear once "Date Range" is chosen.
 */
export function ExportReportModal({
  onGenerate,
  onClose,
  progress,
}: {
  onGenerate: (from: string, to: string) => void;
  onClose: () => void;
  /** Set while the range is being fetched, so the dialog can show how far along it is. */
  progress: { done: number; total: number } | null;
}) {
  const [period, setPeriod] = useState<ReportPeriod>("month");
  // Kept separately from the preset so switching away and back does not lose what was
  // typed. Seeded to today, which is the only range guaranteed to be valid.
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());

  const preset = periodRange(period);
  const from = preset?.from ?? customFrom;
  const to = preset?.to ?? customTo;

  const dates = datesBetween(from, to);
  const invalid = dates.length === 0;
  const tooMany = dates.length > MAX_REPORT_DAYS;
  const busy = progress !== null;
  const pages = Math.max(1, Math.ceil(dates.length / ROWS_PER_PAGE));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Export Timesheet</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              One row per day, for every day in the range.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className={labelClass}>Period</span>
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as ReportPeriod)}
              options={PERIOD_OPTIONS}
              disabled={busy}
              aria-label="Period"
            />
          </label>

          {period === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Start date</span>
                <input
                  type="date"
                  value={customFrom}
                  max={todayIso()}
                  disabled={busy}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>End date</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  max={todayIso()}
                  disabled={busy}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          )}

          {invalid && (
            <p className="text-xs font-medium text-red-500">
              The start date must be on or before the end date.
            </p>
          )}
          {tooMany && (
            <p className="text-xs font-medium text-red-500">
              That range is {dates.length} days — please export at most {MAX_REPORT_DAYS}.
            </p>
          )}
          {/* Presets hide the dates they resolve to, so the range is always spelled out. */}
          {!invalid && !tooMany && (
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`}
              </span>{" "}
              — {dates.length} {dates.length === 1 ? "day" : "days"} across {pages}{" "}
              {pages === 1 ? "page" : "pages"}.
            </p>
          )}

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            The PDF downloads automatically. Longer ranges take a little while — one lookup per
            day in the range.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onGenerate(from, to)}
            disabled={busy || invalid || tooMany}
            className="flex items-center gap-2 rounded-xl bg-[rgb(34_34_204)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[rgb(28_28_180)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building… {progress.done}/{progress.total}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
