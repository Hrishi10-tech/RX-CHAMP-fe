"use client";

import { useEffect, useState } from "react";

/**
 * The current time, re-read every `intervalMs` while `enabled`. Keep it in the
 * smallest component that needs it (a timer, a due chip) so a once-a-second
 * tick re-renders a chip, not a page.
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
