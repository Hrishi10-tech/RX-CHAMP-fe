"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentedTab<T extends string> {
  value: T;
  label: ReactNode;
  /** Shown after the label, e.g. a count. */
  badge?: ReactNode;
}

/**
 * Pill tabs (role="tablist") with the keyboard behaviour screen-reader users
 * expect: one tab stop, arrows and Home/End move between tabs and select them.
 * Scrolls sideways inside itself on narrow screens rather than widening the page.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  size = "md",
}: {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** When set, each tab gets id `${idPrefix}-tab-${value}` and controls `${idPrefix}-panel`. */
  idPrefix?: string;
  size?: "sm" | "md";
  /** Kept for callers; every surface is dark in the agent design, so both look the same. */
  tone?: "light" | "dark";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(tabs[next].value);
  }

  // Tighter on phones so four tabs still fit a 390px screen without scrolling.
  const pad = size === "sm" ? "px-3 py-1.5 text-[0.8125rem]" : "px-2.5 py-2 text-sm sm:px-4";
  // Nothing chosen (a value outside the tabs): the first tab keeps the keyboard's way in.
  const noneSelected = !tabs.some((tab) => tab.value === value);

  return (
    <div className="scrollbar-none relative -mx-1 max-w-full overflow-x-auto px-1">
      <div
        role="tablist"
        aria-label={label}
        // 3.6 (W-16): on a phone the tabs wrap rather than hide off the right edge.
        // Agent tabs: a field-coloured well on every surface.
        className="inline-flex flex-wrap items-center gap-1 rounded-[10px] border border-card bg-field p-1 sm:min-w-max sm:flex-nowrap"
      >
        {tabs.map((tab, i) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={idPrefix ? `${idPrefix}-tab-${tab.value}` : undefined}
              aria-controls={idPrefix ? `${idPrefix}-panel` : undefined}
              aria-selected={selected}
              tabIndex={selected || (noneSelected && i === 0) ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => move(e, i)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 max-sm:min-h-11 ${pad} ${
                // Agent tabs: the chosen tab is the neutral fill with full text, never a brand fill.
                selected
                  ? "bg-fill text-primary shadow-sm"
                  : "text-quiet hover:bg-panel hover:text-primary"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && tab.badge !== false && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums ${
                    selected ? "bg-brand/14 text-brand" : "bg-fill text-soft"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
