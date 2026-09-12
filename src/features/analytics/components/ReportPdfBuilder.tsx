"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { ROWS_PER_PAGE, TimesheetPage } from "@/features/analytics/components/TimesheetPage";
import {
  REPORT_PAGE_HEIGHT,
  REPORT_PAGE_WIDTH,
  capturePage,
  finishReportPdf,
  reportFileName,
  type ReportPdf,
} from "@/features/analytics/lib/buildReportPdf";
import type { TimesheetReport } from "@/features/analytics/lib/reportRange";

/**
 * Frames a sheet gets to lay out before being captured. Two is enough for a table —
 * it only has to reach paint — and is far cheaper than a fixed delay per page.
 */
const MOUNT_FRAMES = 2;

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = () => (left-- <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

/** Splits the range's rows into one array per printed sheet. */
function paginate<T>(rows: T[], size: number): T[][] {
  if (rows.length === 0) return [[]]; // an empty range still prints one header page
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += size) pages.push(rows.slice(i, i + size));
  return pages;
}

/**
 * Builds the timesheet PDF a sheet at a time and downloads it. Renders nothing visible,
 * so the dashboard stays usable and progress is reported through a single toast.
 *
 * Only the sheet being captured is mounted, and the node must be genuinely laid out —
 * html2canvas reads real layout, so `display: none` would capture blank boxes. It is
 * parked off-screen instead.
 */
export function ReportPdfBuilder({
  report,
  from,
  to,
  onDone,
}: {
  report: TimesheetReport;
  from: string;
  to: string;
  onDone: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [mounted, setMounted] = useState(false);
  // Which sheet is currently in the DOM waiting to be captured.
  const [index, setIndex] = useState(0);

  const pages = useMemo(() => paginate(report.rows, ROWS_PER_PAGE), [report.rows]);

  useEffect(() => setMounted(true), []);

  const run = useCallback(async () => {
    const label = (n: number) => `Building timesheet — ${n} of ${pages.length} pages…`;
    const toastId = toast.loading(label(0));
    let pdf: ReportPdf | null = null;

    try {
      for (let i = 0; i < pages.length; i++) {
        setIndex(i);
        await nextFrames(MOUNT_FRAMES);

        const page = hostRef.current?.querySelector<HTMLElement>("[data-report-page]");
        if (!page) throw new Error("Timesheet page did not render.");

        pdf = await capturePage(page, pdf, pages.length);
        toast.loading(label(i + 1), { id: toastId });
      }

      finishReportPdf(pdf, reportFileName(report.employee.name, from, to));
      toast.success(
        `Timesheet downloaded — ${report.rows.length} ${report.rows.length === 1 ? "day" : "days"}.`,
        { id: toastId },
      );
    } catch {
      toast.error("Couldn't build the PDF. Please try a smaller range.", { id: toastId });
    } finally {
      onDone();
    }
  }, [pages, report, from, to, onDone]);

  useEffect(() => {
    if (!mounted || started.current) return;
    started.current = true;
    void run();
  }, [mounted, run]);

  if (!mounted) return null;

  const rows = pages[index];

  return createPortal(
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: "fixed", top: 0, left: -100000, width: REPORT_PAGE_WIDTH, zIndex: -1 }}
    >
      {rows && (
        <div
          key={index}
          data-report-page
          style={{
            width: REPORT_PAGE_WIDTH,
            // `minHeight`, not `height`: a full sheet that measures slightly over still
            // grows rather than clipping its last row.
            minHeight: REPORT_PAGE_HEIGHT,
            background: "#fff",
            padding: 28,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TimesheetPage
            employee={report.employee}
            rows={rows}
            from={from}
            to={to}
            pageNumber={index + 1}
            pageCount={pages.length}
          />
        </div>
      )}
    </div>,
    document.body,
  );
}
