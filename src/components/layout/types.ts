import type { ReactNode } from "react";

import type { NotificationView } from "@/features/notifications/types";
import type { NavItem } from "@/types";

export type NotificationFilter = "all" | "unread";

export interface NavSection {
  heading?: string;
  items: NavItem[];
}

export interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationView[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}
export interface PageWrapperProps {
  children: ReactNode;
}
