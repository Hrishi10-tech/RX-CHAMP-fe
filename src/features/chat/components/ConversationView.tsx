"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Paperclip, Send, ShieldCheck, Smile } from "lucide-react";

import { roleLabel } from "@/constants/roles";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { ChatBubble } from "@/features/chat/components/ChatBubble";
import type { ConversationViewProps } from "@/features/chat/types";

export function ConversationView({
  contact,
  messages,
  loading,
  sending,
  onSend,
  emptyState = "Select a conversation to start messaging.",
  onBack,
}: ConversationViewProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, contact?.userId, loading]);

  if (!contact) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-quiet">
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
      <header className="flex items-center gap-2 border-b border-divider px-3 py-3.5 sm:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to people"
            className="-ml-1 rounded-lg p-2 text-soft hover:bg-panel lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="relative">
            <PersonAvatar
              name={contact.name}
              avatarId={contact.avatarId}
              userId={contact.userId}
              size={40}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">{contact.name}</p>
            <p className="text-xs text-quiet">
              {[roleLabel(contact.role), contact.department].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </header>

      <div
        tabIndex={0}
        role="log"
        aria-label="Messages"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35"
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-quiet">Loading messages…</p>
        ) : (
          <>
            <div className="relative flex items-center justify-center py-1">
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-panel" />
              <span className="relative rounded-full border border-card bg-card px-3 py-0.5 text-[0.6875rem] font-medium text-quiet">
                Today
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-brand/4 p-4 ring-1 ring-panel">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <p className="text-xs leading-relaxed text-quiet">
                  This is the beginning of your direct message history with{" "}
                  <span className="font-semibold text-body">{contact.name}</span>
                  .
                  <br />
                  No one outside of this conversation can see these messages.
                </p>
              </div>
            </div>

            <div className="mt-5">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-quiet">No messages yet. Say hello 👋</p>
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
        <div className="flex items-center gap-2 rounded-full border border-card bg-card px-2.5 py-1.5 shadow-sm focus-within:border-brand">
          <button
            type="button"
            aria-label="Attach file"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-quiet transition hover:bg-panel hover:text-soft"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter that confirms an IME composition (Chinese, Japanese, Korean) is not a send.
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type a message…"
            className="min-w-0 flex-1 bg-transparent text-sm text-strong outline-none placeholder:text-neutral"
          />
          <button
            type="button"
            aria-label="Emoji"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-quiet transition hover:bg-panel hover:text-soft"
          >
            <Smile className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Add a GIF"
            className="hidden h-8 shrink-0 items-center rounded-lg px-2 text-xs font-bold text-quiet transition hover:bg-panel hover:text-soft sm:flex"
          >
            GIF
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand shadow-sm shadow-brand/35 transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-edge disabled:text-neutral disabled:shadow-none"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
