"use client";

import { forwardRef, useMemo, useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";

import type { SelectProps } from "./types";

const triggerBase =
  "group mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-slate-300 hover:shadow focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:font-normal data-[placeholder]:text-slate-400";

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    value,
    onValueChange,
    options,
    placeholder = "Select…",
    id,
    name,
    disabled,
    invalid,
    className,
    searchable,
    searchPlaceholder = "Search…",
    leadingIcon: LeadingIcon,
    "aria-label": ariaLabel,
  },
  ref,
) {
  const [query, setQuery] = useState("");

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, query]);

  const TriggerIcon = selected?.icon ?? LeadingIcon;
  const triggerIconClass = selected?.iconClassName ?? "text-[rgb(34_34_204)]";

  return (
    <RadixSelect.Root
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
      onOpenChange={(open) => {
        if (!open) setQuery("");
      }}
    >
      <RadixSelect.Trigger
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        className={`${triggerBase} ${
          invalid
            ? "border-red-400 data-[state=open]:border-red-500"
            : "border-slate-200 data-[state=open]:border-[rgb(34_34_204)] data-[state=open]:ring-2 data-[state=open]:ring-[rgba(34,34,204,0.14)]"
        } ${className ?? ""}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {TriggerIcon && (
            <TriggerIcon className={`h-[18px] w-[18px] shrink-0 ${triggerIconClass}`} />
          )}
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon className="shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180">
          <ChevronDown className="h-[18px] w-[18px]" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={8}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/[0.02]"
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") e.stopPropagation();
                  }}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[rgb(34_34_204)] focus:bg-white"
                />
              </div>
            </div>
          )}

          <RadixSelect.Viewport className="space-y-0.5 p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">No results found</p>
            ) : (
              filtered.map((option) => {
                const Icon = option.icon;
                return (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg py-2.5 pl-3 pr-2.5 text-sm font-semibold text-slate-600 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-slate-50 data-[state=checked]:bg-[rgba(34,34,204,0.1)] data-[state=checked]:text-slate-900 data-[disabled]:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {Icon && (
                        <Icon
                          className={`shrink-0 ${
                            option.description ? "h-5 w-5" : "h-[18px] w-[18px]"
                          } ${option.iconClassName ?? "text-[rgb(34_34_204)]"}`}
                        />
                      )}
                      <span className="flex min-w-0 flex-col">
                        <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                        {option.description && (
                          <span className="truncate text-xs font-normal text-slate-400">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </span>
                    <RadixSelect.ItemIndicator className="inline-flex">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(30_27_75)]">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                );
              })
            )}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
});
