/**
 * The timesheet PDF, drawn directly with jsPDF calls: text, lines and filled
 * rectangles (SPEC 7.3). No page screenshots, no DOM, no images: a 120-day sheet
 * is a few hundred draw calls and takes milliseconds, and nothing on the page
 * can make it wait.
 *
 * `buildTimesheetPdf` only talks to the small `PdfDoc` interface, so a test can
 * hand it a recorder and check exactly what lands on which page.
 */
import { formatDuration } from "@/lib/format/duration";
import { hasOfflineTime } from "@/lib/format/payroll";
import { formatDayWithWeekday } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import type { Timesheet, TimesheetRow } from "@/features/timesheet/types";

export interface PdfDoc {
  setFont(fontName: string, fontStyle?: string): unknown;
  setFontSize(size: number): unknown;
  setTextColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setFillColor(r: number, g: number, b: number): unknown;
  setLineWidth(width: number): unknown;
  text(
    text: string,
    x: number,
    y: number,
    options?: { align?: "left" | "center" | "right" },
  ): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
  rect(x: number, y: number, w: number, h: number, style?: string): unknown;
  addPage(): unknown;
  setPage(page: number): unknown;
}

/** A4 landscape in points. */
export const PAGE = { width: 841.89, height: 595.28 } as const;
const MARGIN = 32;
const ROW_H = 15;
const HEAD_H = 18;
const FIRST_TABLE_TOP = 158;
const NEXT_TABLE_TOP = 62;
const FOOTER_Y = PAGE.height - 18;
const TABLE_BOTTOM = PAGE.height - 34;

export const ROWS_FIRST_PAGE = Math.floor((TABLE_BOTTOM - FIRST_TABLE_TOP - HEAD_H) / ROW_H);
export const ROWS_NEXT_PAGE = Math.floor((TABLE_BOTTOM - NEXT_TABLE_TOP - HEAD_H) / ROW_H);

type Rgb = [number, number, number];
const BRAND: Rgb = [34, 34, 204];
const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const FAINT: Rgb = [148, 163, 184];
const RULE: Rgb = [226, 232, 240];
const HEAD_FILL: Rgb = [241, 241, 252];
const OFF_FILL: Rgb = [248, 250, 252];
const GREEN: Rgb = [4, 120, 87];
const AMBER: Rgb = [180, 83, 9];
const RED: Rgb = [190, 18, 60];

interface Column {
  title: string;
  width: number;
  align: "left" | "right";
  cell: (row: TimesheetRow) => string;
}

const DASH = "-";

/** Durations as "7h 30m"; nothing as a dash so an empty cell never looks broken. */
function dur(sec: number): string {
  return sec > 0 ? formatDuration(sec) : DASH;
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : DASH;
}

const STATUS_TEXT: Record<string, string> = {
  FULL: "Full day",
  HALF: "Half day",
  ABSENT: "Absent",
  OFF: "Off",
  EXTRA: "Extra day",
  IN_PROGRESS: "In progress",
  UPCOMING: "Upcoming",
};

export function statusText(row: Pick<TimesheetRow, "status" | "label" | "isWorkingDay">): string {
  const base = STATUS_TEXT[row.status] ?? (row.isWorkingDay ? row.status || DASH : "Off");
  return row.label ? `${base} - ${row.label}` : base;
}

/** Built-in PDF fonts are Latin-1: keep every character inside it. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‒-―−]/g, "-")
    .replace(/·/g, "|")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ")
    .replace(/[^\x20-\x7e -ÿ]/g, "");
}

function dayCell(row: TimesheetRow): string {
  // "Mon 6 Oct" from the date itself, so a missing weekday never shows as blank.
  return formatDayWithWeekday(row.date);
}

/** The payroll column: focus time plus paid breaks, next to focus as in the Excel file. */
export const PAID_TITLE = "Paid time";

const COLUMNS: Column[] = [
  { title: "Date", width: 70, align: "left", cell: dayCell },
  {
    title: "In",
    width: 54,
    align: "left",
    cell: (r) => r.in?.text || formatTime12(r.in?.iso) || DASH,
  },
  {
    title: "Out",
    width: 54,
    align: "left",
    cell: (r) => r.out?.text || formatTime12(r.out?.iso) || DASH,
  },
  { title: "Focus", width: 56, align: "right", cell: (r) => dur(r.focusSec) },
  { title: PAID_TITLE, width: 58, align: "right", cell: (r) => dur(r.paidSec) },
  { title: "Target", width: 56, align: "right", cell: (r) => dur(r.targetSec) },
  { title: "%", width: 34, align: "right", cell: (r) => pct(r.focusSec, r.targetSec) },
  { title: "Paid breaks", width: 62, align: "right", cell: (r) => dur(r.paidBreakSec) },
  { title: "Unpaid", width: 50, align: "right", cell: (r) => dur(r.unpaidBreakSec) },
  { title: "Meetings", width: 54, align: "right", cell: (r) => dur(r.meetingsSec) },
  { title: "Away (approved)", width: 78, align: "right", cell: (r) => dur(r.awayApprovedSec) },
  { title: "Away (pending)", width: 74, align: "right", cell: (r) => dur(r.awayPendingSec) },
  { title: "Day", width: 78, align: "left", cell: statusText },
];

