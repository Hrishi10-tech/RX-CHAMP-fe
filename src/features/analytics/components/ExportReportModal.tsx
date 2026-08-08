"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2, X } from "lucide-react";

import { MAX_REPORT_DAYS, datesBetween } from "@/features/analytics/lib/reportRange";

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * Asks for the report's date range. One page is produced per day in the range, so the
 * day count is shown live and an unreasonable span is refused before any fetching.
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
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());

  const dates = datesBetween(from, to);
  const invalid = dates.length === 0;
  const tooMany = dates.length > MAX_REPORT_DAYS;
  const busy = progress !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900">Export Report</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              One page per day, for every day in the range.
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start date
              </span>
              <input
                type="date"
                value={from}
                max={todayIso()}
                disabled={busy}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                End date
              </span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                max={todayIso()}
                disabled={busy}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50"
              />
            </label>
          </div>

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
          {!invalid && !tooMany && (
            <p className="text-xs text-slate-500">
              {dates.length} {dates.length === 1 ? "day" : "days"} — {dates.length}{" "}
              {dates.length === 1 ? "page" : "pages"}.
            </p>
          )}

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            The PDF downloads automatically. Longer ranges take a little while — roughly a second
            per page.
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
