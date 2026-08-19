"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store";
import { sessionLoaded } from "@/features/auth/store/authSlice";
import { getSession } from "@/lib/auth/session";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();

  // The cookie is only readable on the client, so hydrate after mount to keep
  // the server and first client render identical. Runs once for the whole app.
  useEffect(() => {
    const session = getSession();
    storeRef.current?.dispatch(sessionLoaded(session));
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
