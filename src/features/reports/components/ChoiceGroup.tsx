"use client";

import { useId } from "react";

/**
 * A set of mutually exclusive choices drawn as the agent's tabs (Border.tabs, Button.tab.on: the
 * chosen one is the neutral fill with full text, never a teal block, D-88), built on native radio
 * buttons so arrow keys, Tab and screen readers work as expected.
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
      className="flex w-full flex-wrap gap-1 rounded-[10px] border border-card bg-field p-1 sm:inline-flex sm:w-auto"
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
          <span className="flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-center text-sm font-semibold text-quiet transition-colors hover:text-primary peer-checked:bg-fill peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-brand/35">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
