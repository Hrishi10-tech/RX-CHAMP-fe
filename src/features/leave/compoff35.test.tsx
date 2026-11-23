import { render, screen } from "@testing-library/react";

import type { Role } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { useOrgsInView } from "@/features/organisations/hooks/useOrgsInView";
import { usePeopleOptions } from "@/features/users/hooks/usePeopleOptions";
import { useCompOffClaims } from "@/features/leave/hooks/useLeave";
import {
  canCreditCompOff,
  compOffPickable,
  defaultCompOffPart,
  policyLockNote,
  whenText,
} from "@/features/leave/lib/compoff";
import { partTimesText } from "@/features/leave/lib/format";
import type { CompOffCreditView } from "@/features/leave/types";
import { CompOffClaimsPanel, decisionLine } from "@/features/leave/components/CompOffPanel";

jest.mock("@/features/auth/hooks/useSession", () => ({ useSession: jest.fn() }));
jest.mock("@/features/organisations/hooks/useOrgsInView", () => ({ useOrgsInView: jest.fn() }));
jest.mock("@/features/users/hooks/usePeopleOptions", () => ({ usePeopleOptions: jest.fn() }));
jest.mock("@/features/settings/hooks/usePresets", () => ({ usePresetsFor: () => [] }));
jest.mock("@/features/leave/hooks/useLeave", () => {
  const mutation = () => ({ mutateAsync: jest.fn(), reset: jest.fn(), isPending: false });
  return {
    useCompOffClaims: jest.fn(),
    usePersonCompOff: () => ({ isLoading: true }),
    useCompOffSummary: () => ({ data: { pending: 0, needsMe: 0 } }),
    useMyCompOff: () => ({ isLoading: true }),
    useCancelCompOffClaim: mutation,
    useClaimCompOff: mutation,
    useDecideCompOff: mutation,
    useGrantCompOff: mutation,
  };
});

const credit: CompOffCreditView = {
  id: "c1",
  userId: "u1",
  userName: "Asha Rao",
  department: "Billing",
  companyName: "Org B",
  workedDate: "2026-11-01",
  workedLabel: "Sun 1 Nov",
  dayKind: "WEEKLY_OFF",
  dayLabel: "Sunday",
  workedSec: 28_800,
  workedTime: "8h",
  askedDays: 1,
  days: 1,
  daysLabel: "1 day",
  reason: "Quarter-end close",
  source: "CLAIM",
  status: "PENDING",
  statusLabel: "Waiting for approval",
  waitingFor: "the department's managers",
  decidedByName: null,
  decidedAt: null,
  decisionNote: null,
  expiresOn: null,
  expiresLabel: null,
  usedDays: 0,
  heldDays: 0,
  leftDays: 0,
  lapsedDays: 0,
  createdAt: "2026-11-03T10:35:00.000Z",
  can: { cancel: false, decide: true, revoke: false },
};

function viewer(role: Role | null, mixed = false) {
  (useSession as jest.Mock).mockReturnValue({ role, user: { id: "me" } });
  (useOrgsInView as jest.Mock).mockReturnValue({ canChoose: mixed, org: null, mixed });
  (usePeopleOptions as jest.Mock).mockReturnValue({
    options: [],
    people: [],
    isLoading: false,
    isError: false,
  });
  (useCompOffClaims as jest.Mock).mockReturnValue({
    data: { items: [credit], summary: { pending: 1, needsMe: 1 } },
    isLoading: false,
    isError: false,
  });
}

