"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Building2, Check, ChevronsUpDown, Globe2, Search } from "lucide-react";

import { useOrganisations } from "@/features/organisations/hooks/useOrganisations";
import { selectOrg, useSelectedOrg, type SelectedOrg } from "@/lib/org/selection";

/**
 * The Super Admin's organisation switcher (SPEC 7.1): search, "All
 * organisations" (the platform view) and every organisation. The choice is kept
 * per browser and sent as X-Org-Id on every request.
 */
export function OrgSwitcher({ onChange }: { onChange?: (org: SelectedOrg | null) => void }) {
  const selected = useSelectedOrg();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const orgs = useOrganisations(open || !selected);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = orgs.data ?? [];
    return q ? list.filter((o) => o.name.toLowerCase().includes(q)) : list;
  }, [orgs.data, query]);

  function choose(org: SelectedOrg | null) {
    setOpen(false);
    setQuery("");
    if ((org?.id ?? null) === (selected?.id ?? null)) return;
    selectOrg(org);
    onChange?.(org);
  }

  const label = selected?.name || (selected ? "Organisation" : "All organisations");

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`Organisation: ${label}. Change organisation`}
        className="flex h-10 max-w-[11rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] sm:max-w-[16rem] sm:px-3"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
          {selected ? (
            <Building2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Globe2 className="h-3.5 w-3.5" aria-hidden />
          )}
        </span>
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
        >
          <div className="relative px-1 pb-2 pt-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an organisation"
              aria-label="Find an organisation"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[rgb(34_34_204)]"
            />
          </div>
          <div role="listbox" aria-label="Organisations" className="max-h-72 overflow-y-auto">
            <OrgOption
              icon={<Globe2 className="h-4 w-4" aria-hidden />}
              name="All organisations"
              hint="Platform overview"
              selected={!selected}
              onSelect={() => choose(null)}
            />
            <div className="my-1 h-px bg-slate-100" />
            {orgs.isPending && <p className="px-3 py-3 text-sm text-slate-500">Loading…</p>}
            {orgs.isError && (
              <p className="px-3 py-3 text-sm text-rose-600">Couldn&apos;t load organisations.</p>
            )}
            {shown.map((o) => (
              <OrgOption
                key={o.id}
                icon={<Building2 className="h-4 w-4" aria-hidden />}
                name={o.name}
                hint={o.admin ? `Admin ${o.admin.name}` : "No admin yet"}
                selected={selected?.id === o.id}
                onSelect={() => choose({ id: o.id, name: o.name })}
              />
            ))}
            {orgs.isSuccess && shown.length === 0 && (
              <p className="px-3 py-3 text-sm text-slate-500">No organisation matches.</p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function OrgOption({
  icon,
  name,
  hint,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  name: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] ${
        selected ? "bg-[rgba(34,34,204,0.06)]" : "hover:bg-slate-50"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-800">{name}</span>
        <span className="block truncate text-xs text-slate-400">{hint}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-[rgb(34_34_204)]" aria-hidden />}
    </button>
  );
}
