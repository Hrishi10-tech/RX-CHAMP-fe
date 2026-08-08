// Type-only: erased at compile time, so neither library is pulled in server-side.
import type { jsPDF } from "jspdf";

/**
 * Both libraries touch `document`/`window` while initialising, which crashes the
 * Next.js render worker if they are imported at module scope — even from a client
 * component, since those still render on the server. Loaded on first use instead,
 * which also keeps them out of the page's initial bundle.
 */
async function loadPdfLibs() {
  const [{ default: html2canvas }, { jsPDF: JsPdf }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return { html2canvas, JsPdf };
}

/**
 * Width each report page is laid out at, in CSS pixels — A4 landscape at 96 DPI.
 * Page height is whatever the content needs; the PDF page is sized to match so a
 * day is never clipped or split across sheets.
 */
export const REPORT_PAGE_WIDTH = 1122;

/**
 * Rendering multiplier. Cost grows with its square, so long exports drop to 1.5 —
 * still ~144 DPI, and the difference is invisible on screen.
 */
function scaleFor(pageCount: number): number {
  return pageCount > 10 ? 1.5 : 2;
}

/** JPEG rather than PNG: a page of white panels compresses ~10x smaller. */
const JPEG_QUALITY = 0.9;

/** A PDF being assembled one page at a time. */
export interface ReportPdf {
  doc: jsPDF;
  scale: number;
}

/**
 * Captures one laid-out page and appends it, creating the document on the first call.
 *
 * html2canvas repaints the DOM onto a canvas, so the result is image-based — that is
 * the unavoidable trade for producing a file without the browser's print dialog, which
 * is the only thing that can emit real vector text.
 *
 * The element must be laid out (not `display: none`) or it measures zero; the caller
 * keeps it off-screen instead.
 */
export async function capturePage(
  page: HTMLElement,
  pdf: ReportPdf | null,
  totalPages: number,
): Promise<ReportPdf> {
  const { html2canvas, JsPdf } = await loadPdfLibs();
  const scale = pdf?.scale ?? scaleFor(totalPages);

  const canvas = await html2canvas(page, {
    scale,
    backgroundColor: "#ffffff",
    logging: false,
    // Nothing on a report page is a remote image (screenshots are excluded), so the
    // proxy/CORS paths are pure overhead here.
    useCORS: false,
    allowTaint: false,
    removeContainer: true,
    // The node is off-screen in the live document; clone it at its own size so the
    // capture isn't clipped to the viewport.
    windowWidth: REPORT_PAGE_WIDTH,
    width: page.offsetWidth,
    height: page.offsetHeight,
  });

  // Page size follows the rendered page, so every sheet fits exactly.
  const size: [number, number] = [canvas.width / scale, canvas.height / scale];

  const next: ReportPdf = pdf ?? {
    doc: new JsPdf({ unit: "px", format: size, orientation: "landscape", compress: true }),
    scale,
  };
  if (pdf) next.doc.addPage(size, "landscape");

  // Encoded here rather than handing jsPDF the canvas: given a canvas it re-encodes at
  // quality 1.0, which roughly triples the file for no visible gain.
  next.doc.addImage(
    canvas.toDataURL("image/jpeg", JPEG_QUALITY),
    "JPEG",
    0,
    0,
    size[0],
    size[1],
    undefined,
    "FAST",
  );

  // Free the bitmap immediately so a long export doesn't pile up memory.
  canvas.width = 0;
  canvas.height = 0;

  return next;
}

/** Writes the assembled document out as a download. */
export function finishReportPdf(pdf: ReportPdf | null, fileName: string): void {
  if (!pdf) throw new Error("Nothing to export.");
  pdf.doc.save(fileName);
}

/** `lakshman-s-report-2026-08-01-to-2026-08-06.pdf` */
export function reportFileName(userName: string | undefined, from: string, to: string): string {
  const who = (userName ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const range = from === to ? from : `${from}-to-${to}`;
  return `${who || "user"}-report-${range}.pdf`;
}
