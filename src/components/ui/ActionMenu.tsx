"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import type { ActionMenuProps } from "./types";

const DEFAULT_TRIGGER =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-quiet max-sm:h-11 max-sm:w-11 outline-none hover:bg-panel hover:text-soft focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-panel data-[state=open]:text-soft";

export function ActionMenu({ items, label = "Row actions", triggerClassName }: ActionMenuProps) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={triggerClassName ?? DEFAULT_TRIGGER}
        >
          <MoreHorizontal className={triggerClassName ? "h-4 w-4" : "h-5 w-5"} />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[9rem] rounded-xl border border-card bg-card p-1.5 shadow-xl ring-1 ring-scrim/[0.02]"
        >
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Dropdown.Item
                key={`${item.label}-${i}`}
                disabled={item.disabled}
                onSelect={() => item.onSelect()}
                className={`flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${
                  item.destructive
                    ? "text-attention data-[highlighted]:bg-attention-wash"
                    : "text-soft data-[highlighted]:bg-fill data-[highlighted]:text-primary"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
