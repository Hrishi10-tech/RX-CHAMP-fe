"use client";

import { useEffect, useRef, useState } from "react";
import {
  Info,
  MessageSquare,
  Paperclip,
  Phone,
  Pin,
  Send,
  ShieldCheck,
  Smile,
  Video,
} from "lucide-react";

import { Avatar } from "@/app/dashboard/admin/team-management/companies";
import { ChatBubble } from "@/features/chat/components/ChatBubble";
import type { ConversationViewProps } from "@/features/chat/types";

const HEADER_ACTIONS = [
  { icon: Phone, label: "Call" },
  { icon: Video, label: "Video call" },
  { icon: Pin, label: "Pinned messages" },
  { icon: Info, label: "Conversation details" },
];

export function ConversationView({
  contact,
  messages,
  loading,
  sending,
  onSend,
  emptyState = "Select a conversation to start messaging.",
}: ConversationViewProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, contact?.userId, loading]);

  if (!contact) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <MessageSquare className="h-10 w-10" />
        <p className="text-sm">{emptyState}</p>
      </div>
    );
  }

  function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    onSend(body);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={contact.name} className="h-10 w-10 text-xs" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {HEADER_ACTIONS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading messages…</p>
        ) : (
          <>
            <div className="relative flex items-center justify-center py-1">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-100" />
              <span className="relative rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-medium text-slate-500">
                Today
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-[rgba(34,34,204,0.04)] p-4 ring-1 ring-slate-100">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(34_34_204)]" />
                <p className="text-xs leading-relaxed text-slate-500">
                  This is the beginning of your direct message history with{" "}
                  <span className="font-semibold text-slate-700">{contact.name}</span>
                  .
                  <br />
                  No one outside of this conversation can see these messages.
                </p>
              </div>
            </div>

            <div className="mt-5">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No messages yet. Say hello 👋
                </p>
              ) : (
                messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const firstInGroup = !prev || prev.mine !== m.mine;
                  return (
                    <div key={m.id} className={firstInGroup ? "mt-5 first:mt-0" : "mt-1.5"}>
                      <ChatBubble
                        message={m}
                        senderName={contact.name}
                        firstInGroup={firstInGroup}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm focus-within:border-[rgb(34_34_204)]">
          <button
            type="button"
            aria-label="Attach file"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type a message…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            aria-label="Emoji"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <Smile className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Add a GIF"
            className="hidden h-8 shrink-0 items-center rounded-lg px-2 text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:flex"
          >
            GIF
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.35)] transition hover:bg-[rgb(28_28_180)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
