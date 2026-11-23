import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { ChatContactView } from "@/features/chat/types";

import { ConversationView } from "./ConversationView";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn().mockResolvedValue({ version: 1, defaults: {}, avatars: [] }),
}));

const contact = {
  userId: "u1",
  name: "Maya Reddy",
  role: "MANAGER",
  relation: "MANAGER",
  unread: 0,
} as unknown as ChatContactView;

function setup() {
  const onSend = jest.fn();
  // jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = jest.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ConversationView
        contact={contact}
        messages={[]}
        loading={false}
        sending={false}
        onSend={onSend}
      />
    </QueryClientProvider>,
  );
  const box = screen.getByPlaceholderText("Type a message…");
  fireEvent.change(box, { target: { value: "こんにちは" } });
  return { onSend, box };
}

// M-1 (guide ime-safe-enter-submit): Enter that confirms an IME composition is not a send.
describe("ConversationView: Enter and an IME", () => {
  it("does not send while a composition is being confirmed", () => {
    const { onSend, box } = setup();
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    fireEvent.keyDown(box, { key: "Enter", keyCode: 229 });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends on a plain Enter, and not on Shift+Enter", () => {
    const { onSend, box } = setup();
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("こんにちは");
  });

  it("the message list is a named region the keyboard can reach and scroll", () => {
    setup();
    const log = screen.getByRole("log", { name: "Messages" });
    expect(log).toHaveAttribute("tabindex", "0");
  });
});
