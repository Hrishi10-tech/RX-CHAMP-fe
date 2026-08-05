export type ConversationTab = "all" | "unread" | "mentions";

export interface ChatContact {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  mine: boolean;
  read: boolean;
  createdAt: string;
}

export interface ChatContactView extends ChatContact {
  unread: number;
  lastMessage?: string;
  lastAt?: string;
}

export interface GetMessagesParams {
  withUserId: string;
  limit?: number;
}

export interface SendMessageParams {
  toUserId: string;
  body: string;
}

export interface ConversationViewProps {
  contact: ChatContactView | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  onSend: (body: string) => void;
  emptyState?: string;
}

export interface UseChatOptions {
  enabled: boolean;
  autoSelectRole?: string;
}

export interface UseChatResult {
  contacts: ChatContactView[];
  activeUserId: string | null;
  activeContact: ChatContactView | null;
  messages: ChatMessage[];
  loadingContacts: boolean;
  loadingMessages: boolean;
  sending: boolean;
  totalUnread: number;
  selectContact: (userId: string) => void;
  send: (body: string) => Promise<void>;
}
