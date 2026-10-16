export interface NotificationView {
  id: string;
  type: string;
  title: string;
  /** Null when the server raised it with a title only. */
  body: string | null;
  /** The person behind it (a chat sender, an approver); null for system notices. */
  fromUserId?: string | null;
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
