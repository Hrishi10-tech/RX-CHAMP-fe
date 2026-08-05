"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import type { ActionMenuProps } from "./types";

export function ActionMenu({ items, label = "Row actions" }: ActionMenuProps) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.3)] data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </Dropdown.Trigger>

      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="z-50 min-w-[9rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/[0.02]"
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
                    ? "text-red-600 data-[highlighted]:bg-red-50"
                    : "text-slate-600 data-[highlighted]:bg-slate-50 data-[highlighted]:text-slate-900"
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
