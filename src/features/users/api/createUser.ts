import { apiClient, type ApiResponse } from "@/lib/api";
import type { CreateUserInput, User } from "@/features/users/types";

/**
 * POST /users is a bulk endpoint even for one person: it answers 201 with
 * `{ created, errors }`, and a refused row (email taken, password too short, a
 * role you can't give) lands in `errors`, not in an error status.
 */
interface CreateUsersResult {
  created?: User[];
  errors?: { email?: string; error?: string }[];
}

function sentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const capitalised = t[0].toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<CreateUsersResult | User>>(
    "/api/v1/users",
    input,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to create member");
  }

  const result = data.data;
  if ("created" in result || "errors" in result) {
    const bulk = result as CreateUsersResult;
    const created = bulk.created?.[0];
    if (created) return created;
    const reason = bulk.errors?.[0]?.error;
    throw new Error(reason ? sentence(reason) : "Failed to create member");
  }
  return result as User;
}
