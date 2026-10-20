import { apiClient, type ApiResponse } from "@/lib/api";
import { readItems, unwrap } from "@/lib/api/list";

/**
 * SPEC 2.8 / 5.5 (Admin, Super Admin):
 *   GET  /signout-keys
 *   POST /signout-keys {scope, userIds?, departmentIds?}  -> {id, phrase, expiresAt} (the phrase only here)
 *   POST /signout-keys/:id/revoke
 */
export type SignOutScope = "USERS" | "DEPARTMENTS" | "ORG";

export interface SignOutKeyView {
  id: string;
  scope: SignOutScope;
  users: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  createdBy: string;
  createdAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  uses: number;
  active: boolean;
}

export interface CreatedSignOutKey {
  id: string;
  phrase: string;
  expiresAt: string | null;
}

export interface CreateSignOutKeyInput {
  scope: SignOutScope;
  userIds?: string[];
  departmentIds?: string[];
}

const BASE = "/api/v1/signout-keys";

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function refs(value: unknown): { id: string; name: string }[] {
  return (Array.isArray(value) ? value : [])
    .map(rec)
    .filter((x) => typeof x.id === "string")
    .map((x) => ({ id: x.id as string, name: typeof x.name === "string" ? x.name : "" }));
}

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function readSignOutKey(raw: unknown): SignOutKeyView | null {
  const r = rec(raw);
  if (typeof r.id !== "string") return null;
  const scope = String(r.scope ?? "").toUpperCase();
  const by = r.createdBy;
  const expiresAt = str(r.expiresAt);
  const revokedAt = str(r.revokedAt);
  return {
    id: r.id,
    scope: scope === "USERS" || scope === "DEPARTMENTS" ? scope : "ORG",
    users: refs(r.users),
    departments: refs(r.departments),
    createdBy: typeof by === "string" ? by : (str(rec(by).name) ?? ""),
    createdAt: str(r.createdAt),
    expiresAt,
    revokedAt,
    uses: typeof r.uses === "number" ? r.uses : 0,
    active:
      typeof r.active === "boolean"
        ? r.active
        : !revokedAt && Boolean(expiresAt && Date.parse(expiresAt) > Date.now()),
  };
}

export async function getSignOutKeys(): Promise<SignOutKeyView[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(BASE);
  if (!data?.success) throw new Error(data?.message ?? "Couldn't load sign-out keys");
  return readItems<unknown>(data.data)
    .map(readSignOutKey)
    .filter((k): k is SignOutKeyView => k !== null)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function createSignOutKey(input: CreateSignOutKeyInput): Promise<CreatedSignOutKey> {
  const body: CreateSignOutKeyInput = { scope: input.scope };
  if (input.scope === "USERS") body.userIds = input.userIds ?? [];
  if (input.scope === "DEPARTMENTS") body.departmentIds = input.departmentIds ?? [];
  const { data } = await apiClient.post<ApiResponse<unknown>>(BASE, body);
  const r = rec(unwrap(data, "Couldn't create the key"));
  if (typeof r.phrase !== "string" || typeof r.id !== "string") {
    throw new Error("The server did not send the key's phrase");
  }
  return { id: r.id, phrase: r.phrase, expiresAt: str(r.expiresAt) };
}

export async function revokeSignOutKey(id: string): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    `${BASE}/${encodeURIComponent(id)}/revoke`,
  );
  if (!data?.success) throw new Error(data?.message ?? "Couldn't revoke the key");
}
