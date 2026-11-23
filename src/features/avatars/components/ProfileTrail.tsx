"use client";

import Link from "next/link";

import { PROFILE_ROUTE, canAccess } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";

const SETTINGS_ROUTE = "/dashboard/settings";
const LINK = "font-medium transition-colors hover:text-body";

/**
 * "Settings / Profile" above the page title. Only a Super Admin has a Settings page to
 * go back to; for everyone else the first step is plain text.
 */
export function ProfileTrail({ title, parent }: { title: string; parent?: string }) {
  const { role } = useSession();
  return (
    <div>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-quiet">
        {canAccess(role, SETTINGS_ROUTE) ? (
          <Link href={SETTINGS_ROUTE} className={LINK}>
            Settings
          </Link>
        ) : (
          <span>Settings</span>
        )}
        {parent && (
          <>
            <span aria-hidden>/</span>
            <Link href={PROFILE_ROUTE} className={LINK}>
              {parent}
            </Link>
          </>
        )}
      </nav>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">{title}</h1>
    </div>
  );
}
