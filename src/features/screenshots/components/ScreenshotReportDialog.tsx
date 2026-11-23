"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { labelBase } from "@/components/ui/classes";
import { errorDetails, errorMessage } from "@/lib/api";
import { todayKey } from "@/lib/time/businessTime";
import {
  estimateReport,
  startReport,
  type ReportEstimate,
  type ReportMode,
  type ReportRequest,
} from "@/features/screenshots/api/exports";
import { ExportProgressModal } from "@/features/screenshots/components/ExportProgressModal";
import { durationText, sizeText } from "@/features/screenshots/lib/progress";
import { Hint, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const MODES: { value: ReportMode; label: string; hint: string }[] = [
  { value: "DAY", label: "One day", hint: "Every screenshot of one date." },
  { value: "RANGE", label: "Several days", hint: "From one date to another, up to 62 days." },
  { value: "MONTH", label: "Whole month", hint: "Every screenshot of a month." },
  {
    value: "TIME_WINDOW",
    label: "Time on a date",
    hint: "For example 17:00 to 19:00 on one date.",
  },
];

function requestOf(
  userId: string,
  mode: ReportMode,
  f: {
    date: string;
    fromDate: string;
    toDate: string;
    month: string;
    fromTime: string;
    toTime: string;
  },
): ReportRequest {
  switch (mode) {
    case "DAY":
      return { userId, mode, date: f.date };
    case "RANGE":
      return { userId, mode, fromDate: f.fromDate, toDate: f.toDate };
    case "MONTH":
      return { userId, mode, month: f.month };
    default:
      return { userId, mode, date: f.date, fromTime: f.fromTime, toTime: f.toTime };
  }
}

/**
 * One person's screenshots as a PDF (3.2, fix 6): a day, several days, a month or
 * a time window on one date, every screenshot with its date and time stamped on
 * it. Shows how many and roughly how long first, then the progress.
 */
export function ScreenshotReportDialog({
  open,
  onClose,
  userId,
  userName,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  /** Where to start: the day and time window already on screen. */
  initial?: { mode?: ReportMode; date?: string; fromTime?: string; toTime?: string };
}) {
  const today = todayKey();
  const day = initial?.date && initial.date <= today ? initial.date : today;
  const [mode, setMode] = useState<ReportMode>(initial?.mode ?? "DAY");
  const [fields, setFields] = useState({
    date: day,
    fromDate: day,
    toDate: day,
    month: day.slice(0, 7),
    fromTime: initial?.fromTime ?? "17:00",
    toTime: initial?.toTime ?? "19:00",
  });
  const [estimate, setEstimate] = useState<ReportEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const request = useMemo(() => requestOf(userId, mode, fields), [userId, mode, fields]);

  // A fresh count whenever what is asked changes (a quarter second after typing stops).
  useEffect(() => {
    if (!open) return;
    let stale = false;
    setEstimate(null);
    setEstimateError(null);
    const t = setTimeout(() => {
      estimateReport(request)
        .then((e) => !stale && setEstimate(e))
        .catch(
          (err) =>
            !stale && setEstimateError(errorMessage(err) ?? "Couldn't count the screenshots."),
        );
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [open, request]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStarting(true);
    try {
      const job = await startReport(request);
      setJobId(job.id);
    } catch (err) {
      const existing = errorDetails(err)?.exportId;
      if (typeof existing === "string") {
        toast.info("A report of yours is still being made", {
          description: "Showing its progress.",
        });
        setJobId(existing);
      } else {
        toast.error("Couldn't start the report", {
          description: errorMessage(err) ?? "Please try again.",
        });
      }
    } finally {
      setStarting(false);
    }
  }

  const set = (k: keyof typeof fields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <Modal
        open={open && !jobId}
        onClose={onClose}
        title="Screenshot report"
        description={
          userName
            ? `${userName}: a PDF with every screenshot, each with its date and time.`
            : undefined
        }
      >
        <form onSubmit={submit} className="space-y-4 px-6 pb-6" noValidate>
          <fieldset>
            <legend className={labelBase}>Report type</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer flex-col rounded-xl border px-3 py-2 text-sm ${
                    mode === m.value ? "border-brand bg-brand/5" : "border-card"
                  }`}
                >
                  <span className="flex items-center gap-2 font-semibold text-strong">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === m.value}
                      onChange={() => setMode(m.value)}
                    />
                    {m.label}
                  </span>
                  <span className="mt-0.5 text-xs text-quiet">{m.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {(mode === "DAY" || mode === "TIME_WINDOW") && (
            <div>
              <Label htmlFor="rep-date">Date</Label>
              <Input
                id="rep-date"
                type="date"
                max={today}
                value={fields.date}
                onChange={set("date")}
              />
            </div>
          )}
          {mode === "TIME_WINDOW" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rep-from">From</Label>
                <Input
                  id="rep-from"
                  type="time"
                  value={fields.fromTime}
                  onChange={set("fromTime")}
                />
              </div>
              <div>
                <Label htmlFor="rep-to">To</Label>
                <Input id="rep-to" type="time" value={fields.toTime} onChange={set("toTime")} />
              </div>
            </div>
          )}
          {mode === "RANGE" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rep-fd">First day</Label>
                <Input
                  id="rep-fd"
                  type="date"
                  max={today}
                  value={fields.fromDate}
                  onChange={set("fromDate")}
                />
              </div>
              <div>
                <Label htmlFor="rep-td">Last day</Label>
                <Input
                  id="rep-td"
                  type="date"
                  max={today}
                  value={fields.toDate}
                  onChange={set("toDate")}
                />
              </div>
            </div>
          )}
          {mode === "MONTH" && (
            <div>
              <Label htmlFor="rep-month">Month</Label>
              <Input
                id="rep-month"
                type="month"
                max={today.slice(0, 7)}
                value={fields.month}
                onChange={set("month")}
              />
            </div>
          )}

          <Hint className="!mt-0 rounded-lg bg-fill px-3 py-2 text-sm" aria-live="polite">
            {estimateError
              ? estimateError
              : estimate
                ? estimate.total === 0
                  ? `No screenshots in ${estimate.periodLabel}.`
                  : `${estimate.total} screenshots in ${estimate.periodLabel}: about ${sizeText(estimate.estimatedBytes)}, ready in ${durationText(estimate.estimatedSec)}.`
                : "Counting the screenshots…"}
          </Hint>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={starting || !!estimateError || estimate?.total === 0}
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileDown className="h-4 w-4" aria-hidden />
              )}
              Make the PDF
            </Button>
          </div>
        </form>
      </Modal>
      <ExportProgressModal
        jobId={jobId}
        onClose={() => {
          setJobId(null);
          onClose();
        }}
      />
    </>
  );
}
