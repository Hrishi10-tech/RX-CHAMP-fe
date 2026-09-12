"use client";

import { format, parseISO } from "date-fns";

import { formatClock } from "@/features/activity/lib/format";
import type { TimesheetEmployee, TimesheetRow } from "@/features/analytics/lib/reportRange";

/**
 * Rows per block, and rows per printed sheet.
 *
 * Name, Team and Department are identical on every row — it is one employee's sheet —
 * so they move into the header and the table keeps only the six columns that actually
 * change. That is narrow enough to run two blocks side by side, which fits any calendar
 * month on a single page without shrinking the type.
 *
 * The A4 landscape page (794px) leaves ~690px under the header, banner and details bar;
 * 16 rows at ~29px each comes to ~505px, so there is comfortable slack.
 */
const ROWS_PER_BLOCK = 16;
export const ROWS_PER_PAGE = ROWS_PER_BLOCK * 2;

/** `01 Sep 2026` — the compact form the banner and the Date column both use. */
function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return iso;
  }
}

/** `Thursday 10 Sep 2026` — when the sheet was produced, not what it covers. */
function generatedOn(): string {
  return format(new Date(), "EEEE d MMM yyyy");
}

/**
 * Two header sets for the same six columns. A range short enough for one block gets the
 * full labels from the spec; a two-block sheet halves the width available per column, so
 * it drops the redundant "Time" and lets the figures stay full size.
 */
const FULL_COLUMNS = [
  "Date",
  "In Time",
  "Out Time",
  "Working Time",
  "Productive Time",
  "Away Time",
] as const;
const COMPACT_COLUMNS = ["Date", "In", "Out", "Working", "Productive", "Away"] as const;

/** Dash rather than blank: an empty cell reads as a rendering fault. */
const EMPTY = "—";

function Cell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      className={`border-b border-r border-slate-200 px-2.5 py-1.5 text-[11px] last:border-r-0 ${
        muted ? "text-slate-400" : "text-slate-700"
      }`}
    >
      {children}
    </td>
  );
}

function Row({ row }: { row: TimesheetRow }) {
  // A failed fetch and a genuinely untracked day are indistinguishable to the reader,
  // and both mean the same thing here: no hours to report.
  const missing = row.workingSec === null;

  return (
    <tr>
      <Cell>{shortDate(row.date)}</Cell>
      <Cell muted={!row.inTime}>{row.inTime ?? EMPTY}</Cell>
      <Cell muted={!row.outTime}>{row.outTime ?? EMPTY}</Cell>
      <Cell muted={missing}>{missing ? EMPTY : formatClock(row.workingSec ?? 0)}</Cell>
      {/* Productive Time has no separate measure yet — it restates Active Time. */}
      <Cell muted={missing}>{missing ? EMPTY : formatClock(row.workingSec ?? 0)}</Cell>
      <Cell muted={missing}>{missing ? EMPTY : formatClock(row.awaySec ?? 0)}</Cell>
    </tr>
  );
}

/** One table of days. Two of these sit side by side once a range outgrows a single block. */
function Block({ rows, compact }: { rows: TimesheetRow[]; compact: boolean }) {
  return (
    <table className="w-full table-fixed border-collapse border border-slate-200">
      <thead>
        <tr className="bg-[#fbeed7]">
          {(compact ? COMPACT_COLUMNS : FULL_COLUMNS).map((c) => (
            <th
              key={c}
              className="border-b border-r border-slate-200 px-2.5 py-1.5 text-left text-[11px] font-semibold text-[#7a5c26] last:border-r-0"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <Row key={r.date} row={r} />
        ))}
      </tbody>
    </table>
  );
}

/** One labelled fact in the details bar. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <p className="text-[11px] font-semibold text-slate-700">{value || EMPTY}</p>
    </div>
  );
}

/**
 * One printed sheet of the timesheet: a slice of the range's rows under a repeated
 * header, so a page pulled out of the middle of the PDF still says who and when.
 */
export function TimesheetPage({
  employee,
  rows,
  from,
  to,
  pageNumber,
  pageCount,
}: {
  employee: TimesheetEmployee;
  /** Only this sheet's rows — the caller does the slicing. */
  rows: TimesheetRow[];
  from: string;
  to: string;
  pageNumber: number;
  pageCount: number;
}) {
  const range = from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;

  // A short range stays one full-width table — the shape of the original spec. Only a
  // sheet that actually needs the second block splits into two.
  const split = rows.length > ROWS_PER_BLOCK;
  const left = split ? rows.slice(0, ROWS_PER_BLOCK) : rows;
  const right = split ? rows.slice(ROWS_PER_BLOCK) : [];

  // The sheet grows with `flex-1`, not `h-full`: its height comes from a `min-height` on
  // the capture host, which is not a definite height for a percentage to resolve against,
  // so `h-full` collapsed to the content and left the footer floating mid-page.
  return (
    <article className="flex flex-1 flex-col">
      <header className="flex items-start justify-between border-b border-slate-200 pb-2.5">
        <div>
          <p className="text-[11px] font-bold text-slate-700">{generatedOn()}</p>
          {employee.company && (
            <p className="mt-0.5 text-[11px] text-slate-500">{employee.company}</p>
          )}
        </div>
        <p className="text-xl font-bold tracking-tight text-[rgb(34_34_204)]">Rx Vision</p>
      </header>

      <h1 className="mt-3.5 rounded-sm bg-[#fde4a0] py-2 text-center text-base font-semibold text-slate-800">
        Daily Timesheet ({range})
      </h1>

      {/* The three constants, lifted out of the table so every row is only what changed. */}
      <div className="mt-3 grid grid-cols-3 gap-4 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
        <Detail label="Employee Name" value={employee.name} />
        <Detail label="Team Name" value={employee.team} />
        <Detail label="Department Name" value={employee.department} />
      </div>

      <div className={`mt-3 ${split ? "grid grid-cols-2 gap-4" : ""}`}>
        <Block rows={left} compact={split} />
        {split && <Block rows={right} compact />}
      </div>

      {/* Pushes the footer to the bottom of the sheet however few rows this page holds. */}
      <div className="flex-1" />

      <footer className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        <span>{employee.name}</span>
        <span>
          Page {pageNumber} of {pageCount}
        </span>
      </footer>
    </article>
  );
}