/** The column for offline time without activity data, shown only when there is some. */
export const OFFLINE_TITLE = "Offline, no data";
export const OFFLINE_NOTE =
  "Offline, no data: worked offline without activity data from the app; not counted as focus.";

/**
 * The table's columns for this timesheet: the offline column joins after
 * Meetings when any day has such time, and every width shrinks to keep the
 * table inside the page.
 */
export function columnsFor(sheet: Timesheet): Column[] {
  if (!hasOffline(sheet)) return fitted(COLUMNS);
  const at = COLUMNS.findIndex((c) => c.title === "Meetings") + 1;
  return fitted([
    ...COLUMNS.slice(0, at),
    { title: OFFLINE_TITLE, width: 72, align: "right", cell: (r) => dur(r.unverifiedSec) },
    ...COLUMNS.slice(at),
  ]);
}

/** Whether any day has offline time to show (at least a minute once rounded). */
function hasOffline(sheet: Timesheet): boolean {
  return sheet.rows.some((r) => hasOfflineTime(r.unverifiedSec));
}

/** The columns, narrowed in proportion when they would run past the page's margins. */
function fitted(columns: Column[]): Column[] {
  const room = PAGE.width - 2 * MARGIN;
  const total = columns.reduce((s, c) => s + c.width, 0);
  if (total <= room) return columns;
  const scale = room / total;
  return columns.map((c) => ({ ...c, width: c.width * scale }));
}

/** Splits the rows into pages: fewer on the first page, which carries the summary. */
export function paginateRows<T>(rows: T[]): T[][] {
  if (rows.length === 0) return [[]];
  const pages: T[][] = [rows.slice(0, ROWS_FIRST_PAGE)];
  for (let i = ROWS_FIRST_PAGE; i < rows.length; i += ROWS_NEXT_PAGE) {
    pages.push(rows.slice(i, i + ROWS_NEXT_PAGE));
  }
  return pages;
}

/** "1 Oct 2026" from "2026-10-01". */
function longDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][m - 1];
  return `${d} ${month} ${y}`;
}

export function rangeText(from: string, to: string): string {
  // An en dash on screen; pdfSafe turns it into a hyphen inside the PDF.
  return from === to ? longDate(from) : `${longDate(from)} – ${longDate(to)}`;
}

export interface BuildOptions {
  /** When the file was made (shown in the header). */
  generatedAt?: Date;
}

