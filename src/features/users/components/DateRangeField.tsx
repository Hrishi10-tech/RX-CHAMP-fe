"use client";

import * as Popover from "@radix-ui/react-popover";
import { format, isValid, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";

const triggerClass =
  "mt-1.5 flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-colors hover:border-slate-300 data-[state=open]:border-[rgb(34_34_204)] data-[state=open]:ring-2 data-[state=open]:ring-[rgba(34,34,204,0.14)]";

const dateInputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-[rgb(34_34_204)] focus:ring-2 focus:ring-[rgba(34,34,204,0.14)]";

function label(iso: string): string {
  if (!iso) return "";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMM d, yyyy") : iso;
}

export function DateRangeField({
  from,
  to,
  onChange,
  id,
  placeholder = "Select date range",
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  id?: string;
  placeholder?: string;
}) {
  const summary =
    from && to
      ? `${label(from)} – ${label(to)}`
      : from
        ? `From ${label(from)}`
        : to
          ? `Until ${label(to)}`
          : "";

  return (
    <Popover.Root>
      <Popover.Trigger id={id} className={triggerClass} aria-label="Joined date range">
        <span className={`truncate ${summary ? "text-slate-900" : "font-normal text-slate-400"}`}>
          {summary || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {summary && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date range"
              onPointerDown={(e) => {
                // Stop the popover from opening when clearing.
                e.preventDefault();
                e.stopPropagation();
                onChange({ from: "", to: "" });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({ from: "", to: "" });
                }
              }}
              className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <CalendarDays className="h-[18px] w-[18px] text-slate-400" />
        </span>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-[60] w-[17rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ring-1 ring-black/[0.02]"
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                From
              </label>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => onChange({ from: e.target.value, to })}
                className={`mt-1 ${dateInputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                To
              </label>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => onChange({ from, to: e.target.value })}
                className={`mt-1 ${dateInputClass}`}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ from: "", to: "" })}
              className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear dates
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
