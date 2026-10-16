import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NotificationPanel } from "./NotificationPanel";
import type { NotificationView } from "@/features/notifications/types";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const NOTE: NotificationView = {
  id: "n-1",
  type: "SKIP_REQUESTED",
  title: "Asha skipped her morning break",
  body: "On a customer call until 11:40",
  read: false,
  readAt: null,
  createdAt: new Date().toISOString(),
};

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Notifications bell
      </button>
      <a href="/dashboard/me">Behind the panel</a>
      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        notifications={[NOTE]}
        unreadCount={1}
        loading={false}
        onMarkRead={jest.fn()}
        onMarkAllRead={jest.fn()}
      />
    </>
  );
}

describe("NotificationPanel, as a dialog", () => {
  it("takes focus, keeps Tab inside, closes on Escape and gives focus back", async () => {
    const user = userEvent.setup();
    render(<Page />);
    const bell = screen.getByRole("button", { name: "Notifications bell" });

    await user.click(bell);
    expect(screen.getByRole("dialog", { name: "Notifications" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    const close = screen.getByRole("button", { name: "Close notifications" });
    await waitFor(() => expect(close).toHaveFocus());

    // Shift+Tab from the first control wraps to the last, Tab from the last back
    // to the first: the page behind is never reached.
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Mark all as read" })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(bell).toHaveFocus());
  });

  it("brings focus back inside if something behind it takes it", async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(screen.getByRole("button", { name: "Notifications bell" }));
    const close = screen.getByRole("button", { name: "Close notifications" });
    await waitFor(() => expect(close).toHaveFocus());

    screen.getByRole("link", { name: "Behind the panel" }).focus();
    expect(close).toHaveFocus();
  });
});
