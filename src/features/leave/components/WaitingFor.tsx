"use client";

import { useSession } from "@/features/auth/hooks/useSession";

/**
 * 3.6 (W-36): "Waiting for you" on your own queue, not your own name. `lead` comes first
 * ("Claimed 3 Oct, waiting for you").
 */
export function WaitingFor({ name, lead }: { name: string; lead?: string }) {
  const user = useSession()?.user;
  const you = Boolean(user?.name) && name.trim() === user?.name?.trim();
  const who = you ? "you" : name;
  return (
    <p className="mt-1 text-xs text-attention">
      {lead ? `${lead}, waiting for ${who}` : `Waiting for ${who}`}
    </p>
  );
}
