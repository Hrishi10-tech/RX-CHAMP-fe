"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sessionCleared } from "@/features/auth/store/authSlice";
import { logout as logoutRequest } from "@/features/auth/api/logout";
import { clearSession } from "@/lib/auth/session";
import { setOrgSwitching } from "@/lib/org/selection";
import { viewerGrants } from "@/constants/roles";
import type { UseSessionResult } from "@/features/auth/types";

export function useSession(): UseSessionResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const role = useAppSelector((state) => state.auth.role);
  const ready = useAppSelector((state) => state.auth.ready);
  const me = useAppSelector((state) => state.auth.me);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    // Fired, not awaited: the server clears the auth cookies while the UI moves
    // on. Local state goes first so the menu can't act on a dead session.
    void logoutRequest();
    clearSession();
    setOrgSwitching(false);
    dispatch(sessionCleared());
    // Cached server data belongs to this person; the next one to sign in on this
    // tab must not see it, even for a moment.
    queryClient.clear();
    router.replace("/auth/login");
  }, [dispatch, router, queryClient]);

  // A Manager: the sections GET /me's permissions name (the server's own rule).
  const grants = useMemo(() => viewerGrants(role, me), [role, me]);

  return { user, role, ready, me, grants, logout };
}
