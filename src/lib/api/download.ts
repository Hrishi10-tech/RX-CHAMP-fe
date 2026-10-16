import { isAxiosError } from "axios";

import { apiClient } from "./client";

/**
 * The file name a download should be saved under, from the server's
 * `Content-Disposition` header (`filename*=UTF-8''…` wins over `filename="…"`).
 * Path parts are stripped, so a header can never point the save outside the
 * downloads folder; anything unusable falls back to `fallback`.
 */
export function filenameFromDisposition(
  header: string | null | undefined,
  fallback: string,
): string {
  if (!header) return fallback;

  let name: string | null = null;
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (star) {
    try {
      name = decodeURIComponent(star[2].trim().replace(/^"|"$/g, ""));
    } catch {
      name = null;
    }
  }
  if (!name) {
    const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
    if (plain) name = (plain[2] ?? plain[1]).trim();
  }
  if (!name) return fallback;

  const base = name.split(/[\\/]/).pop()?.trim() ?? "";
  // A name made only of dots or control characters is no name at all.
  const safe = Array.from(base)
    .filter((ch) => ch.charCodeAt(0) >= 32)
    .join("");
  return safe && !/^\.+$/.test(safe) ? safe : fallback;
}

/**
 * How long a download's blob URL stays alive. Browsers read it after `click()`
 * returns, some of them (iOS Safari, which opens the file in a preview first)
 * many seconds later, so it is only freed after a minute.
 */
export const BLOB_URL_LIFETIME_MS = 60_000;

/** Hands a blob to the browser as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
}

/**
 * A failed blob request carries its JSON error body as a Blob, which the error
 * helpers cannot read. Parse it back into an object so `errorMessage` and
 * `errorCode` work the same as for any other call.
 */
async function readBlobError(err: unknown): Promise<void> {
  if (!isAxiosError(err) || !err.response) return;
  const data: unknown = err.response.data;
  if (!(data instanceof Blob)) return;
  try {
    const text = await data.text();
    err.response.data = JSON.parse(text) as unknown;
  } catch {
    err.response.data = undefined;
  }
}

/**
 * GETs a file and saves it under the server's file name. Resolves with the name
 * used; rejects with the server's error (readable by `errorMessage`).
 */
export async function downloadFile(
  url: string,
  params: Record<string, string | number | boolean>,
  fallbackName: string,
): Promise<string> {
  try {
    const response = await apiClient.get<Blob>(url, { params, responseType: "blob" });
    const header = response.headers?.["content-disposition"] as string | undefined;
    const filename = filenameFromDisposition(header, fallbackName);
    saveBlob(response.data, filename);
    return filename;
  } catch (err) {
    await readBlobError(err);
    throw err;
  }
}
