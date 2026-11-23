import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ChatContactView } from "@/features/chat/types";

import { ConversationList } from "./ConversationList";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn().mockResolvedValue({ version: 1, defaults: {}, avatars: [] }),
}));

const contact = {
  userId: "u-1",
  name: "Arjun Mehta",
  role: "USER",
  avatarId: "M12",
  lastMessage: null,
  lastAt: null,
  unread: 0,
} as unknown as ChatContactView;

describe("Messages: the conversation list", () => {
  it("shows each contact's avatar", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ConversationList
          contacts={[contact]}
          activeUserId={null}
          query=""
          onSelect={jest.fn()}
          loading={false}
        />
      </QueryClientProvider>,
    );
    expect(container.querySelector('[data-avatar-id="M12"]')).not.toBeNull();
  });
});
