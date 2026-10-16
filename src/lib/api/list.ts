import type { ApiResponse, PaginationMeta } from "./types";

/**
 * Reads the payload of a successful call, or throws the server's message.
 * Every 3.1 endpoint answers `{ success: true, data }`; a body without `data`
 * is a broken answer, not an empty one.
 */
export function unwrap<T>(body: ApiResponse<T> | undefined, fallback: string): T {
  if (!body || !body.success || body.data === undefined || body.data === null) {
    throw new Error(body?.message ?? fallback);
  }
  return body.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The items of a list answer. The 3.1 contract puts lists in `data.items`; the
 * 3.0 list endpoints put the array straight in `data` with `meta` beside it.
 * Both shapes are accepted, so a list keeps working whichever way the server
 * ends up wrapping it, and anything else reads as an empty list.
 */
export function readItems<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray(data.items)) return data.items as T[];
  return [];
}

function readMeta(value: unknown): PaginationMeta | undefined {
  if (!isRecord(value)) return undefined;
  const { total, page, limit, totalPages } = value;
  if (typeof total !== "number") return undefined;
  return {
    total,
    page: typeof page === "number" ? page : 1,
    limit: typeof limit === "number" ? limit : 0,
    totalPages: typeof totalPages === "number" ? totalPages : 1,
  };
}

/** A paginated list answer: `data: { items, meta }` or `data: [...], meta`. */
export function readPage<T>(
  body: ApiResponse<unknown> | undefined,
  fallback: string,
): { items: T[]; meta?: PaginationMeta } {
  if (!body || !body.success) throw new Error(body?.message ?? fallback);
  const data = body.data;
  const meta = (isRecord(data) ? readMeta(data.meta) : undefined) ?? readMeta(body.meta);
  return { items: readItems<T>(data), meta };
}

/**
 * Query parameters without the empty ones: undefined, null, "" and false are
 * dropped, arrays become comma lists ("a,b"), an empty array is dropped.
 */
export function cleanParams(
  params: Record<string, string | number | boolean | string[] | null | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      const list = value.filter((v) => typeof v === "string" && v.trim() !== "");
      if (list.length) out[key] = list.join(",");
      continue;
    }
    out[key] = value;
  }
  return out;
}
