"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowUpDown } from "lucide-react";

import { SORT_OPTIONS } from "@/features/users/lib/memberQuery";
import type { MemberSortKey, MemberSortPopoverProps } from "@/features/users/types";
import { Button } from "@/components/ui/Button";

export function MemberSortPopover({ value, onApply }: MemberSortPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MemberSortKey | null>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium outline-none transition-colors ${
          value || open
            ? "border-brand bg-brand/6 text-brand ring-1 ring-brand/25"
            : "border-card text-soft hover:bg-fill"
        }`}
      >
        <ArrowUpDown className="h-4 w-4" />
        Sort
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-card bg-card p-5 shadow-2xl ring-1 ring-scrim/[0.02]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <ArrowUpDown className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold tracking-tight text-primary">Sort members by</h3>
          </div>

          <div role="radiogroup" aria-label="Sort members by" className="mt-4 space-y-0.5">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = draft === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  // Re-picking the active row clears the sort, so there's a way
                  // back to the server's default order.
                  onClick={() => setDraft(selected ? null : option.key)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none transition-colors hover:bg-fill focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      selected ? "text-brand" : "text-quiet"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      selected ? "text-primary" : "text-soft"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selected ? "border-brand" : "border-edge-strong"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-brand" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button type="button" onClick={() => setDraft(null)} disabled={draft === null}>
              Reset
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5"
            >
              <ArrowUpDown className="h-4 w-4" />
              Apply sort
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
