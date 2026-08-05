import { Check, CheckCheck } from "lucide-react";

import { Avatar } from "@/app/dashboard/admin/team-management/companies";
import type { ChatMessage } from "@/features/chat/types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
}

export function ChatBubble({
  message,
  senderName,
  firstInGroup = true,
}: {
  message: ChatMessage;
  senderName?: string;
  firstInGroup?: boolean;
}) {
  const time = formatTime(message.createdAt);

  if (message.mine) {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-[rgba(34,34,204,0.08)] px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
            {message.body}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] leading-none text-slate-400">{time}</span>
            {message.read ? (
              <CheckCheck className="h-3.5 w-3.5 text-[rgb(34_34_204)]" />
            ) : (
              <Check className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-end gap-2.5">
        {firstInGroup ? (
          <Avatar name={senderName ?? "?"} className="h-8 w-8 text-[10px]" />
        ) : (
          <span className="w-8 shrink-0" aria-hidden />
        )}
        <div className="max-w-full rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {message.body}
          </p>
        </div>
      </div>
      <span className="ml-[42px] mt-1 text-[10px] leading-none text-slate-400">{time}</span>
    </div>
  );
}
