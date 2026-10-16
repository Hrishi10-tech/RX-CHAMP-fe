"use client";

import { useId } from "react";

/**
 * A set of mutually exclusive choices drawn as a segmented control, built on
 * native radio buttons so arrow keys, Tab and screen readers work as expected.
 */
export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto"
    >
      {options.map((o) => (
        <label key={o.value} className="relative min-w-0 flex-1 cursor-pointer sm:flex-none">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 peer-checked:bg-[rgb(34_34_204)] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(34,34,204,0.35)]">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
