import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

import { AttendancePage } from "./AttendancePage";
import * as api from "@/features/attendance/api/attendance";
import type {
  BiometricSettingsView,
  BiometricStatusView,
  PersonAttendanceView,
  PunchView,
} from "@/features/attendance/types";

jest.mock("@/features/attendance/api/attendance", () => ({
  getAttendanceStatus: jest.fn(),
  getAttendancePeople: jest.fn(),
  getPunches: jest.fn(),
  getUnmatchedCodes: jest.fn(),
  getDevices: jest.fn(),
  getKeys: jest.fn(),
  getBiometricSettings: jest.fn(),
  patchBiometricSettings: jest.fn(),
}));

/** The organisation in view (4.0): a Super Admin acts in one she picked. */
const inView = {
  canChoose: false,
  org: null as { id: string; name: string } | null,
  mixed: false,
};
jest.mock("@/features/organisations/hooks/useOrgsInView", () => ({
  useOrgsInView: () => inView,
}));

const session = { role: "SUPER_MANAGER" as string, me: null as unknown };
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => ({ role: session.role, me: session.me }),
}));

let search = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/dashboard/attendance",
  useSearchParams: () => search,
}));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;

const STATUS: BiometricStatusView = {
  keys: { active: 1, total: 1 },
  lastPunchAt: "2026-11-04T03:32:00Z",
  lastReceivedAt: "2026-11-04T03:32:05Z",
  punchesToday: 3,
  unmatchedCodes: 0,
  people: { biometric: 1, agent: 1, withoutCode: 0 },
  pull: {
    enabled: false,
    preset: "GENERIC",
    lastRunAt: null,
    lastOkAt: null,
    lastError: null,
    lastCount: 0,
    cursor: null,
  },
  pushPath: "/api/v1/biometric/punches",
};

const PEOPLE: PersonAttendanceView[] = [
  {
    userId: "u1",
    name: "Asha Rao",
    email: "asha@example.com",
    role: "USER",
    department: "Support",
    companyId: "c1",
    companyName: "Acme",
    attendanceSource: "BIOMETRIC",
    biometricCode: "E1042",
    attendanceSourceFrom: "2026-11-01",
    lastPunchAt: "2026-11-04T03:32:00Z",
  },
];

const PUNCH: PunchView = {
  id: "p1",
  code: "E1042",
  // 9:02 AM in Kolkata.
  punchedAt: "2026-11-04T03:32:00Z",
  direction: "IN",
  deviceId: "GATE-1",
  source: "PUSH",
  userId: "u1",
  userName: "Asha Rao",
  dayKey: "2026-11-04",
  note: null,
  addedBy: null,
  lockedOut: false,
  voided: false,
  voidedAt: null,
  voidedBy: null,
  voidReason: null,
  receivedAt: "2026-11-04T03:32:05Z",
};

const SETTINGS: BiometricSettingsView = {
  gapRule: "SPAN",
  missingCheckout: "LAST_PUNCH",
  duplicateWindowSec: 60,
  pushInWords: [],
  pushOutWords: [],
  pull: {
    enabled: false,
    preset: "GENERIC",
    url: "",
    authType: "NONE",
    authHeader: "",
    username: "",
    loginUrl: "",
    tokenPath: "token",
    tokenScheme: "Token",
    sinceParam: "start_time",
    untilParam: "end_time",
    queryTimeFormat: "LOCAL",
    listPath: "data",
    nextPath: "next",
    fields: { code: "emp_code", time: "punch_time", direction: "", deviceId: "", externalId: "" },
    timeFormat: "AUTO",
    inWords: [],
    outWords: [],
    everyMin: 5,
    overlapMin: 30,
  },
  secretSet: false,
  passwordSet: false,
  bounds: { duplicateWindowSec: { min: 0, max: 600 } },
  integrationOn: false,
  integrationPeriods: [],
};

