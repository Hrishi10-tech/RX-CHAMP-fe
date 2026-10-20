"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, hashKey, type QueryKey } from "@tanstack/react-query";

import { errorStatus } from "@/lib/api";
import { orgScope } from "@/lib/org/selection";

/**
 * Retries only what a retry can fix: the network dropping or the server
 * stumbling. A 4xx means the request itself is wrong (or forbidden), and asking
 * again just delays the error the person needs to see. 401s are already handled
 * once, centrally, by the API client's refresh.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const status = errorStatus(error);
  return status === undefined || status >= 500;
}

/** Keys that are about the person or the platform, never one organisation. */
const UNSCOPED = new Set(["me", "organisations", "platform-overview"]);

/**
 * Every cached answer belongs to one organisation (SPEC 7.5): the selected
 * organisation's id is part of every query's key hash, so switching organisation
 * can never show the previous one's data, even for a moment, and switching back
 * finds its cache intact.
 */
export function orgScopedHash(queryKey: QueryKey, scope: string = orgScope()): string {
  const head = queryKey[0];
  if (typeof head === "string" && UNSCOPED.has(head)) return hashKey(queryKey);
  return hashKey([{ org: scope }, ...queryKey]);
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
        queryKeyHashFn: (key) => orgScopedHash(key),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** One client per browser tab, created on first render (never shared across requests). */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
