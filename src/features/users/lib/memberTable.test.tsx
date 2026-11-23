import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { User } from "@/features/users/types";

import { mapUserToMember, memberColumns } from "./memberTable";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn().mockResolvedValue({ version: 1, defaults: {}, avatars: [] }),
}));

const withQueries = (children: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe("the member table's first column", () => {
  const nameColumn = memberColumns[0];

  it.each([
    ["M12", "M12"],
    [null, null],
  ])("carries the avatar the API sent: %s", (avatarId, shown) => {
    const member = mapUserToMember({
      id: "u-1",
      name: "Arjun Mehta",
      email: "arjun@x.test",
      avatarId,
    } as User);
    const { container } = render(withQueries(nameColumn.render!(member, 0)));
    const avatar = container.querySelector('[data-part="bezel"]');
    expect(avatar).not.toBeNull();
    expect(avatar?.getAttribute("data-avatar-id")).toBe(shown);
  });
});

describe("the gender on a member row (4.0)", () => {
  it("is kept when the API sent it to someone who may set it", () => {
    const m = mapUserToMember({ id: "u-1", name: "A", gender: "FEMALE" } as User);
    expect(m.gender).toBe("FEMALE");
  });

  it("stays absent when the API left it out", () => {
    const m = mapUserToMember({ id: "u-1", name: "A" } as User);
    expect(m).not.toHaveProperty("gender");
  });
});
