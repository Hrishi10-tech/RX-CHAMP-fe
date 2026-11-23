import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import {
  NO_DAY_PROGRESS,
  getAvatarManifest,
  getDayProgress,
  getMyAvatar,
  resetMyAvatar,
  setMyAvatar,
} from "@/features/avatars/api/avatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";
import type { DayProgress, MyAvatar } from "@/features/avatars/types";
import { updateUser } from "@/features/users/api/updateUser";
import { addDaysToKey, todayKey } from "@/lib/time/businessTime";

import { AvatarSettings } from "./AvatarSettings";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn(),
  getMyAvatar: jest.fn(),
  getDayProgress: jest.fn(),
  setMyAvatar: jest.fn(),
  resetMyAvatar: jest.fn(),
}));
jest.mock("@/lib/time/businessTime", () => {
  const actual = jest.requireActual("@/lib/time/businessTime");
  return { ...actual, todayKey: jest.fn(actual.todayKey) };
});
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/features/users/api/updateUser", () => ({ updateUser: jest.fn() }));

const { todayKey: realToday } = jest.requireActual("@/lib/time/businessTime");

const mockRole = { current: "MANAGER" };
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({
    user: { id: "me", name: "Karthik R", email: "karthik@x.test" },
    role: mockRole.current,
    ready: true,
    logout: jest.fn(),
  }),
}));
jest.mock("@/store/hooks", () => ({
  useAppSelector: (pick: (state: unknown) => unknown) =>
    pick({ auth: { user: { id: "me", name: "Karthik R", email: "karthik@x.test" } } }),
}));

const male = (over: Partial<MyAvatar> = {}): MyAvatar => ({
  avatarId: "M01",
  chosenAvatarId: null,
  defaultAvatarId: "M01",
  library: "male",
  ...over,
});

const day: DayProgress = {
  ...NO_DAY_PROGRESS,
  status: "WORKING",
  workedSec: 4 * 3600 + 58 * 60,
  targetSec: 8 * 3600,
  date: todayKey(),
};

function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <AvatarSettings />
      </QueryClientProvider>,
    ),
  };
}

const tile = (id: string) => screen.findByRole("button", { name: new RegExp(`^Avatar ${id}`) });
const tiles = () => screen.getAllByRole("button", { name: /^Avatar / });
const previewOf = () => screen.getByRole("region", { name: "Preview" });
const largeIcon = () => previewOf().querySelector("svg[width='160']")!;

