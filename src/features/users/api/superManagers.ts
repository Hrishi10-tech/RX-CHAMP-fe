import { apiClient, type ApiResponse } from "@/lib/api";
import { readItems, unwrap } from "@/lib/api/list";
import type { User } from "@/features/users/types";

/**
 * 3.3 Super Manager accounts (Super Admin only; no organisation needed):
 *   GET  /super-managers
 *   POST /super-managers {firstName, lastName, email, password, designation?}  409 EMAIL_IN_USE
 * Edit (names, email, designation), password, block and delete use /users/:id.
 */
const BASE = "/api/v1/super-managers";

export interface CreateSuperManagerInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  designation?: string;
}

export async function getSuperManagers(): Promise<User[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(BASE);
  if (!data?.success) throw new Error(data?.message ?? "Couldn't load Super Managers");
  return readItems<User>(data.data);
}

export async function createSuperManager(input: CreateSuperManagerInput): Promise<User> {
  const { data } = await apiClient.post<ApiResponse<User>>(BASE, input);
  return unwrap(data, "Couldn't add the Super Manager");
}
