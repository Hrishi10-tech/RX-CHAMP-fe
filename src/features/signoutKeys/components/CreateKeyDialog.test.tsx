import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CreateKeyDialog } from "./CreateKeyDialog";
import { scopeText } from "./SignOutKeysView";
import * as keysApi from "@/features/signoutKeys/api/signoutKeys";
import { readSignOutKey } from "@/features/signoutKeys/api/signoutKeys";
import * as usersApi from "@/features/users/api/getUsers";
import * as deptApi from "@/features/departments/api/departments";

jest.mock("@/features/signoutKeys/api/signoutKeys", () => ({
  ...jest.requireActual("@/features/signoutKeys/api/signoutKeys"),
  createSignOutKey: jest.fn(),
}));
jest.mock("@/features/users/api/getUsers", () => ({ getUsers: jest.fn() }));
jest.mock("@/features/departments/api/departments", () => ({ getDepartments: jest.fn() }));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const createKey = keysApi.createSignOutKey as jest.Mock;
const PHRASE = "amber orbit cedar river lamp 42";

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open again
      </button>
      <CreateKeyDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (usersApi.getUsers as jest.Mock).mockResolvedValue({
    users: [
      { id: "u1", name: "Asha K" },
      { id: "u2", name: "Bala R" },
    ],
  });
  (deptApi.getDepartments as jest.Mock).mockResolvedValue([
    { id: "d1", name: "Hardware", icon: "cpu", staffCount: 3, managers: [], idle: {} },
  ]);
  createKey.mockResolvedValue({ id: "k1", phrase: PHRASE, expiresAt: "2026-10-20T09:35:00.000Z" });
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
});

describe("CreateKeyDialog (SPEC 2.8)", () => {
  it("needs someone in scope before it creates a people key", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: /Create key/ }));
    expect(screen.getByText("Pick at least one person.")).toBeInTheDocument();
    expect(createKey).not.toHaveBeenCalled();
  });

  it("creates a key for the people picked and shows the phrase once, with Copy and expiry", async () => {
    renderDialog();
    await userEvent.click(await screen.findByRole("checkbox", { name: /Asha K/ }));
    await userEvent.click(screen.getByRole("button", { name: /Create key/ }));
    await waitFor(() =>
      expect(createKey).toHaveBeenCalledWith({
        scope: "USERS",
        userIds: ["u1"],
        departmentIds: [],
      }),
    );
    expect(await screen.findByTestId("signout-phrase")).toHaveTextContent(PHRASE);
    expect(screen.getByText(/only time the key is shown/)).toBeInTheDocument();
    // 9:35 UTC is 3:05 PM in the business zone.
    expect(screen.getByText(/Tue 20 Oct, 3:05 PM/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PHRASE);

    // Closed and opened again: the phrase is gone for good.
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByRole("button", { name: "Open again" }));
    expect(screen.queryByText(PHRASE)).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /People/ })).toHaveAttribute("aria-checked", "true");
  });

  it("scopes a key to departments or the whole organisation", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("radio", { name: /Departments/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: /Hardware/ }));
    await userEvent.click(screen.getByRole("button", { name: /Create key/ }));
    await waitFor(() =>
      expect(createKey).toHaveBeenLastCalledWith({
        scope: "DEPARTMENTS",
        userIds: [],
        departmentIds: ["d1"],
      }),
    );
  });

  it("warns before an organisation-wide key", async () => {
    renderDialog();
    await userEvent.click(screen.getByRole("radio", { name: /Organisation/ }));
    expect(screen.getByText(/Anyone in the organisation/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Create key/ }));
    await waitFor(() =>
      expect(createKey).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "ORG" })),
    );
  });

  it("shows the server's reason when it refuses", async () => {
    createKey.mockRejectedValueOnce(new Error("Pick people in your organisation"));
    renderDialog();
    await userEvent.click(screen.getByRole("radio", { name: /Organisation/ }));
    await userEvent.click(screen.getByRole("button", { name: /Create key/ }));
    expect(await screen.findByText("Pick people in your organisation")).toBeInTheDocument();
  });
});

describe("the keys list", () => {
  it("reads a key and says who can use it", () => {
    const key = readSignOutKey({
      id: "k1",
      scope: "USERS",
      users: [
        { id: "u1", name: "Asha K" },
        { id: "u2", name: "Bala R" },
        { id: "u3", name: "Chitra S" },
        { id: "u4", name: "Dev M" },
      ],
      createdBy: { id: "a1", name: "Admin" },
      createdAt: "2026-10-19T09:35:00.000Z",
      expiresAt: "2099-10-20T09:35:00.000Z",
      revokedAt: null,
      uses: 1,
    });
    expect(key?.active).toBe(true);
    expect(key?.createdBy).toBe("Admin");
    expect(key && scopeText(key)).toBe("Asha K, Bala R, Chitra S and 1 more");
    expect(scopeText({ scope: "ORG", users: [], departments: [] })).toBe(
      "Everyone in the organisation",
    );
  });
});
