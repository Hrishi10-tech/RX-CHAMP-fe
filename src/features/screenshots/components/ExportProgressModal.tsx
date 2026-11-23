"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { btnPrimary, btnSecondary } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import {
  cancelExport,
  downloadLink,
  getExport,
  type ExportJobView,
} from "@/features/screenshots/api/exports";
import { exportKeys } from "@/features/screenshots/api/keys";
import { etaText, sizeText } from "@/features/screenshots/lib/progress";
import { formatDayLong } from "@/lib/time/months";
import { dateKeyOf } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";

const POLL_MS = 1_500;

/** "9 Nov 2026, 14:05" in the business zone. */
function keptUntil(iso: string): string {
  return `${formatDayLong(dateKeyOf(new Date(iso)))}, ${formatTime12(iso)}`;
}

function running(job: ExportJobView | undefined): boolean {
  return !job || job.status === "QUEUED" || job.status === "RUNNING";
}

/** Saves the finished file: a short-lived link the browser downloads. */
export async function downloadExport(id: string): Promise<void> {
  const link = await downloadLink(id);
  const a = document.createElement("a");
  a.href = link.url;
  a.download = link.fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Progress of a screenshot report, archive or deletion (3.2): a bar, how many are
 * done, and the time left. Closing the window cancels the job (the server also
 * cancels one nobody watches), and it has to be started again.
 */
export function ExportProgressModal({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: (job: ExportJobView | null) => void;
}) {
  const queryClient = useQueryClient();
  const [downloading, setDownloading] = useState(false);
  const query = useQuery({
    queryKey: exportKeys.one(jobId ?? ""),
    queryFn: () => getExport(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (q) => (running(q.state.data) ? POLL_MS : false),
    refetchIntervalInBackground: true,
  });
  const job = query.data;
  const live = Boolean(jobId) && running(job);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  });

  // Leaving the page while it runs cancels it: say so before the tab closes.
  useEffect(() => {
    if (!live) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [live]);

  // Finished: the months list and the reminder change.
  useEffect(() => {
    if (job && !running(job)) {
      void queryClient.invalidateQueries({ queryKey: exportKeys.archives() });
      void queryClient.invalidateQueries({ queryKey: exportKeys.nudge() });
    }
  }, [job, queryClient]);

  async function close() {
    if (jobId && liveRef.current) {
      try {
        await cancelExport(jobId);
      } catch {
        // The server cancels it anyway once nobody polls it.
      }
      toast.info("Cancelled", { description: "Start it again when you are ready." });
    }
    void queryClient.invalidateQueries({ queryKey: exportKeys.all });
    onClose(job ?? null);
  }

  async function download() {
    if (!jobId) return;
    setDownloading(true);
    try {
      await downloadExport(jobId);
      void queryClient.invalidateQueries({ queryKey: exportKeys.archives() });
    } catch (err) {
      toast.error("Couldn't download the file", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  const pct = Math.round((job?.progress.fraction ?? 0) * 100);
  const purge = job?.kind === "MONTH_PURGE";

  return (
    <Modal
      open={Boolean(jobId)}
      onClose={() => void close()}
      title={job?.title ?? "Preparing…"}
      className="max-w-lg"
    >
      <div className="space-y-4 px-6 pb-6">
        {!job ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Starting…
          </p>
        ) : (
          <>
            <div>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-800">{job.stage}</span>
                <span className="tabular-nums text-slate-500">{pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={job.title}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    job.status === "FAILED" || job.status === "CANCELLED"
                      ? "bg-slate-400"
                      : job.status === "DONE"
                        ? "bg-emerald-600"
                        : "bg-[rgb(34_34_204)]"
                  }`}
                  style={{ width: `${Math.max(job.status === "RUNNING" ? 2 : 0, pct)}%` }}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                <span className="tabular-nums">
                  {job.done} of {job.total} screenshots
                </span>
                {running(job) && <span>{etaText(job.progress.etaSec)}</span>}
              </div>
            </div>

            {job.status === "DONE" && (
              <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {purge
                  ? `Deleted ${job.done} screenshots.`
                  : `Ready: ${job.fileName ?? "the file"} (${sizeText(job.bytes)}).${
                      job.expiresAt
                        ? ` It can be downloaded until ${keptUntil(job.expiresAt)}.`
                        : ""
                    }`}
                {job.missing > 0 && !purge
                  ? ` ${job.missing} could not be read and are marked as missing.`
                  : ""}
              </p>
            )}
            {(job.status === "FAILED" || job.status === "CANCELLED") && (
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-900">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {job.error ??
                  (job.status === "CANCELLED" ? "Cancelled." : "Something went wrong.")}{" "}
                Start it again when you are ready.
              </p>
            )}
            {running(job) && (
              <p className="text-xs text-slate-500">
                Keep this window open. Closing it cancels the {purge ? "deletion" : "file"}, and it
                has to be started again.
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void close()} className={btnSecondary}>
                {running(job) ? `Cancel ${purge ? "deletion" : "and close"}` : "Close"}
              </button>
              {job.status === "DONE" && job.downloadable && (
                <button
                  type="button"
                  onClick={() => void download()}
                  disabled={downloading}
                  className={btnPrimary}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  Download
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
