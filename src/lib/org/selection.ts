"use client";

import { useSyncExternalStore } from "react";

/**
 * The organisation a Super Admin is acting in (SPEC 1.4, 7.1). Kept per browser
 * (localStorage), read by the API client to send `X-Org-Id`, and by the query
 * client so every cached answer belongs to exactly one organisation.
 *
 * Only a Super Admin can select one: for every other role the selection is
 * ignored (the server ignores the header for them too), so a shared browser that
 * a Super Admin used never leaks its choice into an Admin's session.
 */

export interface SelectedOrg {
  id: string;
  name: string;
}

const STORAGE_KEY = "rxv.org";

let selected: SelectedOrg | null = null;
let loaded = false;
/** True while the signed-in person is a Super Admin. */
let switching = false;
const listeners = new Set<() => void>();
const goneListeners = new Set<(org: SelectedOrg) => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function read(): SelectedOrg | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SelectedOrg>;
    return typeof value?.id === "string" && value.id
      ? { id: value.id, name: typeof value.name === "string" ? value.name : "" }
      : null;
  } catch {
    return null;
  }
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  selected = read();
}

/** Turns the selection on for a Super Admin and off for everyone else. */
export function setOrgSwitching(enabled: boolean): void {
  ensureLoaded();
  if (switching === enabled) return;
  switching = enabled;
  emit();
}

/** The organisation in use, or null ("All organisations", or not a Super Admin). */
export function getSelectedOrg(): SelectedOrg | null {
  ensureLoaded();
  return switching ? selected : null;
}

/** The value for `X-Org-Id`, or null when none should be sent. */
export function orgHeaderValue(): string | null {
  return getSelectedOrg()?.id ?? null;
}

/** A short scope string for cache keys: the org id, or "" for none. */
export function orgScope(): string {
  return getSelectedOrg()?.id ?? "";
}

export function selectOrg(org: SelectedOrg | null): void {
  ensureLoaded();
  selected = org;
  if (typeof window !== "undefined") {
    try {
      if (org) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private mode or storage full: the choice lasts for this tab only.
    }
  }
  emit();
}

export function subscribeOrg(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The server answered 404 ORG_NOT_FOUND for the organisation sent as `X-Org-Id`
 * (deleted, or a stale choice kept in this browser): drop it, back to the
 * platform view, and tell whoever listens (the dashboard says so and leaves the
 * organisation's page). Only the selection itself is dropped: a request that
 * named another organisation on purpose changes nothing. True when dropped.
 */
export function dropMissingOrg(sentId: string | null | undefined): boolean {
  ensureLoaded();
  if (!switching || !sentId || selected?.id !== sentId) return false;
  const gone = selected;
  selectOrg(null);
  for (const listener of goneListeners) listener(gone);
  return true;
}

/** Called with the organisation `dropMissingOrg` dropped. Returns the unsubscribe. */
export function onOrgGone(listener: (org: SelectedOrg) => void): () => void {
  goneListeners.add(listener);
  return () => goneListeners.delete(listener);
}

/** Test helper: forget everything (module state survives between tests). */
export function resetOrgSelectionForTests(): void {
  selected = null;
  loaded = false;
  switching = false;
  goneListeners.clear();
  emit();
}

const serverSnapshot = () => null;

/** The selected organisation, re-rendering on change. */
export function useSelectedOrg(): SelectedOrg | null {
  return useSyncExternalStore(subscribeOrg, getSelectedOrg, serverSnapshot);
}

/** The organisation id for query keys ("" for none). */
export function useOrgScope(): string {
  return useSyncExternalStore(subscribeOrg, orgScope, () => "");
}
