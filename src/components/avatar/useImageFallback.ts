"use client";

import { useEffect, useRef, useState } from "react";

import { onAccessTokenRefreshed } from "@/lib/api";

const RETRY_AFTER_MS = 2_000;

/**
 * A file that fails to load falls back to the initials. The usual cause is a request caught
 * between an expired access token and its refresh, and an image cannot renew a sign-in by
 * itself. So one more try a moment later, and another whenever a refresh has worked.
 */
export function useImageFallback(url: string | null): { broken: boolean; onError: () => void } {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const retried = useRef<string | null>(null);

  useEffect(() => {
    if (failedUrl === null) return;
    return onAccessTokenRefreshed(() => {
      retried.current = null;
      setFailedUrl(null);
    });
  }, [failedUrl]);

  function onError() {
    if (!url) return;
    setFailedUrl(url);
    if (retried.current === url) return;
    retried.current = url;
    setTimeout(() => setFailedUrl(null), RETRY_AFTER_MS);
  }

  return { broken: url !== null && url === failedUrl, onError };
}
