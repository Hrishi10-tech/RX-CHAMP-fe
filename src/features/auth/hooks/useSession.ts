"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sessionCleared } from "@/features/auth/store/authSlice";
import { clearSession } from "@/lib/auth/session";
import { setApiAuthToken } from "@/lib/api";
import type { UseSessionResult } from "@/features/auth/types";

export function useSession(): UseSessionResult {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const role = useAppSelector((state) => state.auth.role);
  const ready = useAppSelector((state) => state.auth.ready);

  const logout = useCallback(() => {
    clearSession();
    setApiAuthToken(null);
    dispatch(sessionCleared());
    router.replace("/auth/login");
  }, [dispatch, router]);

  return { user, role, ready, logout };
}
