"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, FileArchive, Info, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StatePanel";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  btnSmall,
  cardBase,
  checkboxBase,
  hintBase,
  inputBase,
  labelBase,
} from "@/components/ui/classes";
import { errorDetails, errorMessage } from "@/lib/api";
import { dateKeyOf } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { formatDayLong } from "@/lib/time/months";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import {
  listArchives,
  startArchive,
  startPurge,
  type ExportJobView,
  type MonthArchiveView,
} from "@/features/screenshots/api/exports";
import { exportKeys } from "@/features/screenshots/api/keys";
import {
  ExportProgressModal,
  downloadExport,
} from "@/features/screenshots/components/ExportProgressModal";
import { sizeText } from "@/features/screenshots/lib/progress";

/** "2 Nov 2026, 14:05" in the business zone. */
function when(iso: string | null | undefined): string {
  if (!iso) return "";
  return `${formatDayLong(dateKeyOf(new Date(iso)))}, ${formatTime12(iso)}`;
}

function n(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;
}

/** Where the month stands, as one chip. */
function MonthChip({ m }: { m: MonthArchiveView }) {
  if (!m.ended) return <Chip tone="info">In progress</Chip>;
  if (m.screenshots === 0) {
    return m.lastPurge?.status === "DONE" ? (
      <Chip tone="success">Deleted</Chip>
    ) : (
      <Chip tone="neutral">Nothing stored</Chip>
    );
  }
  if (m.overdue) return <Chip tone="danger">Overdue since {formatDayLong(m.dueBy)}</Chip>;
  return <Chip tone="warning">Due by {formatDayLong(m.dueBy)}</Chip>;
}

/** What the newest archive of the month is, in a line or two. */
function ArchiveLine({ m }: { m: MonthArchiveView }) {
  const a = m.latestArchive;
  if (!a) return <p className="text-sm text-slate-500">No archive yet.</p>;
  if (a.status === "QUEUED" || a.status === "RUNNING") {
    return <p className="text-sm text-slate-600">An archive is being made now.</p>;
  }
  if (a.status !== "DONE") {
    return (
      <p className="text-sm text-slate-600">
        The last archive {a.status === "CANCELLED" ? "was cancelled" : "did not finish"} (
        {when(a.finishedAt)}). Create it again.
      </p>
    );
  }
  const qualifies = m.qualifyingArchive?.id === a.id;
  return (
    <div className="space-y-0.5 text-sm text-slate-600">
      <p>
        Archive made {when(a.finishedAt)}: {n(a.done, "screenshot")}, {sizeText(a.bytes)}
        {a.missing > 0 ? `, ${a.missing} unreadable` : ""}.
      </p>
      <p className="text-xs text-slate-500">
        {a.downloadedAt ? `Downloaded ${when(a.downloadedAt)}.` : "Not downloaded yet."}{" "}
        {a.downloadable
          ? a.expiresAt
            ? `The file can be downloaded until ${when(a.expiresAt)}.`
            : ""
          : "The file has expired; create a new archive to download again."}
        {m.ended && !qualifies
          ? " It was made before the month ended, so it does not allow deleting."
          : ""}
      </p>
    </div>
  );
}

