import { Check, CheckCheck } from "lucide-react";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { formatTime12 } from "@/lib/time/format";
import type { ChatMessage } from "@/features/chat/types";

function formatTime(iso: string): string {
  return formatTime12(iso);
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
        <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-brand/8 px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-strong">
            {message.body}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-xs leading-none text-quiet">{time}</span>
            {message.read ? (
              <CheckCheck className="h-3.5 w-3.5 text-brand" />
            ) : (
              <Check className="h-3.5 w-3.5 text-quiet" />
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
          <PersonAvatar
            name={senderName ?? "?"}
            avatarId={message.avatarId}
            userId={message.fromUserId}
            size={32}
          />
        ) : (
          <span className="w-8 shrink-0" aria-hidden />
        )}
        <div className="max-w-full rounded-2xl rounded-tl-sm bg-panel px-4 py-2.5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-body">
            {message.body}
          </p>
        </div>
      </div>
      <span className="ml-[42px] mt-1 text-xs leading-none text-quiet">{time}</span>
    </div>
  );
}
