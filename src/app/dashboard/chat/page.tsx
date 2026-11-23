"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { isApprover } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { PageHeader } from "@/features/dashboard/components/DashboardWidgets";
import { MemberChat } from "@/features/chat/components/MemberChat";
import { ManagerMessenger } from "@/features/chat/components/ManagerMessenger";

function ChatToolbar({ query, onQuery }: { query: string; onQuery: (value: string) => void }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quiet" />
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search messages, people…"
        className="h-11 w-56 rounded-lg border border-card bg-field pl-9 pr-3 text-sm text-body shadow-sm outline-none transition placeholder:text-neutral focus:border-brand md:w-72"
      />
    </div>
  );
}

export default function ChatPage() {
  const { user, role, ready } = useSession();
  const enabled = ready && !!user;
  const [query, setQuery] = useState("");

  const isManager = isApprover(role);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Messages"
          subtitle={
            isManager ? "Chat with your teammates and stay in sync." : "Chat with your manager."
          }
        />
        {isManager && <ChatToolbar query={query} onQuery={setQuery} />}
      </div>

      {isManager ? (
        <ManagerMessenger enabled={enabled} query={query} />
      ) : (
        <MemberChat enabled={enabled} />
      )}
    </div>
  );
}
