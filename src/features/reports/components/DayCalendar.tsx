"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { addDaysToKey } from "@/lib/time/businessTime";
import { WEEKDAY_SHORT, addMonths, daysInMonth, formatMonth, monthOfDate } from "@/lib/time/months";
import { calendarDays, canShowNextMonth } from "@/features/reports/lib/period";

const navBtn =
  "flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * A month calendar to pick one day, never after today. One tab stop: arrow keys
 * move by a day or a week, Page Up and Page Down by a month, Home and End to the
 * start and end of the week, Enter or Space picks.
 */
export function DayCalendar({
  selected,
  viewMonth,
  today,
  onSelect,
  onViewMonth,
}: {
  selected: string;
  viewMonth: string;
  today: string;
  onSelect: (date: string) => void;
  onViewMonth: (month: string) => void;
}) {
  const cells = calendarDays(viewMonth, today, selected);
  const inView = (d: string) => monthOfDate(d) === viewMonth;
  const [focusDate, setFocusDate] = useState<string>(() =>
    inView(selected) ? selected : inView(today) ? today : `${viewMonth}-01`,
  );
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const moveFocus = useRef(false);

  // Keep the tab stop inside the month on show.
  useEffect(() => {
    if (monthOfDate(focusDate) === viewMonth) return;
    setFocusDate(
      monthOfDate(selected) === viewMonth
        ? selected
        : monthOfDate(today) === viewMonth
          ? today
          : `${viewMonth}-01`,
    );
  }, [focusDate, selected, today, viewMonth]);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    refs.current.get(focusDate)?.focus();
  }, [focusDate, viewMonth]);

  function go(date: string) {
    const target = date > today ? today : date;
    moveFocus.current = true;
    setFocusDate(target);
    if (!inView(target)) onViewMonth(monthOfDate(target));
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, date: string) {
    const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
    // The same day a month away, or that month's last day (31 Oct -> 30 Nov).
    const shiftMonth = (by: number) => {
      const month = addMonths(monthOfDate(date), by);
      const day = Math.min(Number(date.slice(8)), daysInMonth(month));
      return `${month}-${String(day).padStart(2, "0")}`;
    };
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDaysToKey(date, -1),
      ArrowRight: () => addDaysToKey(date, 1),
      ArrowUp: () => addDaysToKey(date, -7),
      ArrowDown: () => addDaysToKey(date, 7),
      Home: () => addDaysToKey(date, -weekday),
      End: () => addDaysToKey(date, 6 - weekday),
      PageUp: () => shiftMonth(-1),
      PageDown: () => shiftMonth(1),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    go(move());
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onViewMonth(addMonths(viewMonth, -1))}
          aria-label="Previous month"
          className={navBtn}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <p className="text-sm font-semibold text-slate-900" aria-live="polite">
          {formatMonth(viewMonth)}
        </p>
        <button
          type="button"
          onClick={() => onViewMonth(addMonths(viewMonth, 1))}
          disabled={!canShowNextMonth(viewMonth, today)}
          aria-label="Next month"
          className={navBtn}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div role="grid" aria-label={formatMonth(viewMonth)} className="mt-2">
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEKDAY_SHORT.map((d) => (
            <span
              key={d}
              role="columnheader"
              aria-label={d}
              className="py-1 text-center text-[11px] font-semibold uppercase text-slate-500"
            >
              {d.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <div key={w} role="row" className="mt-1 grid grid-cols-7 gap-1">
            {cells.slice(w * 7, w * 7 + 7).map((c, i) =>
              c.date ? (
                <span key={c.date} role="gridcell" aria-selected={c.selected}>
                  <button
                    ref={(el) => {
                      if (el) refs.current.set(c.date as string, el);
                      else refs.current.delete(c.date as string);
                    }}
                    type="button"
                    tabIndex={c.date === focusDate ? 0 : -1}
                    disabled={c.disabled}
                    aria-label={`${c.ariaLabel}${c.today ? ", today" : ""}`}
                    aria-pressed={c.selected}
                    onClick={() => {
                      setFocusDate(c.date as string);
                      onSelect(c.date as string);
                    }}
                    onKeyDown={(e) => onKey(e, c.date as string)}
                    className={`flex h-9 w-full items-center justify-center rounded-lg text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.45)] disabled:cursor-not-allowed disabled:opacity-35 ${
                      c.selected
                        ? "bg-[rgb(34_34_204)] font-bold text-white"
                        : c.today
                          ? "border border-indigo-300 font-bold text-slate-900 hover:bg-slate-100"
                          : "font-medium text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {c.label}
                  </button>
                </span>
              ) : (
                <span key={`blank-${w}-${i}`} role="gridcell" aria-hidden />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
