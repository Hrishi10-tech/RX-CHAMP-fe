import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRef, type ReactNode } from "react";

import { getAvatarManifest } from "@/features/avatars/api/avatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";
import {
  ANY,
  EMPTY_MEMBER_FILTERS,
  asGenderFilter,
  countActiveFilters,
  genderFilterOptions,
} from "@/features/users/lib/memberQuery";

import { DefaultAvatarCard, GenderField } from "./GenderField";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn(),
}));

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("the gender field", () => {
  it("offers Male and Female, with nothing chosen for you", () => {
    render(<GenderField labelledBy="l" value={null} onChange={jest.fn()} />);
    const options = screen.getAllByRole("radio");
    expect(options.map((o) => o.textContent)).toEqual(["Male", "Female"]);
    expect(options.every((o) => o.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("marks the chosen one and reports a change", () => {
    const onChange = jest.fn();
    render(<GenderField labelledBy="l" value="FEMALE" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Female" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Male" }));
    expect(onChange).toHaveBeenCalledWith("MALE");
  });

  it("can be disabled while saving", () => {
    const onChange = jest.fn();
    render(<GenderField labelledBy="l" value={null} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole("radio", { name: "Male" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks itself when required and empty", () => {
    render(<GenderField labelledBy="l" value={null} onChange={jest.fn()} invalid />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
  });

  it("gives a form its first option to focus", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<GenderField labelledBy="l" value={null} onChange={jest.fn()} firstOptionRef={ref} />);
    expect(ref.current).toBe(screen.getByRole("radio", { name: "Male" }));
  });
});

describe("the default avatar card", () => {
  beforeEach(() => {
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
  });

  it("names the default and the library, with the person's first name", async () => {
    render(wrap(<DefaultAvatarCard gender="MALE" firstName="Arjun" webToo={false} />));
    expect(await screen.findByText("Default avatar: M01")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Set from gender. Arjun can switch to any of the 75 male avatars from the agent or the mobile app.",
      ),
    ).toBeInTheDocument();
  });

  it("follows the gender", async () => {
    render(wrap(<DefaultAvatarCard gender="FEMALE" firstName="" webToo={false} />));
    expect(await screen.findByText("Default avatar: F01")).toBeInTheDocument();
    expect(
      await screen.findByText(/They can switch to any of the 75 female avatars/),
    ).toBeInTheDocument();
  });

  it("mentions the web for everyone but Staff", async () => {
    render(wrap(<DefaultAvatarCard gender="MALE" firstName="Karthik" webToo />));
    expect(
      await screen.findByText(/from the agent, the mobile app or the web\.$/),
    ).toBeInTheDocument();
  });

  it("leaves the number out until the library has answered", async () => {
    let answer: (m: ReturnType<typeof manifestFixture>) => void = () => undefined;
    (getAvatarManifest as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    render(wrap(<DefaultAvatarCard gender="MALE" firstName="Arjun" webToo={false} />));
    expect(
      screen.getByText(
        "Set from gender. Arjun can switch to any of the male avatars from the agent or the mobile app.",
      ),
    ).toBeInTheDocument();
    answer(manifestFixture());
    expect(await screen.findByText(/any of the 75 male avatars/)).toBeInTheDocument();
  });

  it("says no number if the library never answers", async () => {
    (getAvatarManifest as jest.Mock).mockRejectedValue(new Error("Down"));
    render(wrap(<DefaultAvatarCard gender="FEMALE" firstName="" webToo={false} />));
    await waitFor(() => expect(getAvatarManifest).toHaveBeenCalled());
    expect(screen.getByText(/They can switch to any of the female avatars/)).toBeInTheDocument();
  });

  it("falls back to the first name's initial when the picture does not load", async () => {
    const { container } = render(
      wrap(<DefaultAvatarCard gender="MALE" firstName="Arjun" webToo={false} />),
    );
    const image = await waitFor(() => {
      const found = container.querySelector("image");
      expect(found).not.toBeNull();
      return found!;
    });
    fireEvent.error(image);
    expect(container.querySelector('[data-part="initials"]')?.textContent).toBe("A");
  });

  it("previews the default in the icon, with the ring empty", async () => {
    const { container } = render(
      wrap(<DefaultAvatarCard gender="MALE" firstName="" webToo={false} />),
    );
    await waitFor(() =>
      expect(container.querySelector("image")?.getAttribute("href")).toContain("/M01.webp"),
    );
    expect(container.querySelector("svg")?.getAttribute("data-status")).toBe("NOT_STARTED");
    expect(container.querySelector('[data-part="ring"]')).toBeNull();
  });
});

describe("the gender filter", () => {
  it("has Male, Female and Gender not set", () => {
    expect(genderFilterOptions.map((o) => o.label)).toEqual([
      "Any gender",
      "Male",
      "Female",
      "Gender not set",
    ]);
  });

  it("sends what the API accepts, and nothing otherwise", () => {
    expect(asGenderFilter("UNSET")).toBe("UNSET");
    expect(asGenderFilter("MALE")).toBe("MALE");
    expect(asGenderFilter("")).toBeUndefined();
    expect(asGenderFilter(ANY)).toBeUndefined();
    expect(asGenderFilter("OTHER")).toBeUndefined();
  });

  it("counts as an active filter", () => {
    expect(countActiveFilters(EMPTY_MEMBER_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_MEMBER_FILTERS, gender: "UNSET" })).toBe(1);
  });
});
