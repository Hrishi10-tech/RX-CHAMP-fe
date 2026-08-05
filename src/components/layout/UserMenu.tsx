"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { useSession } from "@/features/auth/hooks/useSession";

export function UserMenu() {
  const { user, role, logout } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const initials =
    (user.name ?? user.email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";
  const roleLabel = role ? role.replace(/_/g, " ").toLowerCase() : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.3)]"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(34_34_204)] text-sm font-semibold text-white ring-2 ring-[rgba(34,34,204,0.15)]">
          {initials}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(34_34_204)] text-lg font-semibold text-white ring-4 ring-[rgba(34,34,204,0.1)]">
              {initials}
              <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">{user.name ?? user.email}</p>
            <p className="max-w-full truncate text-xs text-slate-500">{user.email}</p>
            {roleLabel && (
              <span className="mt-2 inline-flex items-center rounded-full bg-[rgba(34,34,204,0.08)] px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[rgb(34_34_204)]">
                {roleLabel}
              </span>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          <div className="p-1.5">
            <MenuRow icon={UserRound} label="My Profile" onClick={() => setOpen(false)} />
            <MenuRow icon={Settings} label="Settings" onClick={() => setOpen(false)} />
          </div>

          <div className="h-px bg-slate-100" />

          <div className="p-3">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-[18px] w-[18px] text-slate-400" />
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}
