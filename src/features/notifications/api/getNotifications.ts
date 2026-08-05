import { apiClient } from "@/lib/api";
import type {
  GetNotificationsParams,
  NotificationsMeta,
  NotificationsResult,
  NotificationView,
} from "@/features/notifications/types";

export async function getNotifications(
  params: GetNotificationsParams = {},
): Promise<NotificationsResult> {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );

  const { data } = await apiClient.get<{
    success: boolean;
    data?: NotificationView[];
    meta?: NotificationsMeta;
  }>("/api/v1/notifications", { params: query });

  return { notifications: data.data ?? [], meta: data.meta };
}
