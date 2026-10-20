import {
  OFFLINE_TITLE,
  PAID_TITLE,
  PAGE,
  ROWS_FIRST_PAGE,
  columnsFor,
  ROWS_NEXT_PAGE,
  buildTimesheetPdf,
  paginateRows,
  pdfSafe,
  rangeText,
  statusText,
  type PdfDoc,
} from "./pdf";
import { readTimesheet, timesheetFileBase, totalsOf } from "@/features/timesheet/api/timesheet";
import type { Timesheet, TimesheetRow } from "@/features/timesheet/types";

/** Records every draw call, per page, the way jsPDF would receive them. */
class RecordingDoc implements PdfDoc {
  pages: { texts: { text: string; x: number; y: number }[]; lines: number; rects: number }[] = [
    { texts: [], lines: 0, rects: 0 },
  ];
  current = 0;
  setFont() {}
  setFontSize() {}
  setTextColor() {}
  setDrawColor() {}
  setFillColor() {}
  setLineWidth() {}
  text(text: string, x: number, y: number) {
    this.pages[this.current].texts.push({ text, x, y });
  }
  line() {
    this.pages[this.current].lines += 1;
  }
  rect() {
    this.pages[this.current].rects += 1;
  }
  addPage() {
    this.pages.push({ texts: [], lines: 0, rects: 0 });
    this.current = this.pages.length - 1;
  }
  setPage(n: number) {
    this.current = n - 1;
  }
  textsOf(page: number): string[] {
    return this.pages[page].texts.map((t) => t.text);
  }
  allText(): string {
    return this.pages.flatMap((p) => p.texts.map((t) => t.text)).join("\n");
  }
}

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function row(date: string, i: number): TimesheetRow {
  const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
  const focusSec = sunday ? 0 : 7 * 3600 + (i % 7) * 60;
  return {
    date,
    weekday: ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1,
    isWorkingDay: !sunday,
    label: date === "2026-07-15" ? "Founders' day" : null,
    in: sunday ? null : { iso: `${date}T03:35:00.000Z`, text: "" },
    out: sunday ? null : { iso: `${date}T12:50:00.000Z`, text: "" },
    focusSec,
    targetSec: sunday ? 0 : 27000,
    breakSec: sunday ? 0 : 5400,
    paidBreakSec: sunday ? 0 : 5400,
    unpaidBreakSec: 0,
    meetingsSec: sunday ? 0 : 1800,
    awayApprovedSec: 600,
    awayPendingSec: 0,
    unverifiedSec: 0,
    paidSec: sunday ? 0 : focusSec + 5400,
    status: sunday ? "OFF" : i % 9 === 0 ? "HALF" : "FULL",
  };
}

function sheet(days: number): Timesheet {
  const rows = Array.from({ length: days }, (_, i) => row(addDays("2026-06-01", i), i));
  return {
    person: {
      id: "u1",
      name: "Asha Kumar",
      email: null,
      designation: "Firmware engineer",
      department: "Hardware",
      organisation: "Xelements Health",
    },
    range: { from: rows[0].date, to: rows.at(-1)!.date },
    rows,
    totals: totalsOf(rows),
  };
}