describe("Settings, Profile, Avatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole.current = "MANAGER";
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    (getMyAvatar as jest.Mock).mockResolvedValue(male());
    (getDayProgress as jest.Mock).mockResolvedValue(day);
  });

  it("has the title, the path and both cards of the design", async () => {
    open();
    await tile("M01");
    expect(screen.getByRole("heading", { level: 1, name: "Avatar" })).toBeInTheDocument();
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByText("Settings")).toBeInTheDocument();
    expect(within(trail).getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose an avatar" })).toBeInTheDocument();
  });

  it("links Settings for a Super Admin only: the others have no such page", async () => {
    mockRole.current = "SUPER_ADMIN";
    const admin = open();
    await tile("M01");
    let trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByRole("link", { name: "Settings" })).toBeInTheDocument();
    admin.unmount();

    for (const role of ["MANAGER", "SUPER_MANAGER"]) {
      mockRole.current = role;
      const other = open();
      await tile("M01");
      trail = screen.getByRole("navigation", { name: "Breadcrumb" });
      expect(within(trail).getByText("Settings")).toBeInTheDocument();
      expect(within(trail).queryByRole("link", { name: "Settings" })).toBeNull();
      other.unmount();
    }
  });

  describe("choosing", () => {
    it("counts the person's library", async () => {
      open();
      expect(await screen.findByText("75 male avatars")).toBeInTheDocument();
    });

    it("shows the 25 of the set the current avatar is in, of their own library only", async () => {
      (getMyAvatar as jest.Mock).mockResolvedValue(
        male({ avatarId: "M30", chosenAvatarId: "M30" }),
      );
      open();
      await tile("M30");
      expect(screen.getByRole("tab", { name: "Set 2" })).toHaveAttribute("aria-selected", "true");
      expect(tiles()).toHaveLength(25);
      expect(tiles().every((t) => /Avatar M/.test(t.getAttribute("aria-label") ?? ""))).toBe(true);
    });

    it("never offers the other library, in any set", async () => {
      (getMyAvatar as jest.Mock).mockResolvedValue(
        male({ avatarId: "F01", defaultAvatarId: "F01", library: "female" }),
      );
      open();
      await tile("F01");
      expect(await screen.findByText("75 female avatars")).toBeInTheDocument();
      for (const set of ["Set 1", "Set 2", "Set 3"]) {
        fireEvent.click(screen.getByRole("tab", { name: set }));
        expect(tiles()).toHaveLength(25);
        expect(tiles().every((t) => /Avatar F/.test(t.getAttribute("aria-label") ?? ""))).toBe(
          true,
        );
      }
    });

    it("switches sets", async () => {
      open();
      await tile("M01");
      fireEvent.click(screen.getByRole("tab", { name: "Set 3" }));
      expect(await tile("M51")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Avatar M01/ })).toBeNull();
    });

    it("marks the selected one with an outline and a check, and the default with a caption", async () => {
      open();
      const current = await tile("M01");
      expect(current).toHaveAttribute("aria-pressed", "true");
      expect(current.className).toContain("ring-[#6FC9B6]");
      expect(current.querySelector("svg")).not.toBeNull();
      expect(screen.getByText("Default")).toBeInTheDocument();
      fireEvent.click(await tile("M05"));
      expect(await tile("M05")).toHaveAttribute("aria-pressed", "true");
      expect(await tile("M01")).toHaveAttribute("aria-pressed", "false");
      expect((await tile("M01")).querySelector("svg")).toBeNull();
    });

    it("sizes the grid by the room in the card, and keeps every tile round", async () => {
      open();
      const current = await tile("M01");
      const grid = current.parentElement!.parentElement!;
      expect(grid.className).toContain("grid-cols-[repeat(auto-fill,minmax(58px,1fr))]");
      expect(grid.className).toContain("sm:grid-cols-[repeat(auto-fill,minmax(66px,1fr))]");
      expect(grid.className).not.toMatch(/\bgrid-cols-\d|:grid-cols-\d/);
      expect(current.querySelector("img")).toHaveClass("max-w-none");
    });

    it("previews a tapped avatar before it is saved", async () => {
      open();
      fireEvent.click(await tile("M05"));
      await waitFor(() =>
        expect(largeIcon().querySelector("image")?.getAttribute("href")).toContain("/M05.webp"),
      );
      expect(setMyAvatar).not.toHaveBeenCalled();
    });
  });

  describe("saving", () => {
    it("has nothing to save until another avatar is picked", async () => {
      open();
      await tile("M01");
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
      fireEvent.click(await tile("M01"));
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
      fireEvent.click(await tile("M05"));
      expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    });

    it("sends the manifest ID, confirms, and shows it as current", async () => {
      (setMyAvatar as jest.Mock).mockResolvedValue(
        male({ avatarId: "M05", chosenAvatarId: "M05" }),
      );
      open();
      fireEvent.click(await tile("M05"));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(setMyAvatar).toHaveBeenCalledWith("M05", expect.anything()));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Avatar updated", expect.anything()),
      );
      expect(await tile("M05")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    });

    it("keeps another avatar picked while the save is on its way", async () => {
      let done: (view: MyAvatar) => void = () => undefined;
      (setMyAvatar as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          done = resolve;
        }),
      );
      open();
      fireEvent.click(await tile("M05"));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(setMyAvatar).toHaveBeenCalled());
      fireEvent.click(await tile("M07"));
      done(male({ avatarId: "M05", chosenAvatarId: "M05" }));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Avatar updated", expect.anything()),
      );
      expect(await tile("M07")).toHaveAttribute("aria-pressed", "true");
      expect(await tile("M05")).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
      expect(setMyAvatar).toHaveBeenCalledTimes(1);
    });

    it("says why when the server refuses, and keeps the pick", async () => {
      const refused = new AxiosError("refused");
      refused.response = {
        status: 403,
        data: { message: "You can pick from your own avatars." },
      } as never;
      (setMyAvatar as jest.Mock).mockRejectedValue(refused);
      open();
      fireEvent.click(await tile("M05"));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "You can pick from your own avatars.",
      );
      expect(await tile("M05")).toHaveAttribute("aria-pressed", "true");
    });

    it("clears the message when another avatar is picked", async () => {
      (setMyAvatar as jest.Mock).mockRejectedValue(new Error("Try later"));
      open();
      fireEvent.click(await tile("M05"));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      await screen.findByRole("alert");
      fireEvent.click(await tile("M06"));
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("resetting", () => {
    it("goes back to the default on the server", async () => {
      (getMyAvatar as jest.Mock).mockResolvedValue(
        male({ avatarId: "M05", chosenAvatarId: "M05" }),
      );
      (resetMyAvatar as jest.Mock).mockResolvedValue(male());
      open();
      await tile("M05");
      fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
      await waitFor(() => expect(resetMyAvatar).toHaveBeenCalled());
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Back to your default avatar"),
      );
      expect(await tile("M01")).toHaveAttribute("aria-pressed", "true");
    });

    it("only drops the pick when nothing was chosen before", async () => {
      open();
      fireEvent.click(await tile("M05"));
      fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
      expect(resetMyAvatar).not.toHaveBeenCalled();
      expect(await tile("M01")).toHaveAttribute("aria-pressed", "true");
    });

    it("is not offered while already on the default", async () => {
      open();
      await tile("M01");
      expect(screen.getByRole("button", { name: "Reset to default" })).toBeDisabled();
    });
  });

  describe("the live preview", () => {
    it("shows the person's status and today's ring", async () => {
      open();
      await tile("M01");
      expect(await screen.findByText("Working · 4h 58m of 8h")).toBeInTheDocument();
      expect(largeIcon().getAttribute("data-status")).toBe("WORKING");
      const ring = largeIcon().querySelector('[data-part="ring"]');
      const dash = Number(ring?.getAttribute("stroke-dasharray")?.split(" ")[0]);
      expect(dash).toBeCloseTo(((4 * 3600 + 58 * 60) / (8 * 3600)) * 2 * Math.PI * 25, 4);
    });

    it("follows the person's status when they have not picked a tab", async () => {
      (getDayProgress as jest.Mock).mockResolvedValue({ ...day, status: "MEETING" });
      open();
      expect(await screen.findByText("In a meeting · 4h 58m of 8h")).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Meeting" })).toHaveAttribute("aria-selected", "true");
    });

    it.each([
      ["Meeting", "MEETING", "In a meeting · 4h 58m of 8h"],
      ["Break", "BREAK", "On break · 4h 58m of 8h"],
      ["Ended", "ENDED", "Day ended · 4h 58m today"],
      ["Working", "WORKING", "Working · 4h 58m of 8h"],
    ])("previews %s", async (tab, status, label) => {
      open();
      await screen.findByText("Working · 4h 58m of 8h");
      fireEvent.click(screen.getByRole("tab", { name: tab }));
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(largeIcon().getAttribute("data-status")).toBe(status);
    });

    describe("a picked tab", () => {
      const status = () => largeIcon().getAttribute("data-status");

      it("stops being a preview when the person's real status changes", async () => {
        const { client } = open();
        await screen.findByText("Working · 4h 58m of 8h");
        fireEvent.click(screen.getByRole("tab", { name: "Meeting" }));
        expect(status()).toBe("MEETING");
        (getDayProgress as jest.Mock).mockResolvedValue({ ...day, status: "BREAK" });
        await act(() => client.invalidateQueries());
        await waitFor(() => expect(status()).toBe("BREAK"));
        expect(screen.getByText("On break · 4h 58m of 8h")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Break" })).toHaveAttribute("aria-selected", "true");
      });

      it("the person's own status does not pin the preview", async () => {
        const { client } = open();
        await screen.findByText("Working · 4h 58m of 8h");
        fireEvent.click(screen.getByRole("tab", { name: "Working" }));
        (getDayProgress as jest.Mock).mockResolvedValue({ ...day, status: "BREAK" });
        await act(() => client.invalidateQueries());
        await waitFor(() => expect(status()).toBe("BREAK"));
      });

      it("the same tab again goes back to Not started, which has no tab", async () => {
        (getDayProgress as jest.Mock).mockResolvedValue({
          ...day,
          status: "NOT_STARTED",
          workedSec: 0,
        });
        open();
        await screen.findByText("Not started");
        fireEvent.click(screen.getByRole("tab", { name: "Working" }));
        expect(status()).toBe("WORKING");
        fireEvent.click(screen.getByRole("tab", { name: "Working" }));
        expect(status()).toBe("NOT_STARTED");
        expect(screen.getByText("Not started")).toBeInTheDocument();
      });
    });

    describe("a day ended", () => {
      it("says today only for today", async () => {
        (getDayProgress as jest.Mock).mockResolvedValue({
          ...day,
          status: "ENDED",
          workedSec: 8 * 3600 + 15 * 60,
        });
        open();
        expect(await screen.findByText("Day ended · 8h 15m today")).toBeInTheDocument();
      });

      it("keeps an earlier day's total on the ring, without today", async () => {
        (getDayProgress as jest.Mock).mockResolvedValue({
          ...day,
          status: "ENDED",
          date: addDaysToKey(todayKey(), -1),
          workedSec: 8 * 3600 + 15 * 60,
          overSec: 15 * 60,
        });
        open();
        expect(await screen.findByText("Day ended · 8h 15m")).toBeInTheDocument();
        expect(screen.queryByText(/today/)).toBeNull();
        const ring = largeIcon().querySelector('[data-part="ring"]');
        expect(ring?.getAttribute("stroke")).toBe("#6FC9B6");
        expect(ring?.getAttribute("stroke-opacity")).toBe("0.3");
      });

      it("drops today when the date changes with the page open, on the next read", async () => {
        (getDayProgress as jest.Mock).mockResolvedValue({ ...day, status: "ENDED" });
        const { client } = open();
        expect(await screen.findByText("Day ended · 4h 58m today")).toBeInTheDocument();
        (todayKey as jest.Mock).mockReturnValue(addDaysToKey(day.date, 1));
        try {
          await act(() => client.invalidateQueries());
          expect(await screen.findByText("Day ended · 4h 58m")).toBeInTheDocument();
        } finally {
          (todayKey as jest.Mock).mockImplementation(realToday);
        }
      });
    });

    describe("before today's time is known", () => {
      it("claims no status while the first answer is on its way", async () => {
        (getDayProgress as jest.Mock).mockReturnValue(new Promise(() => undefined));
        open();
        await tile("M01");
        expect(largeIcon().getAttribute("data-status")).toBe("NOT_STARTED");
        expect(largeIcon().querySelector('[data-part="ring"]')).toBeNull();
        expect(screen.queryByText(/Working ·/)).toBeNull();
        for (const tab of screen.getAllByRole("tab", { name: /Working|Meeting|Break|Ended/ })) {
          expect(tab).toHaveAttribute("aria-selected", "false");
        }
      });

      it("prints no time for a tab picked meanwhile", async () => {
        (getDayProgress as jest.Mock).mockReturnValue(new Promise(() => undefined));
        open();
        await tile("M01");
        fireEvent.click(screen.getByRole("tab", { name: "Meeting" }));
        expect(largeIcon().getAttribute("data-status")).toBe("MEETING");
        expect(screen.queryByText(/0h 00m/)).toBeNull();
      });

      it("says so calmly when it cannot be read, and the picker still works", async () => {
        (getDayProgress as jest.Mock).mockRejectedValue(new Error("Down"));
        open();
        expect(await screen.findByText("Today's time did not load.")).toBeInTheDocument();
        expect(largeIcon().getAttribute("data-status")).toBe("NOT_STARTED");
        expect(screen.queryByText(/Working ·/)).toBeNull();
        fireEvent.click(await tile("M05"));
        expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
      });

      it("corrects itself when a later read works", async () => {
        (getDayProgress as jest.Mock).mockRejectedValue(new Error("Down"));
        const { client } = open();
        await screen.findByText("Today's time did not load.");
        (getDayProgress as jest.Mock).mockResolvedValue(day);
        await act(() => client.invalidateQueries());
        expect(await screen.findByText("Working · 4h 58m of 8h")).toBeInTheDocument();
      });
    });

    it("shows Not started with an empty ring and no tab chosen", async () => {
      (getDayProgress as jest.Mock).mockResolvedValue({
        ...day,
        status: "NOT_STARTED",
        workedSec: 0,
      });
      open();
      expect(await screen.findByText("Not started")).toBeInTheDocument();
      expect(largeIcon().querySelector('[data-part="ring"]')).toBeNull();
      for (const tab of screen.getAllByRole("tab", { name: /Working|Meeting|Break|Ended/ })) {
        expect(tab).toHaveAttribute("aria-selected", "false");
      }
    });

    it("shows the extra time past the target", async () => {
      (getDayProgress as jest.Mock).mockResolvedValue({
        ...day,
        workedSec: 8 * 3600 + 15 * 60,
        overSec: 15 * 60,
      });
      open();
      expect(await screen.findByText("+15 min over target")).toBeInTheDocument();
    });

    it("has real-size previews on a dark and a light tile", async () => {
      const { container } = open();
      await tile("M01");
      for (const tone of ["dark", "light"]) {
        const icon = container.querySelector(`[data-tile="${tone}"] svg`);
        expect(icon?.getAttribute("width")).toBe("56");
      }
    });

    it("shows Working at 0 until the day progress route exists", async () => {
      (getDayProgress as jest.Mock).mockResolvedValue(NO_DAY_PROGRESS);
      open();
      expect(await screen.findByText("Working · 0h 00m of 8h")).toBeInTheDocument();
    });
  });

  describe("a person with no gender yet", () => {
    const none: MyAvatar = {
      avatarId: null,
      chosenAvatarId: null,
      defaultAvatarId: null,
      library: null,
    };

    it("says so calmly, shows initials and offers no grid", async () => {
      (getMyAvatar as jest.Mock).mockResolvedValue(none);
      open();
      // 4.0: a Manager's gender is the organisation admin's to set.
      expect(
        await screen.findByText(
          "You can choose an avatar once the organisation admin has set your gender.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(screen.queryByRole("button", { name: /^Avatar / })).toBeNull();
      expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
      expect(largeIcon().querySelector('[data-part="initials"]')?.textContent).toBe("KR");
    });

    it.each(["ADMIN", "SUPER_MANAGER"])("tells %s a Super Admin sets theirs", async (role) => {
      mockRole.current = role;
      (getMyAvatar as jest.Mock).mockResolvedValue(none);
      open();
      expect(
        await screen.findByText("You can choose an avatar once a Super Admin has set your gender."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("radiogroup")).toBeNull();
    });

    it("lets a Super Admin set their own here (nobody else may), then shows the library", async () => {
      mockRole.current = "SUPER_ADMIN";
      (getMyAvatar as jest.Mock).mockResolvedValueOnce(none).mockResolvedValue(male());
      (updateUser as jest.Mock).mockResolvedValue({ id: "me" });
      open();
      const save = await screen.findByRole("button", { name: "Save gender" });
      expect(save).toBeDisabled();
      fireEvent.click(screen.getByRole("radio", { name: "Male" }));
      fireEvent.click(save);
      await waitFor(() => expect(updateUser).toHaveBeenCalledWith("me", { gender: "MALE" }));
      expect(await tile("M01")).toBeInTheDocument();
    });
  });

  it("has nowhere to send a picture: presets only, for every role", async () => {
    for (const role of ["MANAGER", "ADMIN", "SUPER_MANAGER", "SUPER_ADMIN"]) {
      mockRole.current = role;
      const { container, unmount } = open();
      await tile("M01");
      expect(container.querySelector('input[type="file"]')).toBeNull();
      unmount();
    }
  });

  it("offers a retry when the library does not load", async () => {
    (getAvatarManifest as jest.Mock).mockRejectedValue(new Error("Down"));
    open();
    const retry = await screen.findByRole("button", { name: /try again/i });
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    fireEvent.click(retry);
    expect(await tile("M01")).toBeInTheDocument();
  });

  it("writes the failure in colours that read on the dark card", async () => {
    (getAvatarManifest as jest.Mock).mockRejectedValue(new Error("Down"));
    open();
    const title = await screen.findByText("Your avatars did not load");
    expect(title).toHaveClass("text-slate-100");
    expect(title).not.toHaveClass("text-slate-800");
    expect(screen.getByText("Down")).toHaveClass("text-slate-300");
  });

  it("keeps the picker and the pick when a background refresh fails", async () => {
    const { client } = open();
    fireEvent.click(await tile("M05"));
    (getMyAvatar as jest.Mock).mockRejectedValue(new Error("Down"));
    await act(() => client.invalidateQueries());
    await waitFor(() => expect(getMyAvatar).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Your avatars did not load")).toBeNull();
    expect(tiles()).toHaveLength(25);
    expect(await tile("M05")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
});
