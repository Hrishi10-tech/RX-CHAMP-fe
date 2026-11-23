import { render, screen, within } from "@testing-library/react";

import type { Role } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { useWfhPolicy, useWfhRequests } from "@/features/wfh/hooks/useWfh";
import { WfhPage } from "@/features/wfh/components/WfhPage";
import { WfhPolicyPanel } from "@/features/wfh/components/WfhPolicyPanel";
import { WfhRequestsPanel } from "@/features/wfh/components/WfhRequestsPanel";
import type { WfhPolicyView, WfhRequestView } from "@/features/wfh/types";

// These render with their hooks mocked and no query client: the avatar reads one (3.6).
jest.mock("@/components/avatar/PersonAvatar", () => ({ PersonAvatar: () => null }));
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/wfh",
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/features/auth/hooks/useSession", () => ({ useSession: jest.fn() }));
jest.mock("@/features/organisations/hooks/useOrgsInView", () => ({ useOrgsInView: jest.fn() }));
jest.mock("@/features/settings/hooks/usePresets", () => ({ usePresetsFor: () => [] }));
jest.mock("@/features/wfh/hooks/useWfh", () => {
  const mutation = () => ({ mutateAsync: jest.fn(), reset: jest.fn(), isPending: false });
  return {
    useWfhRequests: jest.fn(),
    useWfhPolicy: jest.fn(),
    useWfhSummary: () => ({ data: { pending: 0, needsMe: 0 } }),
    useMyWfh: () => ({ isLoading: true }),
    useWfhSchedules: () => ({ isLoading: true }),
    useDecideWfh: mutation,
    useSaveWfhPolicy: mutation,
    useCancelWfh: mutation,
    useAskWfh: mutation,
    useEndWfhSchedule: mutation,
    useSkipWfhScheduleDay: mutation,
    useSaveWfhSchedule: mutation,
  };
});

const inView = (mixed: boolean) =>
  (useOrgsInView as jest.Mock).mockReturnValue({ canChoose: true, org: null, mixed });
const asRole = (role: Role) => (useSession as jest.Mock).mockReturnValue({ role, user: null });

const request: WfhRequestView = {
  id: "w1",
  userId: "u1",
  userName: "Asha Rao",
  department: "Billing",
  companyId: "org-b",
  companyName: "Org B",
  attendanceSource: "AGENT",
  kind: "HALF_DAY",
  part: "FIRST_HALF",
  kindLabel: "Half day (first half)",
  startDate: "2026-11-25",
  endDate: "2026-11-25",
  span: "Wed 25 Nov",
  days: 0.5,
  daysLabel: "0.5 day",
  dates: [{ date: "2026-11-25", label: "Wed 25 Nov", days: 0.5 }],
  partTimes: "09:30 to 14:00",
  reason: "Plumber coming",
  status: "PENDING",
  statusLabel: "Waiting for approval",
  approverRole: "MANAGER",
  waitingFor: "the Billing managers",
  decidedById: null,
  decidedByName: null,
  decidedAt: null,
  decisionNote: null,
  cancelledAt: null,
  createdAt: "2026-11-23T05:00:00.000Z",
  updatedAt: "2026-11-23T05:00:00.000Z",
  can: { cancel: false, decide: true, revoke: false },
};

const policy: WfhPolicyView = {
  enabled: true,
  noticeDays: 1,
  maxDaysPerMonth: null,
  approver: "MANAGER",
  approverLabel: "The person's manager",
  creditBasis: "SHIFT_LENGTH",
  creditBasisLabel: "The shift length",
  routes: [
    { value: "MANAGER", label: "The person's manager" },
    { value: "SUPER_MANAGER", label: "The Super Manager" },
    { value: "SUPER_ADMIN", label: "The Super Admins" },
  ],
  bases: [{ value: "SHIFT_LENGTH", label: "The shift length" }],
  bounds: {},
  rule: "Ask at least 1 day ahead. Your department's managers approve it.",
  canEdit: false,
  canRoute: false,
};

beforeEach(() => jest.clearAllMocks());

describe("Work from home requests on 4.0", () => {
  beforeEach(() => {
    (useWfhRequests as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: [request], summary: { pending: 1, needsMe: 1 } },
    });
  });

  it("names each row's organisation on All organisations", () => {
    inView(true);
    render(<WfhRequestsPanel />);
    const requests = screen.getByRole("region", { name: "Requests" });
    expect(within(requests).getByTitle("Organisation: Org B")).toBeInTheDocument();
    const home = screen.getByRole("region", { name: /At home in the next two weeks/ });
    expect(within(home).getByTitle("Organisation: Org B")).toBeInTheDocument();
  });

  it("shows no organisation inside one, and part days on the 12 hour clock", () => {
    inView(false);
    render(<WfhRequestsPanel />);
    expect(screen.queryByTitle("Organisation: Org B")).not.toBeInTheDocument();
    expect(screen.getByText(/9:30 AM to 2:00 PM/)).toBeInTheDocument();
    expect(screen.queryByText(/09:30/)).not.toBeInTheDocument();
  });

  it("asks without the 3.5 manager filter; the organisation travels as X-Org-Id", () => {
    inView(true);
    render(<WfhRequestsPanel />);
    for (const [params] of (useWfhRequests as jest.Mock).mock.calls) {
      expect(params).not.toHaveProperty("managerId");
      expect(params.companyId).toBeUndefined();
    }
  });
});

describe("The work-from-home policy on 4.0", () => {
  it("is per organisation: on All organisations it asks for one instead of loading", () => {
    inView(true);
    (useWfhPolicy as jest.Mock).mockReturnValue({ isLoading: false, isError: false });
    render(<WfhPolicyPanel />);
    expect(useWfhPolicy).toHaveBeenCalledWith(false);
    expect(screen.getByText("Each organisation has its own policy")).toBeInTheDocument();
  });

  it("is read-only for the Super Manager, in the organisation admin's words", () => {
    inView(false);
    (useWfhPolicy as jest.Mock).mockReturnValue({ isLoading: false, isError: false, data: policy });
    render(<WfhPolicyPanel />);
    expect(screen.getByText(/Only the organisation admin changes it\./)).toBeInTheDocument();
    expect(screen.getByText(/Staff go to their department's managers/)).toBeInTheDocument();
    expect(screen.getByText(/Set by the organisation admin\./)).toBeInTheDocument();
    expect(screen.queryByText(/Super Admin and the Super Manager/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save policy" })).not.toBeInTheDocument();
  });
});

describe("Work from home tabs by 4.0 role", () => {
  it.each([
    ["MANAGER", ["My work from home", "Requests", "Schedules"]],
    ["ADMIN", ["My work from home", "Requests", "Schedules", "Policy"]],
    ["SUPER_MANAGER", ["My work from home", "Requests", "Schedules", "Policy"]],
  ] as [Role, string[]][])("%s sees %j", (role, tabs) => {
    asRole(role);
    inView(false);
    render(<WfhPage />);
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.trim())).toEqual(tabs);
  });
});