describe("3.5 comp off on 4.0: who credits, who can be picked", () => {
  it("every portal role credits by hand; Staff never use the portal", () => {
    for (const role of ["SUPER_ADMIN", "SUPER_MANAGER", "ADMIN", "MANAGER"] as Role[]) {
      expect([role, canCreditCompOff(role)]).toEqual([role, true]);
    }
    expect(canCreditCompOff("USER")).toBe(false);
    expect(canCreditCompOff(null)).toBe(false);
  });

  it("a Manager picks Staff of their departments; nobody picks themselves or a platform role", () => {
    expect(compOffPickable("MANAGER", "me", { id: "a", role: "USER" })).toBe(true);
    expect(compOffPickable("MANAGER", "me", { id: "a", role: "MANAGER" })).toBe(false);
    // A Manager's users list may leave the role out: it is already their Staff.
    expect(compOffPickable("MANAGER", "me", { id: "a" })).toBe(true);
    expect(compOffPickable("ADMIN", "me", { id: "a", role: "MANAGER" })).toBe(true);
    expect(compOffPickable("ADMIN", "me", { id: "me", role: "ADMIN" })).toBe(false);
    expect(compOffPickable("SUPER_ADMIN", "me", { id: "a", role: "SUPER_MANAGER" })).toBe(false);
    expect(compOffPickable("ADMIN", "me", { id: "a", role: "SUPER_ADMIN" })).toBe(false);
  });

  it("the tab opens on the claims only when some wait on the caller", () => {
    expect(defaultCompOffPart(true, 2)).toBe("claims");
    expect(defaultCompOffPart(true, 0)).toBe("mine");
    expect(defaultCompOffPart(false, 2)).toBe("mine");
  });

  it("the policy is the organisation admin's; a Super Admin picks the organisation first", () => {
    expect(policyLockNote("ADMIN", true, false)).toBe("");
    expect(policyLockNote("SUPER_ADMIN", false, true)).toMatch(/Pick an organisation/);
    expect(policyLockNote("MANAGER", false, false)).toBe("Only the organisation admin changes it.");
    expect(policyLockNote("SUPER_MANAGER", false, true)).toBe(
      "Only the organisation admin changes it.",
    );
  });
});

describe("3.5 comp off on 4.0: times on the 12 hour clock", () => {
  it("names when a claim was made or decided, in the business zone", () => {
    expect(whenText("2026-11-03T10:35:00.000Z")).toBe("3 Nov, 4:05 PM");
    expect(whenText(null)).toBe("");
    expect(whenText("nonsense")).toBe("");
    expect(
      decisionLine({
        ...credit,
        status: "APPROVED",
        source: "GRANT",
        decidedByName: "Ravi Iyer",
        decidedAt: "2026-11-04T03:30:00.000Z",
      }),
    ).toBe("Credited by Ravi Iyer, 4 Nov, 9:00 AM");
    expect(decisionLine(credit)).toBeNull();
  });
});

describe("3.5 comp off on 4.0: the claims panel", () => {
  it("on All organisations each claim names its organisation", () => {
    viewer("SUPER_ADMIN", true);
    render(<CompOffClaimsPanel />);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Org B")).toBeInTheDocument();
    expect(screen.getByText(/Claimed 3 Nov, 4:05 PM/)).toBeInTheDocument();
  });

  it("inside one organisation the chip is left out", () => {
    viewer("ADMIN", false);
    render(<CompOffClaimsPanel />);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.queryByText("Org B")).not.toBeInTheDocument();
  });

  it("a department manager decides and credits by hand", () => {
    viewer("MANAGER");
    render(<CompOffClaimsPanel />);
    expect(screen.getByRole("button", { name: /Credit comp off/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/ })).toBeInTheDocument();
  });

  it("without a portal role there is no credit by hand", () => {
    viewer("USER");
    render(<CompOffClaimsPanel />);
    expect(screen.queryByRole("button", { name: /Credit comp off/ })).not.toBeInTheDocument();
  });
});

describe("4.0 leave: part days on the 12 hour clock", () => {
  it("reads the API's 24 hour span on the 12 hour clock", () => {
    expect(partTimesText("09:30 to 14:00")).toBe("9:30 AM to 2:00 PM");
    expect(partTimesText("13:00 to 00:00")).toBe("1:00 PM to 12:00 AM");
    expect(partTimesText(null)).toBe("");
    expect(partTimesText("morning")).toBe("morning");
  });
});