describe("buildTimesheetPdf (SPEC 7.3)", () => {
  const generatedAt = new Date("2026-10-19T09:35:00.000Z");

  it("draws 120 days onto a handful of pages, every row once", () => {
    const doc = new RecordingDoc();
    const pages = buildTimesheetPdf(doc, sheet(120), { generatedAt });
    const expected = 1 + Math.ceil((120 - ROWS_FIRST_PAGE) / ROWS_NEXT_PAGE);
    expect(pages).toBe(expected);
    expect(doc.pages).toHaveLength(expected);
    // Each row's date appears exactly once ("Mon 1 Jun").
    const text = doc.allText();
    expect(text.match(/Mon 1 Jun/g)).toHaveLength(1);
    expect(text.match(/Mon 28 Sep/g)).toHaveLength(1);
  });

  it("puts the name, range and totals in the first page's header", () => {
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, sheet(30), { generatedAt });
    const first = doc.textsOf(0);
    expect(first).toContain("Asha Kumar");
    expect(first).toContain("1 Jun 2026 - 30 Jun 2026");
    expect(first).toContain("Firmware engineer | Hardware | Xelements Health");
    expect(first.some((t) => /^FOCUS$/.test(t))).toBe(true);
    expect(first.some((t) => /full$/.test(t))).toBe(true);
    expect(first.some((t) => /^Generated .*, \d{1,2}:\d{2} (AM|PM)$/.test(t))).toBe(true);
  });

  it("writes in and out times in 12-hour form, never 24-hour", () => {
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, sheet(14), { generatedAt });
    const text = doc.allText();
    // 03:35 UTC and 12:50 UTC in India.
    expect(text).toContain("9:05 AM");
    expect(text).toContain("6:20 PM");
    expect(text).not.toMatch(/\b(1[3-9]|2[0-3]):\d{2}\b/);
  });

  it("marks days off and holidays, and leaves dashes for nothing", () => {
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, sheet(45), { generatedAt });
    const text = doc.allText();
    expect(text).toContain("Off");
    expect(text).toContain("Full day - Founders' day");
    expect(text).toContain("-");
  });

  it("numbers every page in its footer", () => {
    const doc = new RecordingDoc();
    const pages = buildTimesheetPdf(doc, sheet(80), { generatedAt });
    for (let i = 0; i < pages; i++) {
      expect(doc.textsOf(i)).toContain(`Page ${i + 1} of ${pages}`);
    }
  });

  it("still makes one page for an empty range", () => {
    const doc = new RecordingDoc();
    const empty: Timesheet = { ...sheet(1), rows: [], totals: totalsOf([]) };
    expect(buildTimesheetPdf(doc, empty, { generatedAt })).toBe(1);
    expect(doc.allText()).toContain("No days in this range.");
  });

  it("keeps every column inside the page", () => {
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, sheet(3), { generatedAt });
    for (const t of doc.pages[0].texts) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(PAGE.width);
      expect(t.y).toBeLessThanOrEqual(PAGE.height);
    }
  });

  it("adds the offline column, inside the page, only when a day has offline time", () => {
    const plain = new RecordingDoc();
    buildTimesheetPdf(plain, sheet(3), { generatedAt });
    expect(plain.allText()).not.toContain(OFFLINE_TITLE);

    const s = sheet(3);
    s.rows[1] = { ...s.rows[1], unverifiedSec: 25 * 60 };
    s.totals = totalsOf(s.rows);
    expect(s.totals.unverifiedSec).toBe(1500);
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, s, { generatedAt });
    const texts = doc.textsOf(0);
    expect(texts).toContain(OFFLINE_TITLE);
    expect(texts).toContain("25m");
    expect(doc.allText()).toContain("not counted as focus");
    const widths = columnsFor(s).reduce((sum, c) => sum + c.width, 0);
    expect(widths).toBeLessThanOrEqual(PAGE.width - 64 + 0.001);
    for (const t of doc.pages[0].texts) expect(t.x).toBeLessThanOrEqual(PAGE.width);
  });

  it("shows paid time next to focus, in the table and the summary", () => {
    const s = sheet(3);
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, s, { generatedAt });
    const texts = doc.textsOf(0);
    const titles = columnsFor(s).map((c) => c.title);
    expect(titles.indexOf(PAID_TITLE)).toBe(titles.indexOf("Focus") + 1);
    expect(texts).toContain(PAID_TITLE);
    expect(texts).toContain(PAID_TITLE.toUpperCase());
    expect(texts).toContain("focus + paid breaks");
    // 1 Jun 2026 is a Monday: 7h 00m of focus and 1h 30m of paid breaks.
    expect(texts).toContain("8h 30m");
    expect(columnsFor(s).reduce((sum, c) => sum + c.width, 0)).toBeLessThanOrEqual(
      PAGE.width - 64 + 0.001,
    );
  });

  it("leaves the offline column out for time that rounds to nothing", () => {
    const s = sheet(3);
    s.rows[1] = { ...s.rows[1], unverifiedSec: 20 };
    const doc = new RecordingDoc();
    buildTimesheetPdf(doc, s, { generatedAt });
    expect(doc.allText()).not.toContain(OFFLINE_TITLE);
  });

  it("is fast: 366 days well under the 3-second budget", () => {
    const start = Date.now();
    buildTimesheetPdf(new RecordingDoc(), sheet(366), { generatedAt });
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("timesheet helpers", () => {
  it("paginates with a shorter first page", () => {
    const pages = paginateRows(Array.from({ length: ROWS_FIRST_PAGE + 1 }, (_, i) => i));
    expect(pages.map((p) => p.length)).toEqual([ROWS_FIRST_PAGE, 1]);
    expect(paginateRows([])).toEqual([[]]);
  });

  it("keeps PDF text inside the built-in fonts", () => {
    expect(pdfSafe("6h 24m · −20m – “quoted” 9:05 AM")).toBe('6h 24m | -20m - "quoted" 9:05 AM');
  });

  it("names statuses and ranges", () => {
    expect(statusText({ status: "HALF", label: null, isWorkingDay: true })).toBe("Half day");
    expect(statusText({ status: "OFF", label: "Diwali", isWorkingDay: false })).toBe(
      "Off - Diwali",
    );
    expect(rangeText("2026-10-01", "2026-10-01")).toBe("1 Oct 2026");
  });

  it("reads the server's answer whichever way in/out come", () => {
    const sheetRead = readTimesheet(
      {
        person: { id: "u1", name: "Asha", department: { name: "Hardware" } },
        range: { from: "2026-10-01", to: "2026-10-02" },
        rows: [
          {
            date: "2026-10-02",
            in: { at: "2026-10-02T03:35:00Z", text: "9:05 AM" },
            out: null,
            focusSec: 100,
            status: "full",
          },
          {
            date: "2026-10-01",
            weekday: 4,
            in: "2026-10-01T04:00:00Z",
            in12: "9:30 AM",
            focusSec: 50,
          },
        ],
      },
      "u1",
      { from: "2026-10-01", to: "2026-10-02" },
    );
    expect(sheetRead.rows.map((r) => r.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(sheetRead.rows[0].in?.text).toBe("9:30 AM");
    expect(sheetRead.rows[1].in?.text).toBe("9:05 AM");
    expect(sheetRead.rows[1].status).toBe("FULL");
    expect(sheetRead.rows.map((r) => r.weekday)).toEqual([4, 5]);
    expect(sheetRead.totals.days).toBe(2);
    expect(sheetRead.totals.focusSec).toBe(150);
    expect(sheetRead.person.department).toBe("Hardware");
  });

  it("reads paid time, and works it out from an answer that leaves it out", () => {
    const read = readTimesheet(
      {
        rows: [
          { date: "2026-10-01", focusSec: 3600, paidBreakSec: 600, paidSec: 4300 },
          { date: "2026-10-02", focusSec: 3600, paidBreakSec: 600 },
        ],
        totals: { paidSec: 8500 },
      },
      "u1",
      { from: "2026-10-01", to: "2026-10-02" },
    );
    expect(read.rows.map((r) => r.paidSec)).toEqual([4300, 4200]);
    // The server's total wins over the sum of the rows.
    expect(read.totals.paidSec).toBe(8500);
    expect(totalsOf(read.rows).paidSec).toBe(8500);
  });

  it("names the file after the person and the range", () => {
    expect(timesheetFileBase("Asha K.", "2026-10-01", "2026-10-19")).toBe(
      "rx-vision-timesheet-asha-k-2026-10-01-to-2026-10-19",
    );
    expect(timesheetFileBase("", "2026-10-01", "2026-10-01")).toBe(
      "rx-vision-timesheet-person-2026-10-01-to-2026-10-01",
    );
  });
});
