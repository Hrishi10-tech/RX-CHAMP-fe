"use client";

import { Activity, Camera, ChartGantt, type LucideIcon } from "lucide-react";

import type { Grants } from "@/constants/roles";

const GRANT_ROWS: { key: keyof Grants; label: string; detail: string; icon: LucideIcon }[] = [
  {
    key: "screenshots",
    label: "Screenshots",
    detail: "The screenshots their staff's computers take.",
    icon: Camera,
  },
  {
    key: "timeline",
    label: "Timeline",
    detail: "Apps, sites and the day's timeline of work, breaks and meetings.",
    icon: ChartGantt,
  },
  {
    key: "activity",
    label: "Activity",
    detail: "Keyboard and mouse active and idle time, hourly activity, quiet hours.",
    icon: Activity,
  },
];

/**
 * The three view grants a manager can have (SPEC 2.2). With at least one, the
 * manager gets the Team page for staff in their departments, showing only the
 * granted sections. Grants never let a manager edit people.
 */
export function GrantsEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: Grants;
  onChange: (next: Grants) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2" role="group" aria-label="What this manager may see">
      {GRANT_ROWS.map(({ key, label, detail, icon: Icon }) => {
        const on = value[key];
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange({ ...value, [key]: !on })}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:opacity-60 ${
              on
                ? "border-[rgba(34,34,204,0.35)] bg-[rgba(34,34,204,0.05)]"
                : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                on ? "bg-[rgb(34_34_204)] text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">{label}</span>
              <span className="block text-xs text-slate-500">{detail}</span>
            </span>
            <span
              aria-hidden
              className={`relative h-6 w-10 shrink-0 rounded-full transition ${
                on ? "bg-[rgb(34_34_204)]" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  on ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
