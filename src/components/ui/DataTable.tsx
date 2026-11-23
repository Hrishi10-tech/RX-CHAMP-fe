"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

import type { Column, DataTableProps } from "./types";

const ALIGN: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function buildPages(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  for (let p = 1; p <= count; p++) {
    if (p === 1 || p === count || (p >= current - 1 && p <= current + 1)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }
  return pages;
}

const CHECKBOX = "h-4 w-4 shrink-0 cursor-pointer rounded border-edge-strong accent-brand";

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = "No records found.",
  minWidth = 640,
  title,
  searchable = false,
  searchKeys,
  searchPlaceholder = "Search…",
  action,
  selectable = false,
  rowActions,
  onRowClick,
  renderBulkActions,
  pageSize,
  pageSizeOptions,
  countNoun = "result",
  serverPagination,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize ?? pageSizeOptions?.[0] ?? 10);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const keyOf = (row: T, index: number) => (getRowKey ? getRowKey(row, index) : index);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.trim().toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((k) =>
        String((row as Record<string, unknown>)[k] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [data, query, searchable, searchKeys, columns]);

  const paginated = Boolean(pageSize || pageSizeOptions || serverPagination);
  const effSize = serverPagination?.pageSize ?? size;
  const pageCount = serverPagination
    ? Math.max(1, serverPagination.pageCount)
    : paginated
      ? Math.max(1, Math.ceil(filtered.length / size))
      : 1;
  const currentPage = serverPagination ? serverPagination.page : Math.min(page, pageCount);
  const paged = serverPagination
    ? filtered
    : paginated
      ? filtered.slice((currentPage - 1) * size, currentPage * size)
      : filtered;
  const goTo = (p: number) => {
    const next = Math.max(1, Math.min(pageCount, p));
    if (serverPagination) serverPagination.onPageChange(next);
    else setPage(next);
  };

  const allSelected =
    filtered.length > 0 && filtered.every((row, i) => selected.has(keyOf(row, i)));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((row, i) => keyOf(row, i))));
  const toggleRow = (k: string | number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const clearSelection = () => setSelected(new Set());

  const showToolbar = Boolean(title || searchable || action);
  const total = serverPagination ? serverPagination.total : filtered.length;
  const noun = total === 1 ? countNoun : `${countNoun}s`;
  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const cellOf = (col: (typeof columns)[number], row: T, index: number): ReactNode =>
    col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "");
  // Phones: one card a row, the first column as its heading, every other column
  // as a labelled line, "actions" last. The table needs more room than a phone has.
  const [headColumn, ...otherColumns] = columns;
  const actionsColumn = otherColumns.find((c) => c.key === "actions");
  const detailColumns = otherColumns.filter((c) => c !== actionsColumn);

  return (
    <div className="overflow-hidden rounded-2xl border border-card bg-card shadow-sm">
      {selectable && selected.size > 0 && (
        <div className="flex flex-col gap-3 border-b border-card bg-brand/4 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-body">{selected.size} selected</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-sm font-medium text-quiet hover:text-body"
            >
              Clear
            </button>
          </div>
          {renderBulkActions && (
            <div className="flex items-center gap-2">
              {renderBulkActions(Array.from(selected), clearSelection)}
            </div>
          )}
        </div>
      )}
      {showToolbar && (
        <div className="flex flex-col gap-3 border-b border-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {title && <h2 className="text-base font-semibold text-primary">{title}</h2>}
            {searchable && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-card bg-fill py-2 pl-9 pr-3 text-sm text-body placeholder:text-neutral focus:border-brand focus:bg-field focus:outline-none focus:ring-2 focus:ring-brand/15 sm:w-64"
                />
              </div>
            )}
          </div>
          {action && <div className="flex items-center">{action}</div>}
        </div>
      )}

      <ul className="divide-y divide-divider sm:hidden">
        {paged.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-quiet">{emptyMessage}</li>
        ) : (
          paged.map((row, i) => {
            const globalIndex = paginated ? (currentPage - 1) * effSize + i : i;
            const k = keyOf(row, globalIndex);
            const isSelected = selected.has(k);
            return (
              <li
                key={k}
                data-selected={isSelected || undefined}
                onClick={onRowClick ? () => onRowClick(row, globalIndex) : undefined}
                className={`space-y-2.5 px-4 py-3.5 data-[selected]:bg-brand/4 ${
                  onRowClick ? "cursor-pointer active:bg-fill" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {selectable && (
                    <label
                      className="-m-3 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className={CHECKBOX}
                        checked={isSelected}
                        onChange={() => toggleRow(k)}
                        aria-label="Select row"
                      />
                    </label>
                  )}
                  {headColumn && (
                    <div className="min-w-0 flex-1 text-sm font-medium text-body [overflow-wrap:anywhere]">
                      {cellOf(headColumn, row, globalIndex)}
                    </div>
                  )}
                </div>
                {detailColumns.length > 0 && (
                  <dl className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                    {detailColumns.map((col) => (
                      <Fragment key={col.key}>
                        <dt className="pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
                          {col.header}
                        </dt>
                        <dd className="min-w-0 break-words text-body">
                          {cellOf(col, row, globalIndex)}
                        </dd>
                      </Fragment>
                    ))}
                  </dl>
                )}
                {actionsColumn && (
                  <div className="flex justify-end">{cellOf(actionsColumn, row, globalIndex)}</div>
                )}
              </li>
            );
          })
        )}
      </ul>

      <div className="relative hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-card bg-fill/70">
              {selectable && (
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-4 text-xs font-bold uppercase tracking-wider text-soft ${
                    ALIGN[col.align ?? "left"]
                  } ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="w-12 px-6 py-4" />}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-12 text-center text-sm text-quiet">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => {
                const globalIndex = paginated ? (currentPage - 1) * effSize + i : i;
                const k = keyOf(row, globalIndex);
                const isSelected = selected.has(k);
                return (
                  <tr
                    key={k}
                    data-selected={isSelected || undefined}
                    onClick={onRowClick ? () => onRowClick(row, globalIndex) : undefined}
                    className={`border-b border-divider last:border-0 hover:bg-fill/60 data-[selected]:bg-brand/4 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {selectable && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className={CHECKBOX}
                          checked={isSelected}
                          onChange={() => toggleRow(k)}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-4 font-medium text-body ${
                          ALIGN[col.align ?? "left"]
                        } ${col.className ?? ""}`}
                      >
                        {col.render
                          ? col.render(row, globalIndex)
                          : String((row as Record<string, unknown>)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {paginated && (
        <div className="flex flex-col gap-3 border-t border-card px-6 py-3.5 text-sm text-quiet sm:flex-row sm:items-center sm:justify-between">
          {pageSizeOptions ? (
            <div className="flex items-center gap-2">
              <span>Show items</span>
              <div className="relative">
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none rounded-lg border border-card bg-field py-1.5 pl-3 pr-8 text-sm font-medium text-body focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  aria-label="Rows per page"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {String(n).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet" />
              </div>
            </div>
          ) : (
            <span>
              {total === 0 ? (
                `0 ${noun}`
              ) : (
                <>
                  <span className="font-semibold text-body">
                    {(currentPage - 1) * effSize + 1}–{Math.min(currentPage * effSize, total)}
                  </span>{" "}
                  of <span className="font-semibold text-body">{total}</span> {noun}
                </>
              )}
            </span>
          )}

          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <button
              type="button"
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-card text-quiet hover:bg-fill disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {buildPages(currentPage, pageCount).map((p, idx) =>
              p === "…" ? (
                <span key={`gap-${idx}`} className="px-1.5 text-quiet" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goTo(p)}
                  aria-current={p === currentPage ? "page" : undefined}
                  className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium ${
                    p === currentPage
                      ? "bg-brand text-on-brand shadow-sm shadow-brand/30"
                      : "text-soft hover:bg-panel"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-card text-quiet hover:bg-fill disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
