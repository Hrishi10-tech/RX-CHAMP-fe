import { apiClient, type ApiResponse } from "@/lib/api";

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  /** Also sign out every other device, the desktop app included. */
  signOutOtherDevices?: boolean;
}

export interface ChangePasswordResult {
  changed: true;
  signedOutOtherDevices: boolean;
}

/**
 * Changes the signed-in person's own password. This device stays signed in (the
 * server re-issues its cookies). 400 WRONG_PASSWORD, WEAK_PASSWORD or SAME_PASSWORD
 * carry a message meant for the person.
 */
export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  const { data } = await apiClient.post<ApiResponse<ChangePasswordResult>>(
    "/api/v1/auth/change-password",
    input,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to change your password");
  }

  return data.data;
}
