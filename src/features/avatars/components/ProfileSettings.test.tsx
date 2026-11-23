import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  NO_DAY_PROGRESS,
  getAvatarManifest,
  getDayProgress,
  getMyAvatar,
} from "@/features/avatars/api/avatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";
import { getUser } from "@/features/users/api/getUser";
import { addDaysToKey, todayKey } from "@/lib/time/businessTime";

import { ProfileSettings } from "./ProfileSettings";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn(),
  getMyAvatar: jest.fn(),
  getDayProgress: jest.fn(),
}));
jest.mock("@/features/users/api/getUser", () => ({ getUser: jest.fn() }));

const mockUser = { id: "me", name: "Karthik R", email: "karthik@x.test" };
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({ user: mockUser, role: "MANAGER", ready: true, logout: jest.fn() }),
}));
jest.mock("@/store/hooks", () => ({
  useAppSelector: (pick: (state: unknown) => unknown) => pick({ auth: { user: mockUser } }),
}));

function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfileSettings />
    </QueryClientProvider>,
  );
}

describe("Settings, Profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    (getMyAvatar as jest.Mock).mockResolvedValue({
      avatarId: "M12",
      chosenAvatarId: "M12",
      defaultAvatarId: "M01",
      library: "male",
    });
    (getDayProgress as jest.Mock).mockResolvedValue({
      ...NO_DAY_PROGRESS,
      workedSec: 5 * 3600 + 12 * 60,
    });
    (getUser as jest.Mock).mockResolvedValue({
      id: "me",
      name: "Karthik R",
      department: "Firmware",
      designation: "Team lead",
    });
  });

  it("shows who you are and today's status", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Profile" })).toBeInTheDocument();
    expect(await screen.findByText("Firmware")).toBeInTheDocument();
    expect(screen.getByText("Karthik R")).toBeInTheDocument();
    expect(await screen.findByText("Working · 5h 12m of 8h")).toBeInTheDocument();
    expect(screen.getByText("karthik@x.test")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(await screen.findByText("Team lead")).toBeInTheDocument();
  });

  it("says today for a day ended today, and not for an earlier one", async () => {
    (getDayProgress as jest.Mock).mockResolvedValue({
      ...NO_DAY_PROGRESS,
      status: "ENDED",
      date: todayKey(),
      workedSec: 8 * 3600 + 15 * 60,
    });
    const first = open();
    expect(await screen.findByText("Day ended · 8h 15m today")).toBeInTheDocument();
    first.unmount();
    (getDayProgress as jest.Mock).mockResolvedValue({
      ...NO_DAY_PROGRESS,
      status: "ENDED",
      date: addDaysToKey(todayKey(), -1),
      workedSec: 8 * 3600 + 15 * 60,
    });
    open();
    expect(await screen.findByText("Day ended · 8h 15m")).toBeInTheDocument();
  });

  describe("before today's time is known", () => {
    const iconStatus = (container: HTMLElement) =>
      container.querySelector("svg[width='96']")?.getAttribute("data-status");

    it("claims no status while the first answer is on its way", async () => {
      (getDayProgress as jest.Mock).mockReturnValue(new Promise(() => undefined));
      const { container } = open();
      await screen.findByText("Firmware");
      expect(iconStatus(container)).toBe("NOT_STARTED");
      expect(screen.queryByText(/Working/)).toBeNull();
    });

    it("says so calmly when it cannot be read", async () => {
      (getDayProgress as jest.Mock).mockRejectedValue(new Error("Down"));
      const { container } = open();
      expect(await screen.findByText("Today's time did not load.")).toBeInTheDocument();
      expect(iconStatus(container)).toBe("NOT_STARTED");
      expect(screen.queryByText(/Working/)).toBeNull();
    });
  });

  it("has nowhere to send a picture: presets only", async () => {
    const { container } = open();
    await screen.findByText("Firmware");
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("leads to the Avatar page", async () => {
    open();
    const link = await screen.findByRole("link", { name: "Avatar" });
    expect(link).toHaveAttribute("href", "/dashboard/settings/profile/avatar");
    expect(within(link).getByText("Avatar")).toBeInTheDocument();
  });

  it("shows the live icon with your avatar", async () => {
    const { container } = open();
    await screen.findByText("Firmware");
    const icon = container.querySelector("svg[width='96']");
    expect(icon).not.toBeNull();
    await screen.findByText("Working · 5h 12m of 8h");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector("svg[width='96'] image")?.getAttribute("href")).toContain(
      "/M12.webp",
    );
  });
});
