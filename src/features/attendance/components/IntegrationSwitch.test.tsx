import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IntegrationSwitchSection } from "./IntegrationPanel";
import * as api from "@/features/attendance/api/attendance";
import { reportKeys } from "@/features/reports/api/keys";
import type { BiometricSettingsView } from "@/features/attendance/types";

jest.mock("@/features/attendance/api/attendance");
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

/** 4.0: the switch is the organisation's in view. */
const inView = {
  canChoose: false,
  org: null as { id: string; name: string } | null,
  mixed: false,
};
jest.mock("@/features/organisations/hooks/useOrgsInView", () => ({
  useOrgsInView: () => inView,
}));

const mocked = api as jest.Mocked<typeof api>;

function settings(patch: Partial<BiometricSettingsView> = {}): BiometricSettingsView {
  return {
    gapRule: "SPAN",
    missingCheckout: "LAST_PUNCH",
    duplicateWindowSec: 60,
    pushInWords: [],
    pushOutWords: [],
    pull: {} as BiometricSettingsView["pull"],
    secretSet: false,
    passwordSet: false,
    bounds: {},
    integrationOn: false,
    integrationPeriods: [],
    ...patch,
  };
}

function show(view: BiometricSettingsView, canEdit: boolean, client = newClient()) {
  return render(
    <QueryClientProvider client={client}>
      <IntegrationSwitchSection settings={view} canEdit={canEdit} />
    </QueryClientProvider>,
  );
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const onPeriod = {
  fromDate: "2026-11-05",
  toDate: null,
  startedAt: "2026-11-05T06:00:00.000Z",
  endedAt: null,
  startedByName: "Meera Nair",
  endedByName: null,
};
const pastPeriod = {
  fromDate: "2026-09-01",
  toDate: "2026-09-10",
  startedAt: "2026-09-01T04:00:00.000Z",
  endedAt: "2026-09-10T04:00:00.000Z",
  startedByName: "Meera Nair",
  endedByName: "Arjun Rao",
};

describe("the integration switch (3.6)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(inView, { canChoose: false, org: null, mixed: false });
  });

  it("off: says what that means for payroll, with the exact label", () => {
    show(settings(), true);
    const section = screen.getByRole("region", { name: /biometric integration/i });
    expect(within(section).getByText("Off")).toBeInTheDocument();
    expect(section).toHaveTextContent("Payroll paused · biometric integration pending");
    expect(within(section).getByText("It has not been on yet.")).toBeInTheDocument();
  });

  it("the organisation admin switches it on, after saying earlier days stay paused", async () => {
    const user = userEvent.setup();
    mocked.patchBiometricSettings.mockResolvedValue({
      settings: settings({ integrationOn: true, integrationPeriods: [onPeriod] }),
      changed: ["integrationOn"],
    });
    show(settings(), true);
    await user.click(screen.getByRole("button", { name: "Switch on" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Earlier days stay paused");
    await user.click(within(dialog).getByRole("button", { name: "Switch on" }));
    await waitFor(() =>
      expect(mocked.patchBiometricSettings).toHaveBeenCalledWith({ integrationOn: true }),
    );
  });

  it("on: she can switch it off, and the history shows both stretches", async () => {
    const user = userEvent.setup();
    mocked.patchBiometricSettings.mockResolvedValue({
      settings: settings(),
      changed: ["integrationOn"],
    });
    show(settings({ integrationOn: true, integrationPeriods: [onPeriod, pastPeriod] }), true);
    const section = screen.getByRole("region", { name: /biometric integration/i });
    expect(within(section).getByText("On")).toBeInTheDocument();
    expect(within(section).getAllByText("Meera Nair").length).toBeGreaterThan(0);
    expect(within(section).getByText("Arjun Rao")).toBeInTheDocument();
    expect(within(section).getByText("Still on")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Switch off" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Switch off" }));
    await waitFor(() =>
      expect(mocked.patchBiometricSettings).toHaveBeenCalledWith({ integrationOn: false }),
    );
  });

  it("switching reads every report again: it decides which days payroll counts", async () => {
    const user = userEvent.setup();
    mocked.patchBiometricSettings.mockResolvedValue({
      settings: settings({ integrationOn: true }),
      changed: ["integrationOn"],
    });
    const client = newClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    show(settings(), true, client);
    await user.click(screen.getByRole("button", { name: "Switch on" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Switch on" }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: reportKeys.all }));
  });

  it("anyone else reads it and has no switch", () => {
    show(settings({ integrationOn: true, integrationPeriods: [onPeriod] }), false);
    expect(screen.queryByRole("button", { name: /switch/i })).not.toBeInTheDocument();
    expect(screen.getByText("On")).toBeInTheDocument();
  });
});

describe("4.0: one switch per organisation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(inView, { canChoose: false, org: null, mixed: false });
  });

  it("names the organisation a Super Admin is acting in, and lets her switch it", () => {
    Object.assign(inView, { canChoose: true, org: { id: "c1", name: "Acme" }, mixed: false });
    show(settings(), true);
    const section = screen.getByRole("region", { name: /biometric integration/i });
    expect(section).toHaveTextContent("Off for Acme.");
    expect(within(section).getByRole("button", { name: "Switch on" })).toBeInTheDocument();
  });

  it("on All organisations there is no one switch: it asks for an organisation", () => {
    Object.assign(inView, { canChoose: true, org: null, mixed: true });
    show(settings({ integrationOn: true, integrationPeriods: [onPeriod] }), true);
    const section = screen.getByRole("region", { name: /biometric integration/i });
    expect(section).toHaveTextContent("Pick an organisation");
    expect(within(section).queryByRole("button")).not.toBeInTheDocument();
    expect(within(section).queryByText("On")).not.toBeInTheDocument();
  });

  it("a reader is told the organisation admin switches it", () => {
    show(settings(), false);
    expect(
      screen.getByText("The organisation admin switches it on once the device is connected."),
    ).toBeInTheDocument();
  });
});
