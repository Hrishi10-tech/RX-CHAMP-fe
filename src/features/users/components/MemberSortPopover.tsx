"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowUpDown } from "lucide-react";

import { SORT_OPTIONS } from "@/features/users/lib/memberQuery";
import type { MemberSortKey, MemberSortPopoverProps } from "@/features/users/types";

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
            ? "border-[rgb(34_34_204)] bg-[rgba(34,34,204,0.06)] text-[rgb(34_34_204)] ring-1 ring-[rgba(34,34,204,0.25)]"
            : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
          className="z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ring-1 ring-black/[0.02]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
              <ArrowUpDown className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold tracking-tight text-slate-900">Sort members by</h3>
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
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.3)]"
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      selected ? "text-[rgb(34_34_204)]" : "text-slate-400"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      selected ? "text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selected ? "border-[rgb(34_34_204)]" : "border-slate-300"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-[rgb(34_34_204)]" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={draft === null}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 rounded-lg bg-[rgb(34_34_204)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgb(28_28_180)]"
            >
              <ArrowUpDown className="h-4 w-4" />
              Apply sort
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
