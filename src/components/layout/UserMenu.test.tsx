import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getAvatarManifest, getMyAvatar } from "@/features/avatars/api/avatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";

import { UserMenu } from "./UserMenu";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getMyAvatar: jest.fn(),
  getAvatarManifest: jest.fn().mockResolvedValue({ version: 1, defaults: {}, avatars: [] }),
}));
jest.mock("@/features/auth/components/ChangePasswordModal", () => ({
  ChangePasswordModal: () => null,
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRole = { current: "MANAGER" };
const mockUser = { id: "me", name: "Karthik R", email: "karthik@x.test" };
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({ user: mockUser, role: mockRole.current, ready: true, logout: jest.fn() }),
}));
jest.mock("@/store/hooks", () => ({
  useAppSelector: (pick: (state: unknown) => unknown) => pick({ auth: { user: mockUser } }),
}));

function openMenu() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UserMenu />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open user menu" }));
}

describe("the user menu's My Profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMyAvatar as jest.Mock).mockResolvedValue({
      avatarId: null,
      chosenAvatarId: null,
      defaultAvatarId: null,
      library: null,
    });
  });

  it.each(["MANAGER", "SUPER_MANAGER", "SUPER_ADMIN"])(
    "takes a %s to Settings, Profile",
    (role) => {
      mockRole.current = role;
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: "My Profile" }));
      expect(mockPush).toHaveBeenCalledWith("/dashboard/settings/profile");
    },
  );

  it("stays as it was for Staff, who have no web picker", () => {
    mockRole.current = "USER";
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "My Profile" }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows initials while the person has no avatar", async () => {
    mockRole.current = "USER";
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    openMenu();
    await waitFor(() => expect(getMyAvatar).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getAllByText("KR")).toHaveLength(2);
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows the person's avatar on the button and in the open menu", async () => {
    mockRole.current = "MANAGER";
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    (getMyAvatar as jest.Mock).mockResolvedValue({
      avatarId: "M12",
      chosenAvatarId: "M12",
      defaultAvatarId: "M01",
      library: "male",
    });
    openMenu();
    await waitFor(() => expect(document.querySelectorAll("img")).toHaveLength(2));
    for (const image of document.querySelectorAll("img")) {
      expect(image.getAttribute("src")).toContain("/M12.webp");
    }
    expect(screen.queryByText("KR")).toBeNull();
  });
});
