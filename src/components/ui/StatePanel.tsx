"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { hmOf } from "@/lib/time/businessTime";

import { Loader } from "./Loader";
import { btnSecondary } from "./classes";

/** Inline loading state for a card or section (the full-screen overlay is for whole pages). */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <Loader label={label} className="px-6 py-14" />
    </div>
  );
}

/** A failed query, with the server's reason when it gave one, and a way to try again. */
export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
  retrying = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-slate-600"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-slate-500">{message ?? "Check your connection and try again."}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className={btnSecondary}>
          <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * A background refresh that failed while the last good data is still on screen:
 * the data stays (so nothing being typed is lost), this says how old it is, and
 * offers another try.
 */
export function RefreshFailedNotice({
  what,
  updatedAt,
  onRetry,
  retrying = false,
}: {
  /** "approvals", "Team today", "this report". */
  what: string;
  /** When the data on screen was read (ms). */
  updatedAt: number;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const at = updatedAt ? hmOf(new Date(updatedAt).toISOString()) : null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900"
    >
      <p className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span>
          Couldn&apos;t refresh {what}.{at ? ` Showing it as of ${at}.` : ""}
        </span>
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-semibold text-amber-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60"
      >
        <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
        Try again
      </button>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-sm">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        {message && <p className="mt-1 text-slate-500">{message}</p>}
      </div>
      {action}
    </div>
  );
}
