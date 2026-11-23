"use client";

import { forwardRef, useMemo, useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";

import type { SelectProps } from "./types";

const triggerBase =
  "group mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border bg-field px-3.5 py-3 text-left text-sm font-semibold text-primary shadow-sm transition-colors hover:border-edge-strong hover:shadow focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:font-normal data-[placeholder]:text-neutral";

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
  const triggerIconClass = selected?.iconClassName ?? "text-brand";

  return (
    <RadixSelect.Root
      // Always controlled ("" shows the placeholder): flipping between controlled
      // and uncontrolled as a value arrives makes React warn and Radix re-sync.
      value={value ?? ""}
      onValueChange={(next) => {
        // Inside a <form> Radix mirrors the value into a hidden native <select> and
        // reports "" back when that value has no option yet, e.g. while the options
        // are still loading. No item may have the value "", so it is never a real
        // choice; passing it on would wipe the field (and, with a default that
        // re-applies itself, loop forever).
        if (next === "") return;
        onValueChange?.(next);
      }}
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
            ? "border-attention data-[state=open]:border-attention"
            : "border-card data-[state=open]:border-brand data-[state=open]:ring-2 data-[state=open]:ring-brand/14"
        } ${className ?? ""}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {TriggerIcon && (
            <TriggerIcon className={`h-[18px] w-[18px] shrink-0 ${triggerIconClass}`} />
          )}
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon className="shrink-0 text-quiet transition-transform duration-200 group-data-[state=open]:rotate-180">
          <ChevronDown className="h-[18px] w-[18px]" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={8}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-card bg-card shadow-xl ring-1 ring-scrim/[0.02]"
        >
          {searchable && (
            <div className="border-b border-divider p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") e.stopPropagation();
                  }}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-card bg-fill pl-9 pr-3 text-sm text-primary outline-none transition placeholder:text-neutral focus:border-brand focus:bg-field"
                />
              </div>
            </div>
          )}

          <RadixSelect.Viewport className="space-y-0.5 p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-quiet">No results found</p>
            ) : (
              filtered.map((option) => {
                const Icon = option.icon;
                return (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="relative flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg py-2.5 pl-3 pr-2.5 text-sm font-semibold text-soft outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-fill data-[state=checked]:bg-brand/10 data-[state=checked]:text-primary data-[disabled]:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {Icon && (
                        <Icon
                          className={`shrink-0 ${
                            option.description ? "h-5 w-5" : "h-[18px] w-[18px]"
                          } ${option.iconClassName ?? "text-brand"}`}
                        />
                      )}
                      <span className="flex min-w-0 flex-col">
                        <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                        {option.description && (
                          <span className="truncate text-xs font-normal text-quiet">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </span>
                    <RadixSelect.ItemIndicator className="inline-flex">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                        <Check className="h-3 w-3 text-on-brand" strokeWidth={3} />
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
