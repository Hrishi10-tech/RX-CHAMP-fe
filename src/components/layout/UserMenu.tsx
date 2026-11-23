"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  KeyRound,
  LogOut,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { PROFILE_ROUTE, ROLE_LABEL, canAccess } from "@/constants/roles";
import { useOwnAvatarId } from "@/features/avatars/hooks/useAvatars";
import { useSession } from "@/features/auth/hooks/useSession";
import { ChangePasswordModal } from "@/features/auth/components/ChangePasswordModal";

export function UserMenu() {
  const { user, role, logout } = useSession();
  const router = useRouter();
  const avatarId = useOwnAvatarId();
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
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

  const name = user.name ?? user.email;
  const roleLabel = role ? ROLE_LABEL[role] : undefined;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex min-h-11 items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        {/* W-13: green means working now everywhere else; the portal does not know that, so no dot. */}
        <span className="relative flex">
          <PersonAvatar name={name} avatarId={avatarId} userId={user.id} size={36} />
        </span>
        <ChevronDown className="h-4 w-4 text-quiet" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-card bg-card shadow-xl shadow-primary/10"
        >
          <div className="flex flex-col items-center px-5 pb-5 pt-6 text-center">
            <span className="relative flex">
              <PersonAvatar name={name} avatarId={avatarId} userId={user.id} size={64} />
            </span>
            <p className="mt-3 text-sm font-semibold text-primary">{name}</p>
            <p className="max-w-full truncate text-xs text-quiet">{user.email}</p>
            {roleLabel && (
              <span className="mt-2 inline-flex items-center rounded-full bg-brand/8 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-brand">
                {roleLabel}
              </span>
            )}
          </div>

          <div className="h-px bg-panel" />

          <div className="p-1.5">
            <MenuRow
              icon={UserRound}
              label="My Profile"
              onClick={() => {
                setOpen(false);
                // 3.6: Settings, Profile (every portal role).
                if (canAccess(role, PROFILE_ROUTE)) router.push(PROFILE_ROUTE);
              }}
            />
            <MenuRow icon={Settings} label="Settings" onClick={() => setOpen(false)} />
            <MenuRow
              icon={KeyRound}
              label="Change password"
              onClick={() => {
                setOpen(false);
                setChangingPassword(true);
              }}
            />
          </div>

          <div className="h-px bg-panel" />

          <div className="p-3">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-attention-wash px-3 py-2.5 text-sm font-semibold text-attention hover:bg-attention-wash-strong"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <ChangePasswordModal open={changingPassword} onClose={() => setChangingPassword(false)} />
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
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-fill"
    >
      <Icon className="h-[18px] w-[18px] text-quiet" />
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="h-4 w-4 text-faint" />
    </button>
  );
}
