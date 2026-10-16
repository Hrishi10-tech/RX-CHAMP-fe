import { isAxiosError } from "axios";

/**
 * The backend's error body: `{ success: false, message, error: { code, message,
 * details? } }`. `message` is repeated at the top level for toasts; `code` is the
 * machine-readable part (SHIFT_IN_USE, ALREADY_DECIDED, WRONG_PASSWORD, ...).
 */
interface ErrorBody {
  message?: unknown;
  error?: { code?: unknown; message?: unknown; details?: unknown };
}

function bodyOf(err: unknown): ErrorBody | undefined {
  if (!isAxiosError(err)) return undefined;
  const data = err.response?.data;
  return data && typeof data === "object" ? (data as ErrorBody) : undefined;
}

/** Pulls the server's `message` out of a failed request, if it sent one. */
export function errorMessage(err: unknown): string | undefined {
  if (isAxiosError(err)) {
    const message = bodyOf(err)?.message;
    return typeof message === "string" && message.trim() ? message : undefined;
  }
  return err instanceof Error ? err.message : undefined;
}

/** The server's error code (e.g. "SHIFT_IN_USE"), if the request failed with one. */
export function errorCode(err: unknown): string | undefined {
  const code = bodyOf(err)?.error?.code;
  return typeof code === "string" ? code : undefined;
}

/** The server's `error.details` object, if any. */
export function errorDetails(err: unknown): Record<string, unknown> | undefined {
  const details = bodyOf(err)?.error?.details;
  return details && typeof details === "object" ? (details as Record<string, unknown>) : undefined;
}

/** HTTP status of a failed request; undefined for network errors and non-axios errors. */
export function errorStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}
