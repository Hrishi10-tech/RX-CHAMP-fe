"use client";

import { MessageSquare } from "lucide-react";

import { useChat } from "@/features/chat/hooks/useChat";
import { ConversationView } from "@/features/chat/components/ConversationView";

export function MemberChat({ enabled }: { enabled: boolean }) {
  const { activeContact, messages, loadingContacts, loadingMessages, sending, send } = useChat({
    enabled,
    autoSelectRole: "MANAGER",
  });

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loadingContacts && !activeContact ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      ) : !activeContact ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
          <MessageSquare className="h-10 w-10" />
          <p className="text-sm">No manager assigned to message yet.</p>
        </div>
      ) : (
        <ConversationView
          contact={activeContact}
          messages={messages}
          loading={loadingMessages}
          sending={sending}
          onSend={send}
        />
      )}
    </div>
  );
}
