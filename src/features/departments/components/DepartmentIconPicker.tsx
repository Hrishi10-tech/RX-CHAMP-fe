"use client";

import { useRef, type KeyboardEvent } from "react";

import {
  DEPARTMENT_ICONS,
  ICON_THEMES,
  type DepartmentIconKey,
} from "@/features/departments/lib/icons";

const ORDER: DepartmentIconKey[] = ICON_THEMES.flatMap((t) => t.keys);

/**
 * The themed icon grid (SPEC 7.6). One radio group: Tab reaches the chosen
 * icon, the arrow keys move between icons, Space or Enter picks one.
 */
export function DepartmentIconPicker({
  value,
  onChange,
  label = "Icon",
}: {
  value: string;
  onChange: (key: DepartmentIconKey) => void;
  label?: string;
}) {
  const refs = useRef<Partial<Record<DepartmentIconKey, HTMLButtonElement | null>>>({});
  const current = (ORDER as string[]).includes(value) ? (value as DepartmentIconKey) : ORDER[0];

  function move(e: KeyboardEvent<HTMLButtonElement>, key: DepartmentIconKey) {
    const i = ORDER.indexOf(key);
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % ORDER.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + ORDER.length) % ORDER.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ORDER.length - 1;
    else return;
    e.preventDefault();
    const target = ORDER[next];
    refs.current[target]?.focus();
    onChange(target);
  }

  return (
    <div role="radiogroup" aria-label={label} className="space-y-3">
      {ICON_THEMES.map((theme) => (
        <div key={theme.title}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {theme.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {theme.keys.map((key) => {
              const { icon: Icon, label: name } = DEPARTMENT_ICONS[key];
              const selected = key === value;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    refs.current[key] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={name}
                  title={name}
                  tabIndex={key === current ? 0 : -1}
                  onClick={() => onChange(key)}
                  onKeyDown={(e) => move(e, key)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
                    selected
                      ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.3)]"
                      : "border-slate-200 bg-white text-[rgb(34_34_204)] hover:border-[rgba(34,34,204,0.4)] hover:bg-[rgba(34,34,204,0.06)]"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
