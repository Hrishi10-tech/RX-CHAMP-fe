"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAppDispatch } from "@/store/hooks";
import { meLoaded } from "@/features/auth/store/authSlice";
import { getMe } from "@/features/auth/api/getMe";
import { saveSession } from "@/lib/auth/session";
import { setOrgSwitching } from "@/lib/org/selection";

export const meKeys = {
  all: ["me"] as const,
};

/**
 * Reads GET /me after sign-in and on every load, and makes it the session: the
 * store takes the role, organisation and grants from it, and the cookie (which
 * only the middleware reads) is refreshed so a role or grant change made by the
 * Admin reaches the route guard on the next navigation.
 */
export function useMeSync(enabled: boolean) {
  const dispatch = useAppDispatch();
  const query = useQuery({
    queryKey: meKeys.all,
    queryFn: getMe,
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const me = query.data;
  useEffect(() => {
    if (!me) return;
    setOrgSwitching(me.role === "SUPER_ADMIN");
    dispatch(meLoaded(me));
    if (me.role !== "USER") {
      saveSession({
        user: { id: me.id, email: me.email, name: me.name, role: me.role, grants: me.grants },
      });
    }
  }, [me, dispatch]);

  return query;
}
