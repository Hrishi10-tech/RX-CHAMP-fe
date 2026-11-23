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
  tone = "light",
}: {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  /** When set, each tab gets id `${idPrefix}-tab-${value}` and controls `${idPrefix}-panel`. */
  idPrefix?: string;
  size?: "sm" | "md";
  /** "dark" sits on the dark cards of the avatar screens (design page 10). */
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
  const pad = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-2 text-sm sm:px-4";
  const dark = tone === "dark";
  // Nothing chosen (a value outside the tabs): the first tab keeps the keyboard's way in.
  const noneSelected = !tabs.some((tab) => tab.value === value);

  return (
    <div className="scrollbar-none relative -mx-1 max-w-full overflow-x-auto px-1">
      <div
        role="tablist"
        aria-label={label}
        className={`inline-flex min-w-max items-center gap-1 rounded-xl border p-1 shadow-sm ${
          dark ? "border-white/10 bg-[#131823]" : "border-slate-200 bg-white"
        }`}
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
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                dark
                  ? "focus-visible:ring-[#6FC9B6]/60"
                  : "focus-visible:ring-[rgba(34,34,204,0.35)]"
              } ${pad} ${
                dark
                  ? selected
                    ? "bg-[#2B3445] text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                  : selected
                    ? "bg-[rgb(34_34_204)] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && tab.badge !== false && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                    selected ? "bg-white text-[rgb(34_34_204)]" : "bg-slate-100 text-slate-600"
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
