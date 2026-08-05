export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsMeta {
  total: number;
  unread: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface NotificationsResult {
  notifications: NotificationView[];
  meta?: NotificationsMeta;
}

export interface UseNotificationsResult {
  notifications: NotificationView[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
}