function renderPage(role: string, tab?: string) {
  session.role = role;
  search = new URLSearchParams(tab ? { tab } : {});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AttendancePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(inView, { canChoose: false, org: null, mixed: false });
  mocked.getAttendanceStatus.mockResolvedValue(STATUS);
  mocked.getAttendancePeople.mockResolvedValue(PEOPLE);
  mocked.getPunches.mockResolvedValue({ items: [PUNCH], total: 1 });
  mocked.getUnmatchedCodes.mockResolvedValue([]);
  mocked.getDevices.mockResolvedValue([]);
  mocked.getKeys.mockResolvedValue([]);
  mocked.getBiometricSettings.mockResolvedValue(SETTINGS);
});

describe("4.0 Attendance: the Super Manager reads", () => {
  it("says what she may do and offers no change on People", async () => {
    renderPage("SUPER_MANAGER");
    expect(await screen.findAllByText("Asha Rao")).not.toHaveLength(0);
    expect(screen.getByRole("note")).toHaveTextContent("add or void punches");
    expect(screen.queryByRole("button", { name: /Change how/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Pick/ })).not.toBeInTheDocument();
    // 4.0: the people are the organisation's in view; no companyId is sent.
    expect(mocked.getAttendancePeople).toHaveBeenCalledWith({
      search: undefined,
      source: undefined,
    });
    // The department, as the API names it.
    expect(screen.getAllByText("Support")).not.toHaveLength(0);
  });

  it("adds and voids punches, on the 12 hour clock", async () => {
    renderPage("SUPER_MANAGER", "punches");
    expect(await screen.findAllByText(/4 Nov 9:02 AM/)).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Add punch" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Void" })).not.toHaveLength(0);
  });

  it("sees the integration without keys or pull controls", async () => {
    renderPage("SUPER_MANAGER", "integration");
    expect(
      await screen.findByText("The organisation admin makes and revokes keys."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Make a key/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Test connection/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pull now/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save pull settings/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Import a CSV export")).not.toBeInTheDocument();
    // The API refuses her the keys, so they are never asked for.
    expect(mocked.getKeys).not.toHaveBeenCalled();
  });

  it("reads the settings, unchangeable", async () => {
    renderPage("SUPER_MANAGER", "settings");
    expect(await screen.findByText(/Only the organisation admin changes them/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Duplicate punches within/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save settings" })).not.toBeInTheDocument();
  });
});

describe("4.0 Attendance: the organisation admin changes", () => {
  it("sets who checks in how", async () => {
    renderPage("ADMIN");
    expect(
      await screen.findAllByRole("button", { name: "Change how Asha Rao checks in" }),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("makes keys, runs the pull and imports", async () => {
    renderPage("ADMIN", "integration");
    expect(await screen.findByRole("button", { name: /Make a key/ })).toBeInTheDocument();
    expect(screen.getByText("Import a CSV export")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Test connection/ })).toBeInTheDocument();
    expect(mocked.getKeys).toHaveBeenCalled();
    // 4.0: the portal proxies /api, so the push address is this site's.
    expect(
      screen.getByText(`POST ${window.location.origin}/api/v1/biometric/punches`),
    ).toBeInTheDocument();
  });
});

describe("3.6 the integration switch, by role", () => {
  it("the organisation admin has the switch", async () => {
    renderPage("ADMIN", "integration");
    expect(await screen.findByRole("button", { name: "Switch on" })).toBeInTheDocument();
  });

  it("a Super Admin acting in an organisation has its switch", async () => {
    Object.assign(inView, { canChoose: true, org: { id: "c1", name: "Acme" }, mixed: false });
    renderPage("SUPER_ADMIN", "integration");
    expect(await screen.findByRole("button", { name: "Switch on" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /biometric integration/i })).toHaveTextContent(
      "Off for Acme.",
    );
  });

  it("the Super Manager reads it and has no switch", async () => {
    Object.assign(inView, { canChoose: true, org: { id: "c1", name: "Acme" }, mixed: false });
    renderPage("SUPER_MANAGER", "integration");
    await waitFor(() => expect(mocked.getBiometricSettings).toHaveBeenCalled());
    expect(
      await screen.findByRole("region", { name: /biometric integration/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch o/i })).not.toBeInTheDocument();
  });

  it("a Manager has no switch", async () => {
    renderPage("MANAGER", "integration");
    expect(
      await screen.findByRole("region", { name: /biometric integration/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch o/i })).not.toBeInTheDocument();
  });
});
