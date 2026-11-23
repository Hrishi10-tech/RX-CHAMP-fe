import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import type { ReactNode } from "react";

import { getAvatarManifest } from "@/features/avatars/api/avatars";
import { fileSizeFor } from "@/features/avatars/hooks/useAvatars";
import { clearLiveAvatars, setLiveAvatar } from "@/features/avatars/lib/liveAvatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";
import { refreshAccessToken } from "@/lib/api";

import { PersonAvatar } from "./PersonAvatar";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn(),
}));

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const imageIn = (container: HTMLElement) => container.querySelector("img");
const GRAPHITE = "bg-[linear-gradient(145deg,#6F7784_0%,#474E5A_50%,#2A2F38_100%)]";

describe("PersonAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearLiveAvatars();
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
  });

  it("shows the person's avatar from the manifest, with its content hash", async () => {
    const { container } = render(
      wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" size={36} />),
    );
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    expect(imageIn(container)?.getAttribute("src")).toContain(
      "/api/v1/avatars/files/96/M12.webp?v=hashM12",
    );
    expect(container.querySelector('[data-part="bezel"]')).toHaveClass(GRAPHITE);
  });

  it("shows initials in the same bezel while the person has no gender", () => {
    const { container } = render(wrap(<PersonAvatar name="Arjun Mehta" avatarId={null} />));
    expect(imageIn(container)).toBeNull();
    expect(screen.getByText("AM").closest('[data-part="bezel"]')).toHaveClass(GRAPHITE);
    expect(getAvatarManifest).not.toHaveBeenCalled();
  });

  it("shows initials until the library has loaded", async () => {
    let answer: (m: ReturnType<typeof manifestFixture>) => void = () => undefined;
    (getAvatarManifest as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { container } = render(wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" />));
    expect(screen.getByText("AM")).toBeInTheDocument();
    answer(manifestFixture());
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    expect(screen.queryByText("AM")).toBeNull();
  });

  it("falls back to initials when the image does not load", async () => {
    const { container } = render(wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" />));
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    fireEvent.error(imageIn(container)!);
    expect(imageIn(container)).toBeNull();
    expect(screen.getByText("AM")).toBeInTheDocument();
  });

  it("tries the image once more a moment later, then stays on the initials", async () => {
    const { container } = render(wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" />));
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    jest.useFakeTimers();
    try {
      fireEvent.error(imageIn(container)!);
      expect(imageIn(container)).toBeNull();
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      expect(imageIn(container)).not.toBeNull();
      fireEvent.error(imageIn(container)!);
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(imageIn(container)).toBeNull();
      expect(screen.getByText("AM")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it("stays on the initials after a failed retry, until the sign-in has been renewed", async () => {
    const { container } = render(wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" />));
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    jest.useFakeTimers();
    const refresh = jest.spyOn(axios, "post").mockResolvedValue({});
    try {
      fireEvent.error(imageIn(container)!);
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      fireEvent.error(imageIn(container)!);
      expect(imageIn(container)).toBeNull();
      // The tab was away: its polls now renew the 15 minute cookie.
      await act(() => refreshAccessToken());
      expect(imageIn(container)).not.toBeNull();
      // Renewed or not, a file that keeps failing gets its one retry, not a loop.
      fireEvent.error(imageIn(container)!);
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      fireEvent.error(imageIn(container)!);
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(imageIn(container)).toBeNull();
    } finally {
      refresh.mockRestore();
      jest.useRealTimers();
    }
  });

  it("shows initials for an ID the library no longer has", async () => {
    const { container } = render(
      wrap(
        <>
          <PersonAvatar name="Asha Rao" avatarId="F03" />
          <PersonAvatar name="Arjun Mehta" avatarId="M99" />
        </>,
      ),
    );
    // The known one proves the library has answered.
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByText("AM")).toBeInTheDocument();
  });

  it("updates live on avatar:changed, for that person only", async () => {
    const { container } = render(
      wrap(
        <>
          <PersonAvatar name="Arjun Mehta" avatarId="M12" userId="u-1" />
          <PersonAvatar name="Meera Nair" avatarId="F03" userId="u-2" />
        </>,
      ),
    );
    await waitFor(() => expect(container.querySelectorAll("img")).toHaveLength(2));
    act(() => setLiveAvatar("u-1", "M40"));
    const [first, second] = [...container.querySelectorAll("img")];
    expect(first.getAttribute("src")).toContain("/M40.webp");
    expect(second.getAttribute("src")).toContain("/F03.webp");
  });

  it("goes back to initials when a push says there is no avatar", async () => {
    const { container } = render(
      wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" userId="u-1" />),
    );
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    act(() => setLiveAvatar("u-1", null));
    expect(imageIn(container)).toBeNull();
  });

  it("a fetched list is the truth again after a reconnect", async () => {
    const { container } = render(
      wrap(<PersonAvatar name="Arjun Mehta" avatarId="M12" userId="u-1" />),
    );
    await waitFor(() => expect(imageIn(container)).not.toBeNull());
    act(() => setLiveAvatar("u-1", "M40"));
    expect(imageIn(container)?.getAttribute("src")).toContain("/M40.webp");
    act(() => clearLiveAvatars());
    expect(imageIn(container)?.getAttribute("src")).toContain("/M12.webp");
  });

  it("picks the smallest file that stays sharp on a two-times display", () => {
    expect(fileSizeFor(24)).toBe("48");
    expect(fileSizeFor(28)).toBe("96");
    expect(fileSizeFor(48)).toBe("96");
    expect(fileSizeFor(56)).toBe("144");
    expect(fileSizeFor(72)).toBe("144");
    expect(fileSizeFor(96)).toBe("192");
    expect(fileSizeFor(160)).toBe("192");
  });
});
