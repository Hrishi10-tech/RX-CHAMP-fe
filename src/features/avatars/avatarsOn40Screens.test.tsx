import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { readDepartment } from "@/features/departments/api/departments";
import { RequestRow } from "@/features/leave/components/RequestRow";
import type { LeaveRequestView } from "@/features/leave/types";
import { readOrganisation } from "@/features/organisations/api/organisations";
import { readOverview } from "@/features/overview/api/overview";
import { readSignOutKey } from "@/features/signoutKeys/api/signoutKeys";
import { readTeamPerson } from "@/features/team/api/team";
import { WfhRequestRow } from "@/features/wfh/components/WfhBits";
import type { WfhRequestView } from "@/features/wfh/types";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn().mockResolvedValue({ version: 1, defaults: {}, avatars: [] }),
}));

const withQueries = (children: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>);

const avatarOf = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-avatar-id="${id}"]`);

// 3.6 put the avatar wherever the portal showed a person; these are 4.0's own screens,
// whose answers the 4.0 API gives an avatarId.
describe("the avatar on 4.0's own screens", () => {
  it("Organisations: the organisation's Admin", () => {
    const org = readOrganisation({
      id: "o-1",
      name: "Acme",
      admin: { id: "a-1", name: "Asha R", email: "asha@x.test", avatarId: "F07" },
    });
    expect(org?.admin?.avatarId).toBe("F07");
    expect(readOrganisation({ id: "o-1", admin: { id: "a-1" } })?.admin?.avatarId).toBeNull();
  });

  it("Departments: each manager", () => {
    const dept = readDepartment({
      id: "d-1",
      name: "Firmware",
      managers: [
        { id: "m-1", name: "Ravi K", avatarId: "M12" },
        { id: "m-2", name: "Asha P", avatarId: null },
      ],
    });
    expect(dept?.managers).toEqual([
      { id: "m-1", name: "Ravi K", avatarId: "M12" },
      { id: "m-2", name: "Asha P", avatarId: null },
    ]);
  });

  it("Sign-out keys: the people and who made the key", () => {
    const key = readSignOutKey({
      id: "k-1",
      scope: "USERS",
      users: [{ id: "u-1", name: "Arjun", avatarId: "M12" }],
      createdBy: { id: "a-1", name: "Asha R", avatarId: "F07" },
    });
    expect(key?.users[0].avatarId).toBe("M12");
    expect(key).toMatchObject({
      createdBy: "Asha R",
      createdById: "a-1",
      createdByAvatarId: "F07",
    });
  });

  it("Team: each person", () => {
    expect(readTeamPerson({ id: "u-1", name: "Arjun", avatarId: "M12" })?.avatarId).toBe("M12");
    expect(readTeamPerson({ id: "u-1", name: "Arjun" })?.avatarId).toBeNull();
  });

  it("Overview: the people an attention line names", () => {
    const view = readOverview({
      attention: [
        { kind: "NOT_STARTED", count: 1, people: [{ id: "u-1", name: "Arjun", avatarId: "M12" }] },
      ],
    });
    expect(view.attention[0].people).toEqual([{ id: "u-1", name: "Arjun", avatarId: "M12" }]);
  });

  it("Leave: an approver's request row", () => {
    const r = {
      id: "l-1",
      category: "CLSL",
      categoryLabel: "CL/SL",
      userId: "u-1",
      userName: "Arjun Mehta",
      avatarId: "M12",
      status: "PENDING",
      companyName: null,
      kind: "FULL_DAY",
      kindLabel: "Full day",
      days: 1,
      span: "Mon 9 Nov",
      daysLabel: "1 day",
      dates: [],
      reason: "",
      can: { cancel: false, decide: false, revoke: false },
    } as unknown as LeaveRequestView;
    const { container } = withQueries(<RequestRow r={r} approver />);
    expect(avatarOf(container, "M12")).not.toBeNull();
  });

  it("Work from home: an approver's request row", () => {
    const r = {
      id: "w-1",
      userId: "u-1",
      userName: "Arjun Mehta",
      avatarId: "M12",
      status: "PENDING",
      companyName: null,
      kind: "FULL_DAY",
      kindLabel: "Full day",
      days: 1,
      span: "Mon 9 Nov",
      daysLabel: "1 day",
      dates: [],
      reason: "",
      can: { cancel: false, decide: false, revoke: false },
    } as unknown as WfhRequestView;
    const { container } = withQueries(<WfhRequestRow r={r} approver />);
    expect(avatarOf(container, "M12")).not.toBeNull();
  });
});
