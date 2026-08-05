"use client";

import { useChat } from "@/features/chat/hooks/useChat";
import { ConversationList } from "@/features/chat/components/ConversationList";
import { ConversationView } from "@/features/chat/components/ConversationView";

export function ManagerMessenger({ enabled, query }: { enabled: boolean; query: string }) {
  const {
    contacts,
    activeUserId,
    activeContact,
    messages,
    loadingContacts,
    loadingMessages,
    sending,
    selectContact,
    send,
  } = useChat({ enabled });

  return (
    <div className="grid h-[calc(100vh-21rem)] min-h-[460px] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
      <aside className="hidden min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <ConversationList
          contacts={contacts}
          activeUserId={activeUserId}
          loading={loadingContacts}
          query={query}
          onSelect={selectContact}
        />
      </aside>

      <div className="min-h-0 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ConversationView
          contact={activeContact}
          messages={messages}
          loading={loadingMessages}
          sending={sending}
          onSend={send}
          emptyState="Select a teammate to open the conversation."
        />
      </div>
    </div>
  );
}
