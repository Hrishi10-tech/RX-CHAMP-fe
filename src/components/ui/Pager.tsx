"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const BUTTON =
  "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]";

/**
 * The page numbers to show: always the first and last, the current one and its
 * neighbours, with "…" for the gaps (1 … 4 5 6 … 12).
 */
export function pageList(page: number, pageCount: number): (number | "…")[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (const p of pages) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev === 2) out.push(prev + 1);
    else if (typeof prev === "number" && p - prev > 2) out.push("…");
    out.push(p);
  }
  return out;
}

/**
 * Previous / next paging for card lists, with the same range readout as
 * DataTable ("1–20 of 57 people"). Hidden when everything fits on one page.
 * `numbered` shows a button per page instead of "2 / 5".
 */
export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "result",
  plural = `${noun}s`,
  numbered = false,
  pageCount: pageCountProp,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
  /** When adding "s" is wrong ("person" → "people"). */
  plural?: string;
  numbered?: boolean;
  /** The server's page count, when it sends one. */
  pageCount?: number;
}) {
  const pageCount = Math.max(1, pageCountProp ?? Math.ceil(total / pageSize));
  if (total <= pageSize && page <= 1) return null;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const nouns = total === 1 ? noun : plural;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:px-6"
    >
      <span>
        <span className="font-semibold text-slate-700">
          {first}–{last}
        </span>{" "}
        of <span className="font-semibold text-slate-700">{total}</span> {nouns}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {numbered ? (
          pageList(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} aria-hidden className="px-1 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={`${BUTTON} ${
                  p === page
                    ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] font-semibold text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ),
          )
        ) : (
          <span className="min-w-16 text-center tabular-nums">
            {page} / {pageCount}
          </span>
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
