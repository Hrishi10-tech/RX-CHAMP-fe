import { isAxiosError } from "axios";

/** Pulls the server's `message` out of a failed request, if it sent one. */
export function errorMessage(err: unknown): string | undefined {
  if (isAxiosError(err)) {
    return (err.response?.data as { message?: string } | undefined)?.message;
  }
  return err instanceof Error ? err.message : undefined;
}