/** Draws the whole timesheet into `doc`; returns the page count. */
export function buildTimesheetPdf(
  doc: PdfDoc,
  sheet: Timesheet,
  options: BuildOptions = {},
): number {
  const generatedAt = options.generatedAt ?? new Date();
  const pages = paginateRows(sheet.rows);
  const columns = columnsFor(sheet);
  const offline = hasOffline(sheet);
  const tableWidth = columns.reduce((s, c) => s + c.width, 0);
  const left = MARGIN;
  const right = left + tableWidth;
  const range = rangeText(sheet.range.from, sheet.range.to);
  const name = sheet.person.name || "Unnamed person";

  const color = (fn: "setTextColor" | "setDrawColor" | "setFillColor", c: Rgb) =>
    doc[fn](c[0], c[1], c[2]);
  const write = (
    text: string,
    x: number,
    y: number,
    opts: { size?: number; bold?: boolean; color?: Rgb; align?: "left" | "center" | "right" } = {},
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 8);
    color("setTextColor", opts.color ?? INK);
    doc.text(pdfSafe(text), x, y, opts.align ? { align: opts.align } : undefined);
  };
  const rule = (y: number, c: Rgb = RULE, width = 0.6) => {
    color("setDrawColor", c);
    doc.setLineWidth(width);
    doc.line(left, y, right, y);
  };

  function firstHeader() {
    write("RX Vision", left, 42, { size: 16, bold: true, color: BRAND });
    write("Timesheet", right, 42, { size: 16, bold: true, align: "right" });
    write(name, left, 64, { size: 13, bold: true });
    write(range, right, 64, { size: 10, bold: true, align: "right" });
    const details = [sheet.person.designation, sheet.person.department, sheet.person.organisation]
      .filter(Boolean)
      .join(" | ");
    if (details) write(details, left, 78, { size: 9, color: MUTED });
    write(`Generated ${longDateOf(generatedAt)}, ${formatTime12(generatedAt)}`, right, 78, {
      size: 8,
      color: MUTED,
      align: "right",
    });
    rule(88, BRAND, 1);

    // Summary boxes: the month (or range) in seven numbers.
    const t = sheet.totals;
    const boxes: [string, string, string][] = [
      ["Focus", dur(t.focusSec), `of ${dur(t.targetSec)} target (${pct(t.focusSec, t.targetSec)})`],
      [PAID_TITLE, dur(t.paidSec), "focus + paid breaks"],
      ["Paid breaks", dur(t.paidBreakSec), "scheduled + buffer"],
      ["Unpaid breaks", dur(t.unpaidBreakSec), `${dur(t.breakSec)} on breaks in all`],
      ["Meetings", dur(t.meetingsSec), "time in meetings"],
      ["Away", dur(t.awayApprovedSec), `approved, ${dur(t.awayPendingSec)} pending`],
      ["Days", `${t.full} full`, `${t.half} half, ${t.absent} absent of ${t.workingDays} working`],
    ];
    const gap = 8;
    const boxW = (tableWidth - gap * (boxes.length - 1)) / boxes.length;
    boxes.forEach(([label, value, note], i) => {
      const x = left + i * (boxW + gap);
      color("setFillColor", HEAD_FILL);
      doc.rect(x, 98, boxW, 46, "F");
      write(label.toUpperCase(), x + 8, 110, { size: 7, bold: true, color: MUTED });
      write(value, x + 8, 126, { size: 13, bold: true, color: i <= 1 ? BRAND : INK });
      write(note, x + 8, 138, { size: 7, color: MUTED });
    });
  }

  function nextHeader() {
    write("RX Vision", left, 36, { size: 11, bold: true, color: BRAND });
    write(`${name} | ${range}`, right, 36, { size: 9, bold: true, align: "right" });
    rule(46, BRAND, 0.8);
  }

  function tableHead(top: number) {
    color("setFillColor", HEAD_FILL);
    doc.rect(left, top, tableWidth, HEAD_H, "F");
    let x = left;
    for (const c of columns) {
      const tx = c.align === "right" ? x + c.width - 5 : x + 5;
      write(c.title, tx, top + 12, { size: 7.5, bold: true, color: MUTED, align: c.align });
      x += c.width;
    }
  }

  function tableRow(row: TimesheetRow, top: number) {
    if (!row.isWorkingDay) {
      color("setFillColor", OFF_FILL);
      doc.rect(left, top, tableWidth, ROW_H, "F");
    }
    let x = left;
    for (const c of columns) {
      const tx = c.align === "right" ? x + c.width - 5 : x + 5;
      const text = c.cell(row);
      let tone: Rgb = text === DASH ? FAINT : INK;
      if (c.title === "Day") {
        tone =
          row.status === "FULL"
            ? GREEN
            : row.status === "HALF"
              ? AMBER
              : row.status === "ABSENT"
                ? RED
                : MUTED;
      }
      write(text, tx, top + 10.5, {
        size: 8,
        color: tone,
        align: c.align,
        bold: c.title === "Focus",
      });
      x += c.width;
    }
    color("setDrawColor", RULE);
    doc.setLineWidth(0.4);
    doc.line(left, top + ROW_H, right, top + ROW_H);
  }

  pages.forEach((rows, index) => {
    if (index > 0) doc.addPage();
    const top = index === 0 ? FIRST_TABLE_TOP : NEXT_TABLE_TOP;
    if (index === 0) firstHeader();
    else nextHeader();
    tableHead(top);
    if (rows.length === 0 && index === 0) {
      write("No days in this range.", left + 5, top + HEAD_H + 12, { size: 9, color: MUTED });
    }
    rows.forEach((row, i) => tableRow(row, top + HEAD_H + i * ROW_H));
  });

  // Footers last, once the page count is known.
  for (let i = 0; i < pages.length; i++) {
    doc.setPage(i + 1);
    rule(FOOTER_Y - 10);
    write(
      `RX Vision timesheet | ${name} | ${range}${offline ? ` | ${OFFLINE_NOTE}` : ""}`,
      left,
      FOOTER_Y,
      { size: 7, color: FAINT },
    );
    write(`Page ${i + 1} of ${pages.length}`, right, FOOTER_Y, {
      size: 7,
      color: FAINT,
      align: "right",
    });
  }

  return pages.length;
}

function longDateOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return longDate(`${y}-${m}-${day}`);
}

/**
 * Builds the PDF with jsPDF (loaded on first use: it touches `window` while
 * initialising) and saves it. Synchronous drawing; nothing to wait for.
 */
export async function saveTimesheetPdf(sheet: Timesheet, fileName: string): Promise<number> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true });
  const pages = buildTimesheetPdf(doc as unknown as PdfDoc, sheet);
  doc.save(fileName);
  return pages;
}
