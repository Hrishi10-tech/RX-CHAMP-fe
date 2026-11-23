"use client";

import { useState } from "react";

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
  // 3.6 (W-02): below lg the list and the thread take turns; the list was simply hidden.
  const [listOnPhone, setListOnPhone] = useState(true);
  const showList = listOnPhone || !activeContact;

  return (
    <div className="grid h-[calc(100vh-21rem)] min-h-[460px] grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
      <aside
        className={`${showList ? "block" : "hidden"} min-h-0 overflow-hidden rounded-2xl border border-card bg-card shadow-sm lg:block`}
      >
        <ConversationList
          contacts={contacts}
          activeUserId={activeUserId}
          loading={loadingContacts}
          query={query}
          onSelect={(id) => {
            selectContact(id);
            setListOnPhone(false);
          }}
        />
      </aside>

      <div
        className={`${showList ? "hidden" : "block"} min-h-0 min-w-0 overflow-hidden rounded-2xl border border-card bg-card shadow-sm lg:block`}
      >
        <ConversationView
          contact={activeContact}
          messages={messages}
          loading={loadingMessages}
          sending={sending}
          onSend={send}
          emptyState="Select a teammate to open the conversation."
          onBack={() => setListOnPhone(true)}
        />
      </div>
    </div>
  );
}
