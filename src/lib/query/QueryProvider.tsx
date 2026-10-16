"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { errorStatus } from "@/lib/api";

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

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
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
