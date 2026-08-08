"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { ReportPage } from "@/features/analytics/components/ReportPage";
import {
  REPORT_PAGE_WIDTH,
  capturePage,
  finishReportPdf,
  reportFileName,
  type ReportPdf,
} from "@/features/analytics/lib/buildReportPdf";
import type { ReportDay } from "@/features/analytics/lib/reportRange";

/**
 * Frames a page gets to mount its charts before being captured. Recharts renders on a
 * requestAnimationFrame, so a couple of frames is enough — far cheaper than a fixed
 * delay per page.
 */
const MOUNT_FRAMES = 3;

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = () => (left-- <= 0 ? resolve() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

/**
 * Builds the PDF a page at a time and downloads it. Renders nothing visible, so the
 * dashboard stays usable and progress is reported through a single toast.
 *
 * Only the day being captured is mounted. Holding every day at once meant a 30-day
 * export kept ~180 chart instances alive simultaneously, which dominated both the wait
 * and the memory use.
 *
 * The page must be genuinely laid out — charts measure their container and html2canvas
 * reads the real layout, so `display: none` would capture blank boxes. It is parked
 * off-screen instead.
 */
export function ReportPdfBuilder({
  days,
  userName,
  from,
  to,
  onDone,
}: {
  days: ReportDay[];
  userName?: string;
  from: string;
  to: string;
  onDone: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [mounted, setMounted] = useState(false);
  // Which day is currently in the DOM waiting to be captured.
  const [index, setIndex] = useState(0);

  useEffect(() => setMounted(true), []);

  const run = useCallback(async () => {
    const toastId = toast.loading(`Building report — 0 of ${days.length} pages…`);
    let pdf: ReportPdf | null = null;

    try {
      for (let i = 0; i < days.length; i++) {
        setIndex(i);
        await nextFrames(MOUNT_FRAMES);

        const page = hostRef.current?.querySelector<HTMLElement>("[data-report-page]");
        if (!page) throw new Error("Report page did not render.");

        pdf = await capturePage(page, pdf, days.length);
        toast.loading(`Building report — ${i + 1} of ${days.length} pages…`, { id: toastId });
      }

      finishReportPdf(pdf, reportFileName(userName, from, to));
      toast.success(`Report downloaded — ${days.length} pages.`, { id: toastId });
    } catch {
      toast.error("Couldn't build the PDF. Please try a smaller range.", { id: toastId });
    } finally {
      onDone();
    }
  }, [days, userName, from, to, onDone]);

  useEffect(() => {
    if (!mounted || started.current) return;
    started.current = true;
    void run();
  }, [mounted, run]);

  if (!mounted) return null;

  const day = days[index];

  return createPortal(
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: "fixed", top: 0, left: -100000, width: REPORT_PAGE_WIDTH, zIndex: -1 }}
    >
      {day && (
        <div
          key={day.date}
          data-report-page
          style={{ width: REPORT_PAGE_WIDTH, background: "#fff", padding: 24 }}
        >
          <ReportPage
            date={day.date}
            userName={userName}
            data={day.data}
            pageNumber={index + 1}
            pageCount={days.length}
          />
        </div>
      )}
    </div>,
    document.body,
  );
}
