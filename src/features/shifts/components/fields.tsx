"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { errorText, inputBase, inputInvalid } from "@/components/ui/classes";
import { normalizeTime12 } from "@/features/shifts/lib/time";
import { formatTime12 } from "@/lib/time/format";

/**
 * A time box that reads and writes 12-hour time (SPEC 2.10): it shows "9:30 AM",
 * and typing is forgiving ("930a", "9:30 pm", "6 PM", or 24-hour "21:30"). The
 * value passed up stays the wire "HH:MM", as soon as what was typed reads as a
 * time, so the live check can run without waiting for blur. A problem is only
 * shown once the field is left, not mid-typing.
 */
export function TimeField({
  id,
  value,
  onChange,
  error,
  disabled,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  /** Accessible name when the visible label is elsewhere. */
  label?: string;
}) {
  const shown = (hm: string) => formatTime12(hm) || hm;
  const [text, setText] = useState(shown(value));
  const [focused, setFocused] = useState(false);

  // Follow outside changes (loading a shift, a reset) unless the person is typing.
  useEffect(() => {
    if (!focused) setText(formatTime12(value) || value);
  }, [value, focused]);

  const showError = Boolean(error) && !focused;
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="relative mt-1.5">
        <Clock
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="9:30 AM"
          maxLength={9}
          aria-label={label}
          aria-invalid={showError || undefined}
          aria-describedby={showError ? errorId : undefined}
          disabled={disabled}
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            onChange(normalizeTime12(raw) ?? raw);
          }}
          onBlur={() => {
            setFocused(false);
            const tidy = normalizeTime12(text);
            if (tidy) {
              setText(shown(tidy));
              onChange(tidy);
            }
          }}
          className={`${inputBase} pl-9 font-semibold tabular-nums ${showError ? inputInvalid : ""}`}
        />
      </div>
      {showError && (
        <p id={errorId} className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

/** A whole-minutes box with a "min" suffix. */
export function MinutesField({
  id,
  value,
  onChange,
  min,
  max,
  error,
  disabled,
  label,
  suffix = "min",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  error?: string;
  disabled?: boolean;
  label?: string;
  suffix?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          aria-label={label}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} pr-12 tabular-nums ${error ? inputInvalid : ""}`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400"
        >
          {suffix}
        </span>
      </div>
      {error && (
        <p id={errorId} className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}
