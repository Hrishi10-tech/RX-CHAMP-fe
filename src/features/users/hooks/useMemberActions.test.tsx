import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { resetUserAvatar } from "@/features/avatars/api/avatars";
import type { TeamMember } from "@/types";

import { useMemberActions } from "./useMemberActions";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  resetUserAvatar: jest.fn(),
}));
jest.mock("@/features/users/components/MemberAccessDialogs", () => ({
  GrantsDialog: () => null,
  MemberDepartmentDialog: () => null,
}));
jest.mock("@/features/users/components/SetPasswordModal", () => ({ SetPasswordModal: () => null }));
jest.mock("@/features/agent/components/DownloadAgentRowButton", () => ({
  DownloadAgentRowButton: () => null,
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockSession = { role: "ADMIN" };
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({
    user: { id: "admin", email: "a@x.test" },
    role: mockSession.role,
    ready: true,
    logout: jest.fn(),
  }),
}));

const member: TeamMember = {
  id: "u-1",
  name: "Arjun Mehta",
  firstName: "Arjun",
  lastName: "Mehta",
  email: "arjun@x.test",
  role: "USER",
  designation: "",
  department: null,
  departments: [],
  status: "Active",
  screenshotsEnabled: true,
  idleEnabled: null,
  idleMinutes: null,
  grants: { screenshots: false, timeline: false, activity: false },
  shiftId: null,
  agentStatus: "OFFLINE",
  agentLastSeenAt: null,
  joined: "1 Nov 2026",
  avatarId: "M12",
};

function Row({ m, onChanged }: { m: TeamMember; onChanged: (change: string) => void }) {
  const { renderActions, dialogs } = useMemberActions({ onChanged, onEdit: jest.fn() });
  return (
    <>
      {renderActions(m)}
      {dialogs}
    </>
  );
}

function openMenu() {
  fireEvent.keyDown(screen.getByRole("button", { name: "More actions for Arjun Mehta" }), {
    key: "Enter",
  });
}

describe("Reset avatar on a member's row (3.6; 4.0: whoever sets the gender)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.role = "ADMIN";
  });

  it("asks first, then resets that person, says so and refreshes the list", async () => {
    (resetUserAvatar as jest.Mock).mockResolvedValue(undefined);
    const onChanged = jest.fn();
    render(<Row m={member} onChanged={onChanged} />);
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reset avatar" }));
    expect(resetUserAvatar).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Reset avatar" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("updated"));
    expect(resetUserAvatar).toHaveBeenCalledTimes(1);
    expect(resetUserAvatar).toHaveBeenCalledWith("u-1");
    expect(toast.success).toHaveBeenCalledWith("Avatar reset", {
      description: "Arjun Mehta is back on the default avatar.",
    });
  });

  it("says when it failed, and changes nothing on screen", async () => {
    (resetUserAvatar as jest.Mock).mockRejectedValue(new Error("Down"));
    const onChanged = jest.fn();
    render(<Row m={member} onChanged={onChanged} />);
    openMenu();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Reset avatar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reset avatar" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't reset the avatar", expect.anything()),
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("is offered to a Super Admin too", async () => {
    mockSession.role = "SUPER_ADMIN";
    render(<Row m={member} onChanged={jest.fn()} />);
    openMenu();
    expect(await screen.findByRole("menuitem", { name: "Reset avatar" })).toBeInTheDocument();
  });

  it("is not offered to the Super Manager, who may change the person otherwise", async () => {
    mockSession.role = "SUPER_MANAGER";
    render(<Row m={member} onChanged={jest.fn()} />);
    openMenu();
    await screen.findByRole("menuitem", { name: "Delete member" });
    expect(screen.queryByRole("menuitem", { name: "Reset avatar" })).toBeNull();
  });

  it("a Manager has no row actions at all", () => {
    mockSession.role = "MANAGER";
    render(<Row m={member} onChanged={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "More actions for Arjun Mehta" })).toBeNull();
  });

  it("is not offered for someone with no avatar yet", async () => {
    render(<Row m={{ ...member, avatarId: null }} onChanged={jest.fn()} />);
    openMenu();
    await screen.findByRole("menuitem", { name: "Delete member" });
    expect(screen.queryByRole("menuitem", { name: "Reset avatar" })).toBeNull();
  });
});