/** Deleting a month: the count, a typed confirmation and a tick that the archive is kept. */
function DeleteMonthDialog({
  month,
  onClose,
  onStarted,
}: {
  month: MonthArchiveView | null;
  onClose: () => void;
  onStarted: (job: ExportJobView) => void;
}) {
  const [typed, setTyped] = useState("");
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = month?.label ?? "";
  const ready = kept && typed.trim().toLowerCase() === label.toLowerCase();

  function close() {
    setTyped("");
    setKept(false);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!month || !ready) return;
    setBusy(true);
    try {
      const job = await startPurge(month.month);
      setTyped("");
      setKept(false);
      onStarted(job);
    } catch (err) {
      toast.error("Couldn't delete the month", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const archive = month?.qualifyingArchive;
  return (
    <Modal
      open={Boolean(month)}
      onClose={close}
      title={`Delete ${label} screenshots`}
      className="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4 px-6 pb-6" noValidate>
        <p className="text-sm text-slate-600">
          This removes {n(month?.deletable ?? 0, "screenshot")} of {label} from storage for good.
          The archive {archive?.fileName ? <strong>{archive.fileName}</strong> : null} made on{" "}
          {when(archive?.finishedAt)} becomes the only copy.
          {month && month.newerThanArchive > 0
            ? ` ${n(month.newerThanArchive, "screenshot")} that arrived after the archive started stay until a new archive is made.`
            : ""}
        </p>
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            className={`${checkboxBase} mt-0.5`}
            checked={kept}
            onChange={(e) => setKept(e.target.checked)}
          />
          I have downloaded the archive and kept it safe.
        </label>
        <div>
          <label htmlFor="purge-confirm" className={labelBase}>
            Type <span className="font-mono">{label}</span> to confirm
          </label>
          <input
            id="purge-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className={`${inputBase} mt-1.5`}
          />
          <p className={hintBase}>
            Keep the next window open until it finishes. Closing it stops the deletion.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={!ready || busy} className={btnDanger}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
            Delete for good
          </button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Super Admin: monthly screenshot archives and deletion (3.2, fix 7). Each month
 * gets a zip (Month / Department / Employee / one PDF per working day). A month
 * can be deleted only after it has ended and only after a complete archive made
 * after its end has been downloaded.
 */
export function ArchivesView() {
  const queryClient = useQueryClient();
  const months = useQuery({
    queryKey: exportKeys.archives(),
    queryFn: listArchives,
    refetchInterval: 60_000,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MonthArchiveView | null>(null);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: exportKeys.archives() });

  async function archive(m: MonthArchiveView) {
    setStarting(m.month);
    try {
      const job = await startArchive(m.month);
      setJobId(job.id);
    } catch (err) {
      const existing = errorDetails(err)?.exportId;
      if (typeof existing === "string") setJobId(existing);
      else
        toast.error("Couldn't start the archive", {
          description: errorMessage(err) ?? "Please try again.",
        });
    } finally {
      setStarting(null);
    }
  }

  async function download(m: MonthArchiveView) {
    const a = m.latestArchive;
    if (!a) return;
    setDownloading(m.month);
    try {
      await downloadExport(a.id);
      refresh();
    } catch (err) {
      toast.error("Couldn't download the archive", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Screenshot archive"
        subtitle="Archive each month's screenshots, keep the file, then delete them to free storage."
      />

      <section className={`${cardBase} flex gap-3 p-4 text-sm text-slate-600 sm:p-5`}>
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(34_34_204)]" aria-hidden />
        <div className="space-y-1.5">
          <p>
            <strong className="text-slate-800">1. Create the archive</strong> once the month has
            ended: one zip, a folder per department and per employee, one PDF per working day with
            every screenshot and its time.
          </p>
          <p>
            <strong className="text-slate-800">2. Download it</strong> and keep it safe. The file
            stays downloadable for 7 days.
          </p>
          <p>
            <strong className="text-slate-800">3. Delete the month</strong> to free storage. This is
            allowed only after the month has ended and only with a complete archive made after its
            end.
          </p>
          <p className="text-xs text-slate-500">
            An archive can be made at any time, mid-month too, but only one made after the month
            ends allows deleting. Each month is due by the end of the month after it: January by 1
            March. Keep the progress window open while it runs; closing it cancels, and it has to be
            started again.
          </p>
        </div>
      </section>

      {months.isLoading ? (
        <LoadingState label="Loading the months…" />
      ) : months.isError ? (
        <ErrorState
          message={errorMessage(months.error) ?? undefined}
          onRetry={() => void months.refetch()}
          retrying={months.isFetching}
        />
      ) : !months.data?.length ? (
        <section className={cardBase}>
          <EmptyState
            icon={FileArchive}
            title="No screenshots stored"
            message="Months with screenshots show here."
          />
        </section>
      ) : (
        <ul className="space-y-3">
          {months.data.map((m) => {
            const running = m.running;
            const latest = m.latestArchive;
            return (
              <li key={m.month} className={`${cardBase} p-4 sm:p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{m.label}</h2>
                    <MonthChip m={m} />
                  </div>
                  <span className="text-sm tabular-nums text-slate-500">
                    {n(m.screenshots, "screenshot")} stored
                  </span>
                </div>

                <div className="mt-2">
                  <ArchiveLine m={m} />
                  {m.newerThanArchive > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {n(m.newerThanArchive, "screenshot")} arrived after the archive started. They
                      stay until the next archive.
                    </p>
                  )}
                  {m.lastPurge?.status === "DONE" && (
                    <p className="mt-1 text-xs text-slate-500">
                      Deleted {n(m.lastPurge.done, "screenshot")} on {when(m.lastPurge.finishedAt)}.
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {running ? (
                    <button
                      type="button"
                      onClick={() => setJobId(running.id)}
                      className={btnPrimary}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Show progress
                    </button>
                  ) : (
                    <>
                      {m.screenshots > 0 && (
                        <button
                          type="button"
                          onClick={() => void archive(m)}
                          disabled={starting === m.month}
                          className={btnSmall}
                        >
                          {starting === m.month ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Archive className="h-4 w-4" aria-hidden />
                          )}
                          {latest?.status === "DONE" ? "Create a new archive" : "Create archive"}
                        </button>
                      )}
                      {latest?.downloadable && (
                        <button
                          type="button"
                          onClick={() => void download(m)}
                          disabled={downloading === m.month}
                          className={btnSmall}
                        >
                          {downloading === m.month ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Download className="h-4 w-4" aria-hidden />
                          )}
                          Download ({sizeText(latest.bytes)})
                        </button>
                      )}
                      {m.ended && m.screenshots > 0 && (
                        <button
                          type="button"
                          onClick={() => setToDelete(m)}
                          disabled={!m.canDelete}
                          className={`${btnSmall} text-rose-600 disabled:text-slate-400`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Delete month
                        </button>
                      )}
                    </>
                  )}
                </div>
                {!running &&
                  m.ended &&
                  m.screenshots > 0 &&
                  !m.canDelete &&
                  m.deleteBlockedText && (
                    <p className={hintBase}>
                      {m.deleteBlockedBy === "NOTHING_TO_DELETE"
                        ? "What is left arrived after the last archive. Create a new archive and download it to delete it."
                        : m.deleteBlockedText}
                    </p>
                  )}
              </li>
            );
          })}
        </ul>
      )}

      <DeleteMonthDialog
        month={toDelete}
        onClose={() => setToDelete(null)}
        onStarted={(job) => {
          setToDelete(null);
          setJobId(job.id);
        }}
      />
      <ExportProgressModal
        jobId={jobId}
        onClose={() => {
          setJobId(null);
          refresh();
        }}
      />
    </div>
  );
}
