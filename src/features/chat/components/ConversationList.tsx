"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Avatar } from "@/app/dashboard/admin/team-management/companies";
import type { ChatContactView, ConversationTab } from "@/features/chat/types";

function relativeLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
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
        active ? "bg-[rgba(34,34,204,0.06)]" : "hover:bg-slate-50"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={contact.name} className="h-11 w-11 text-xs" />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{contact.name}</p>
          <span className="shrink-0 text-[11px] text-slate-400">
            {relativeLabel(contact.lastAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-xs ${
              contact.unread > 0 ? "font-medium text-slate-600" : "text-slate-400"
            }`}
          >
            {contact.lastMessage ?? "No messages yet"}
          </p>
          {contact.unread > 0 && (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[rgb(34_34_204)] px-1.5 text-[11px] font-bold leading-none text-white">
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
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 text-sm font-semibold transition ${
                tab === t.key ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
              {!!t.badge && t.badge > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[rgb(34_34_204)] px-1 text-[10px] font-bold leading-none text-white">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Sort conversations"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-400">
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
