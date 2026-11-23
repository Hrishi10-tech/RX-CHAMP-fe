"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { formatTime12 } from "@/lib/time/format";
import type { ChatContactView, ConversationTab } from "@/features/chat/types";

function relativeLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime12(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ConversationRow({
  contact,
  active,
  onSelect,
}: {
  contact: ChatContactView;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-brand/6" : "hover:bg-fill"
      }`}
    >
      <div className="relative shrink-0">
        <PersonAvatar
          name={contact.name}
          avatarId={contact.avatarId}
          userId={contact.userId}
          size={44}
        />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-working ring-2 ring-card" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-primary">{contact.name}</p>
          <span className="shrink-0 text-[0.6875rem] text-quiet">
            {relativeLabel(contact.lastAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-xs ${
              contact.unread > 0 ? "font-medium text-soft" : "text-quiet"
            }`}
          >
            {contact.lastMessage ?? "No messages yet"}
          </p>
          {contact.unread > 0 && (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[0.6875rem] font-bold leading-none text-on-brand">
              {contact.unread > 99 ? "99+" : contact.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({
  contacts,
  activeUserId,
  loading,
  query,
  onSelect,
}: {
  contacts: ChatContactView[];
  activeUserId: string | null;
  loading: boolean;
  query: string;
  onSelect: (userId: string) => void;
}) {
  const [tab, setTab] = useState<ConversationTab>("all");

  const unreadCount = useMemo(() => contacts.filter((c) => c.unread > 0).length, [contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byName = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
    if (tab === "unread") return byName.filter((c) => c.unread > 0);
    if (tab === "mentions") return [];
    return byName;
  }, [contacts, query, tab]);

  const tabs: { key: ConversationTab; label: string; badge?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", badge: unreadCount },
    { key: "mentions", label: "Mentions" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <div className="flex items-center gap-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`flex min-h-8 items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 max-sm:min-h-11 ${
                tab === t.key ? "text-primary" : "text-quiet hover:text-soft"
              }`}
            >
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[0.625rem] font-bold leading-none text-on-brand">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Sort conversations"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-quiet hover:bg-panel hover:text-soft max-sm:h-11 max-sm:w-11"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-quiet">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-quiet">
            {tab === "mentions"
              ? "No mentions yet."
              : tab === "unread"
                ? "You're all caught up."
                : query.trim()
                  ? "No matches."
                  : "No conversations yet."}
          </p>
        ) : (
          filtered.map((c) => (
            <ConversationRow
              key={c.userId}
              contact={c}
              active={c.userId === activeUserId}
              onSelect={() => onSelect(c.userId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
