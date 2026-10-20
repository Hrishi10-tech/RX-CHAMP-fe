"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";

import { DepartmentIcon } from "@/features/departments/components/DepartmentIcon";
import type { DepartmentView } from "@/features/departments/types";

/**
 * Departments with their icons: one for Staff (radio), one or more for a
 * Manager (checkboxes), as SPEC 2.1 requires.
 */
export function DepartmentPicker({
  departments,
  value,
  onChange,
  multiple,
  label,
  invalid = false,
}: {
  departments: Pick<DepartmentView, "id" | "name" | "icon" | "staffCount">[];
  value: string[];
  onChange: (ids: string[]) => void;
  multiple: boolean;
  label: string;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? departments.filter((d) => d.name.toLowerCase().includes(q)) : departments;
  }, [departments, query]);

  function toggle(id: string) {
    if (!multiple) {
      onChange([id]);
      return;
    }
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  if (departments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
        No departments yet. Add one under Departments first.
      </p>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white ${
        invalid ? "border-red-400" : "border-slate-200"
      }`}
    >
      {departments.length > 6 && (
        <div className="relative border-b border-slate-100">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a department"
            aria-label="Find a department"
            className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      )}
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-label={label}
        className="max-h-56 overflow-y-auto p-1.5"
      >
        {shown.map((d) => {
          const checked = value.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={checked}
              onClick={() => toggle(d.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
                checked ? "bg-[rgba(34,34,204,0.06)]" : "hover:bg-slate-50"
              }`}
            >
              <DepartmentIcon icon={d.icon} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-800">{d.name}</span>
                <span className="block text-xs text-slate-400">
                  {d.staffCount} {d.staffCount === 1 ? "staff member" : "staff"}
                </span>
              </span>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                  multiple ? "rounded-md" : "rounded-full"
                } ${
                  checked
                    ? "border-[rgb(34_34_204)] bg-[rgb(34_34_204)] text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {checked && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-slate-500">No department matches.</p>
        )}
      </div>
    </div>
  );
}
