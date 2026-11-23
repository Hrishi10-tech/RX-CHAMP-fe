import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getAvatarManifest } from "@/features/avatars/api/avatars";
import { manifestFixture } from "@/features/avatars/lib/manifestFixture";
import { createUser } from "@/features/users/api/createUser";
import { createSuperManager } from "@/features/users/api/superManagers";
import { updateUser } from "@/features/users/api/updateUser";
import type { TeamMember } from "@/types";

import { MemberFormDialog } from "./MemberFormDialog";

jest.mock("@/features/avatars/api/avatars", () => ({
  ...jest.requireActual("@/features/avatars/api/avatars"),
  getAvatarManifest: jest.fn(),
}));
jest.mock("@/features/users/api/createUser", () => ({ createUser: jest.fn() }));
jest.mock("@/features/users/api/updateUser", () => ({ updateUser: jest.fn() }));
jest.mock("@/features/users/api/superManagers", () => ({ createSuperManager: jest.fn() }));
jest.mock("@/features/departments/hooks/useDepartments", () => ({
  useDepartments: () => ({
    data: [{ id: "d-1", name: "Firmware", icon: "cpu", staffCount: 0, managers: [] }],
  }),
}));
jest.mock("@/features/shifts/hooks/useShifts", () => ({ useShifts: () => ({ data: [] }) }));
jest.mock("@/features/departments/components/DepartmentPicker", () => ({
  DepartmentPicker: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <button type="button" onClick={() => onChange(["d-1"])}>
      Pick Firmware
    </button>
  ),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockSession = { role: "ADMIN", id: "admin" };
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({
    user: { id: mockSession.id, email: "a@x.test" },
    role: mockSession.role,
    ready: true,
    logout: jest.fn(),
  }),
}));

const staff: TeamMember = {
  id: "u-1",
  name: "Arjun Mehta",
  firstName: "Arjun",
  lastName: "Mehta",
  email: "arjun@x.test",
  role: "USER",
  designation: "Engineer",
  department: { id: "d-1", name: "Firmware", icon: "cpu" },
  departments: [{ id: "d-1", name: "Firmware", icon: "cpu" }],
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
  gender: "MALE",
};

function open(member: TeamMember | null, roles?: ("USER" | "MANAGER" | "SUPER_MANAGER")[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemberFormDialog
        open
        member={member}
        roles={roles}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />
    </QueryClientProvider>,
  );
}

function fillPerson() {
  const field = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  field("First name", "Meera");
  field("Last name", "Nair");
  field("Email", "meera@x.test");
  field("Password", "S3cure!pass12");
  fireEvent.click(screen.getByRole("button", { name: "Pick Firmware" }));
}

const genderGroup = () => screen.queryByRole("radiogroup", { name: "Gender" });
const submit = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("Add member: gender (3.6; 4.0: the organisation admin or a Super Admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.role = "ADMIN";
    mockSession.id = "admin";
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    (createUser as jest.Mock).mockResolvedValue({ id: "new" });
  });

  it("the organisation admin must choose: the message, and nothing is sent", async () => {
    open(null);
    fillPerson();
    // Past the dialog's own first focus.
    await new Promise((resolve) => setTimeout(resolve, 50));
    submit("Add member");
    expect(await screen.findByText("Select male or female.")).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Male" }));
  });

  it("sends the gender chosen and shows the default it gives", async () => {
    open(null);
    fillPerson();
    fireEvent.click(screen.getByRole("radio", { name: "Female" }));
    expect(await screen.findByText("Default avatar: F01")).toBeInTheDocument();
    submit("Add member");
    await waitFor(() => expect(createUser).toHaveBeenCalled());
    expect((createUser as jest.Mock).mock.calls[0][0]).toMatchObject({
      firstName: "Meera",
      gender: "FEMALE",
    });
  });

  it("a Super Admin is asked too", () => {
    mockSession.role = "SUPER_ADMIN";
    open(null);
    expect(genderGroup()).not.toBeNull();
  });

  it("the Super Manager adds Staff without it (the organisation admin sets it later)", async () => {
    mockSession.role = "SUPER_MANAGER";
    open(null, ["USER"]);
    expect(genderGroup()).toBeNull();
    fillPerson();
    submit("Add member");
    await waitFor(() => expect(createUser).toHaveBeenCalled());
    expect((createUser as jest.Mock).mock.calls[0][0]).not.toHaveProperty("gender");
  });

  it("a new Super Manager has none here (POST /super-managers takes no gender)", async () => {
    mockSession.role = "SUPER_ADMIN";
    (createSuperManager as jest.Mock).mockResolvedValue({ id: "sm" });
    open(null, ["SUPER_MANAGER"]);
    expect(genderGroup()).toBeNull();
  });
});

describe("Edit member: gender", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.role = "ADMIN";
    mockSession.id = "admin";
    (getAvatarManifest as jest.Mock).mockResolvedValue(manifestFixture());
    (updateUser as jest.Mock).mockResolvedValue({ id: "u-1" });
  });

  it("shows the organisation admin the current one", () => {
    open(staff);
    expect(screen.getByRole("radio", { name: "Male" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Decides which avatars they can choose from.")).toBeInTheDocument();
  });

  it("says the avatar goes back to the new default on a change, and sends it", async () => {
    open(staff);
    fireEvent.click(screen.getByRole("radio", { name: "Female" }));
    expect(
      await screen.findByText("Their avatar goes back to the new default, F01, when you save."),
    ).toBeInTheDocument();
    submit("Save changes");
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect((updateUser as jest.Mock).mock.calls[0][1]).toMatchObject({ gender: "FEMALE" });
  });

  it("sends no gender when it did not change", async () => {
    open(staff);
    submit("Save changes");
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect((updateUser as jest.Mock).mock.calls[0][1]).not.toHaveProperty("gender");
  });

  it("explains what happens for someone with none yet", () => {
    open({ ...staff, gender: null, avatarId: null });
    expect(
      screen.getByText("Not set yet. They show initials until you pick one."),
    ).toBeInTheDocument();
  });

  it.each(["SUPER_MANAGER", "MANAGER"])("is not there for a %s", (role) => {
    mockSession.role = role;
    open({ ...staff, gender: undefined });
    expect(genderGroup()).toBeNull();
  });

  it("a Super Admin sets an organisation's Admin's (details only otherwise)", async () => {
    mockSession.role = "SUPER_ADMIN";
    mockSession.id = "sa";
    open({ ...staff, id: "a-1", role: "ADMIN", gender: null });
    fireEvent.click(screen.getByRole("radio", { name: "Male" }));
    submit("Save changes");
    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    const [id, body] = (updateUser as jest.Mock).mock.calls[0];
    expect(id).toBe("a-1");
    expect(body).toMatchObject({ gender: "MALE" });
    expect(body).not.toHaveProperty("role");
  });

  it("an Admin never sets another Admin's", () => {
    open({ ...staff, id: "a-2", role: "ADMIN", gender: undefined });
    expect(genderGroup()).toBeNull();
  });
});
