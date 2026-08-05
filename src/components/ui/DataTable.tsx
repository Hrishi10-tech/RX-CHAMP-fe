"use client";

import { useMemo, useState } from "react";
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

const CHECKBOX = "h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[rgb(34_34_204)]";

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

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {selectable && selected.size > 0 && (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-[rgba(34,34,204,0.04)] px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">{selected.size} selected</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
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
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {searchable && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[rgb(34_34_204)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(34,34,204,0.15)] sm:w-64"
                />
              </div>
            )}
          </div>
          {action && <div className="flex items-center">{action}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
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
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-600 ${
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
                <td colSpan={colCount} className="px-6 py-12 text-center text-sm text-slate-400">
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
                    className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 data-[selected]:bg-[rgba(34,34,204,0.04)] ${
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
                        className={`px-6 py-4 font-medium text-slate-700 ${
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
        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-3.5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-[rgb(34_34_204)] focus:outline-none focus:ring-2 focus:ring-[rgba(34,34,204,0.15)]"
                  aria-label="Rows per page"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {String(n).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          ) : (
            <span>
              {total === 0 ? (
                `0 ${noun}`
              ) : (
                <>
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * effSize + 1}–{Math.min(currentPage * effSize, total)}
                  </span>{" "}
                  of <span className="font-semibold text-slate-700">{total}</span> {noun}
                </>
              )}
            </span>
          )}

          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <button
              type="button"
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {buildPages(currentPage, pageCount).map((p, idx) =>
              p === "…" ? (
                <span key={`gap-${idx}`} className="px-1.5 text-slate-400" aria-hidden>
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
                      ? "bg-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.3)]"
                      : "text-slate-600 hover:bg-slate-100"
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
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
