import { apiClient, type ApiResponse } from "@/lib/api";

export interface SetUserPasswordResult {
  updated: true;
  id: string;
  signedOut: boolean;
}

/**
 * Sets someone else's password (a Super Admin for anyone else, a Manager for their
 * own staff). With `signOutEverywhere` every session they hold ends, the desktop
 * app included.
 */
export async function setUserPassword(
  id: string,
  newPassword: string,
  signOutEverywhere = false,
): Promise<SetUserPasswordResult> {
  const { data } = await apiClient.post<ApiResponse<SetUserPasswordResult>>(
    `/api/v1/users/${id}/password`,
    { newPassword, signOutEverywhere },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? "Failed to set the password");
  }

  return data.data;
}
