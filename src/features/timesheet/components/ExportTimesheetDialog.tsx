"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { isCancel } from "axios";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { labelBase } from "@/components/ui/classes";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { errorMessage } from "@/lib/api";
import { todayKey } from "@/lib/time/businessTime";
import {
  MAX_TIMESHEET_DAYS,
  downloadTimesheetXlsx,
  getTimesheet,
  timesheetFileBase,
} from "@/features/timesheet/api/timesheet";
import {
  PERIOD_OPTIONS,
  daysInRange,
  periodRange,
  type TimesheetPeriod,
} from "@/features/timesheet/lib/period";
import { rangeText, saveTimesheetPdf } from "@/features/timesheet/lib/pdf";

type Busy = "pdf" | "xlsx" | null;

/**
 * Export timesheet (SPEC 7.3): one request for the range, a PDF drawn from the
 * data, or the server's Excel file. Every press starts afresh, so a failed or
 * slow export can always be tried again; the server's message is shown.
 */
export function ExportTimesheetDialog({
  open,
  onClose,
  userId,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}) {
  const uid = useId();
  const today = todayKey();
  const [period, setPeriod] = useState<TimesheetPeriod>("month");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const preset = periodRange(period, today);
  const from = preset?.from ?? customFrom;
  const to = preset?.to ?? customTo;
  const days = daysInRange(from, to);
  const invalid = days === 0;
  const tooMany = days > MAX_TIMESHEET_DAYS;

  // Closing the dialog abandons whatever is running.
  useEffect(() => {
    if (open) return;
    inFlight.current?.abort();
    inFlight.current = null;
    setBusy(null);
    setError(null);
  }, [open]);

  async function run(kind: Exclude<Busy, null>) {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "pdf") {
        const sheet = await getTimesheet(userId, from, to, {
          signal: ctrl.signal,
          fallbackName: userName,
        });
        if (ctrl.signal.aborted) return;
        const name = `${timesheetFileBase(sheet.person.name || userName, from, to)}.pdf`;
        const pages = await saveTimesheetPdf(sheet, name);
        toast.success("Timesheet downloaded", {
          description: `${sheet.rows.length} ${sheet.rows.length === 1 ? "day" : "days"}, ${pages} ${
            pages === 1 ? "page" : "pages"
          }.`,
        });
      } else {
        const name = await downloadTimesheetXlsx(userId, from, to, userName);
        if (ctrl.signal.aborted) return;
        toast.success("Excel downloaded", { description: name });
      }
    } catch (err) {
      if (ctrl.signal.aborted || isCancel(err)) return;
      setError(errorMessage(err) ?? "Couldn't build the timesheet. Please try again.");
    } finally {
      if (inFlight.current === ctrl) {
        inFlight.current = null;
        setBusy(null);
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export timesheet"
      description={userName ? `${userName}: one row per day.` : "One row per day."}
      className="max-w-lg"
    >
      <div className="space-y-4 px-6 py-5">
        <div>
          <Label htmlFor={`${uid}-period`}>Period</Label>
          <Select
            id={`${uid}-period`}
            value={period}
            onValueChange={(v) => setPeriod(v as TimesheetPeriod)}
            options={PERIOD_OPTIONS}
            aria-label="Period"
          />
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelBase}>From</span>
              <Input
                type="date"
                value={customFrom}
                max={today}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1.5"
              />
            </label>
            <label className="block">
              <span className={labelBase}>To</span>
              <Input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={today}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1.5"
              />
            </label>
          </div>
        )}

        {invalid ? (
          <p className="text-xs font-medium text-attention">
            The start must be on or before the end.
          </p>
        ) : tooMany ? (
          <p className="text-xs font-medium text-attention">
            That is {days} days. Export at most {MAX_TIMESHEET_DAYS} at a time.
          </p>
        ) : (
          <p className="rounded-lg bg-fill px-3 py-2 text-xs text-soft">
            <span className="font-semibold text-strong">{rangeText(from, to)}</span>, {days}{" "}
            {days === 1 ? "day" : "days"}. Focus and paid time against the target, paid and unpaid
            breaks, meetings and away time for each day, with 12-hour in and out times.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-attention-edge bg-attention-wash px-3 py-2 text-sm text-attention"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-divider px-6 py-4 sm:flex-row sm:justify-end [&>button]:whitespace-nowrap">
        <Button type="button" onClick={onClose}>
          {busy ? "Cancel" : "Close"}
        </Button>
        <Button
          type="button"
          onClick={() => void run("xlsx")}
          disabled={busy !== null || invalid || tooMany}
        >
          {busy === "xlsx" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-working" aria-hidden />
          )}
          Download Excel
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={() => void run("pdf")}
          disabled={busy !== null || invalid || tooMany}
        >
          {busy === "pdf" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-4 w-4" aria-hidden />
          )}
          {busy === "pdf" ? "Building…" : "Download PDF"}
        </Button>
      </div>
    </Modal>
  );
}
