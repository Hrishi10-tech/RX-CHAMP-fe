import { render, screen, within } from "@testing-library/react";

import { MonthlyRuns } from "./MonthlyRuns";
import { PersonDayView } from "./PersonDayView";
import { PersonMonthView } from "./PersonMonthView";
import { ReportsHome } from "./ReportsHome";
import { TeamDayView } from "./TeamDayView";
import { TeamMonthView } from "./TeamMonthView";
import * as hooks from "@/features/reports/hooks/useReports";
import { ALL_GRANTS, NO_GRANTS, type Grants } from "@/constants/roles";
import type {
  MonthTotals,
  PersonDayReport,
  PersonDaySummary,
  PersonMonthReport,
  PersonPayroll,
  ReportPerson,
  TeamMonthReport,
  TeamMonthRow,
} from "@/features/reports/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/dashboard/reports",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
/** A Manager of the department; 4.0: with or without the activity grant. */
const session: { role: string; me: null; grants: Grants } = {
  role: "MANAGER",
  me: null,
  grants: ALL_GRANTS,
};
jest.mock("@/features/auth/hooks/useSession", () => ({
  useSession: () => session,
}));
jest.mock("@/features/settings/hooks/useSettings", () => ({
  useAppSettings: () => ({ data: { quietHoursFlag: 4, quietHourActiveMin: 20, fullDayPct: 80 } }),
}));
jest.mock("@/features/departments/hooks/useDepartments", () => ({
  useDepartments: () => ({ data: [] }),
}));
jest.mock("@/features/reports/components/MonthCharts", () => ({
  FocusByDayChart: () => null,
  MonthHeatmap: () => null,
}));
jest.mock("@/features/reports/components/CreateReport", () => ({
  CreateReport: () => null,
}));
jest.mock("@/features/reports/hooks/useReports");

const mocked = hooks as jest.Mocked<typeof hooks>;
const LABEL = "Payroll paused · biometric integration pending";
const H = 3600;
const FIGURES = "Working, focus, idle, break and meeting time";
const FOUR_LABEL = "Working, focus, break and meeting time";

const person = (id: string, name: string): ReportPerson => ({
  id,
  name,
  email: `${id}@x.test`,
  role: "USER",
  department: "Ops",
  designation: null,
  managerId: null,
  managerName: null,
});

function summary(over: Partial<PersonDaySummary> = {}): PersonDaySummary {
  return {
    date: "2026-10-20",
    weekday: 2,
    workday: true,
    dayClass: "FULL",
    startedAt: "2026-10-20T04:00:00.000Z",
    endedAt: "2026-10-20T13:00:00.000Z",
    autoClosed: false,
    lateStart: null,
    focusSec: 8 * H,
    expectedSec: 8 * H,
    targetSec: 8 * H,
    breakSec: H,
    meetingSec: H,
    paidBreakSec: H,
    unpaidBreakSec: 0,
    awayApprovedSec: 0,
    awayPendingSec: 0,
    awayRejectedSec: 0,
    awayUnexplainedSec: 0,
    unverifiedSec: 0,
    paidSec: 9 * H,
    label: null,
    approvedPlusSec: 0,
    rejectedMinusSec: 0,
    pendingPlusSec: 0,
    pendingMinusSec: 0,
    breaksTaken: 1,
    skipped: 0,
    autoSkipped: 0,
    overruns: 0,
    meetings: 1,
    pending: 0,
    quietHours: 0,
    activeMin: 300,
    availableSec: 7 * H,
    ...over,
  } as PersonDaySummary;
}

function totals(over: Partial<MonthTotals> = {}): MonthTotals {
  return {
    workdays: 20,
    full: 15,
    half: 0,
    absent: 5,
    off: 8,
    extra: 0,
    focusSec: 120 * H,
    expectedSec: 160 * H,
    targetSec: 160 * H,
    avgFocusSec: 6 * H,
    lateStarts: 3,
    skipped: 0,
    autoSkipped: 0,
    overruns: 0,
    meetings: 0,
    approvedPlusSec: 0,
    rejectedMinusSec: 0,
    pending: 1,
    quietHours: 9,
    needsALook: true,
    availableSec: 100 * H,
    activeSec: 80 * H,
    meetingSec: 5 * H,
    breakSec: 10 * H,
    idleSec: 2 * H,
    paidBreakSec: 10 * H,
    unpaidBreakSec: 0,
    awayApprovedSec: 0,
    awayPendingSec: 0,
    unverifiedSec: 0,
    paidSec: 130 * H,
    ...over,
  };
}

const standing = (over: Partial<PersonPayroll> = {}): PersonPayroll => ({
  paused: true,
  label: LABEL,
  pausedDays: 20,
  pausedFrom: "2026-10-01",
  pausedTo: "2026-10-31",
  totals: totals({ focusSec: 0, paidSec: 0, full: 0, absent: 0, pending: 0 }),
  ...over,
});

const row = (name: string, t: MonthTotals, payroll?: PersonPayroll): TeamMonthRow => ({
  person: person(name.toLowerCase(), name),
  totals: t,
  days: [],
  ...(payroll ? { payroll } : {}),
});

function query<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
    isFetching: false,
    dataUpdatedAt: 0,
    error: null,
    refetch: jest.fn(),
  } as never;
}

function figuresIn(root: HTMLElement, label = FIGURES) {
  // The first on the page: the headline, on a page with a list of people under it.
  const list = within(root).getAllByLabelText(label)[0];
  return {
    terms: within(list)
      .getAllByRole("term")
      .map((t) => t.textContent),
    values: within(list)
      .getAllByRole("definition")
      .map((d) => d.textContent),
  };
}
const FIVE = ["Working", "Focus", "Idle", "Break", "Meeting"];

beforeEach(() => {
  session.grants = ALL_GRANTS;
  mocked.useMonthLock.mockReturnValue(
    query({ locked: false, pending: 0, lockedAt: null, lockedByName: null }),
  );
});

describe("Team month (3.6)", () => {
  const empty = totals({ focusSec: 0, paidSec: 0, full: 0, absent: 0, pending: 0, lateStarts: 0 });
  function report(over: Partial<TeamMonthReport> & Pick<TeamMonthReport, "rows">): TeamMonthReport {
    return {
      month: "2026-10",
      scope: "TEAM",
      locked: false,
      generatedAt: "2026-11-01T00:00:00.000Z",
      totals: { ...empty, workdays: 0, expectedSec: 0, avgFocusSec: 0, quietHours: 0, people: 0 },
      trackedTotals: { ...totals(), people: over.rows.length },
      ...over,
    };
  }
  const showTeam = (r: TeamMonthReport) => {
    mocked.useTeamMonthReport.mockReturnValue(query(r));
    return render(<TeamMonthView params={{ month: "2026-10" }} back={null} autoPrint={false} />);
  };
  const paused = row("Bala", totals(), standing());

  describe("a department whose only person is paused: the tiles are tracking, and keep him", () => {
    beforeEach(() => showTeam(report({ rows: [paused] })));

    it("attendance counts his days", () => {
      expect(screen.getByText("75.0%")).toBeInTheDocument();
      expect(screen.getByText(/15 of 20 person-days/)).toBeInTheDocument();
    });

    it("late starts and quiet hours count them too", () => {
      const late = screen.getAllByText("Late starts")[0].parentElement as HTMLElement;
      expect(late).toHaveTextContent("3");
      expect(screen.getByText(/9 quiet hours in all/)).toBeInTheDocument();
    });

    it("an open approval shows, with its way through", () => {
      expect(screen.getByText(/1 approval is still open/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Review approvals" })).toBeInTheDocument();
    });

    it("4.0: only paid time for payroll leaves him out", () => {
      const tile = screen.getByText("Paid time, for payroll").parentElement as HTMLElement;
      expect(tile).toHaveTextContent("0m");
      expect(tile).toHaveTextContent("payroll paused days left out");
      const focus = screen.getAllByText("Focus time")[0].parentElement as HTMLElement;
      expect(focus).toHaveTextContent("120h 00m");
    });

    it("the headline figures are what the table under them adds up to", () => {
      expect(figuresIn(document.body)).toEqual({
        terms: FIVE,
        values: ["105h 00m", "120h 00m", "2h 00m", "10h 00m", "5h 00m"],
      });
    });
  });

  it("paid time for payroll reads payroll's totals, everything else the tracked ones", () => {
    const agent = row("Asha", totals({ focusSec: 150 * H, paidSec: 160 * H, pending: 0 }));
    showTeam(
      report({
        rows: [agent, paused],
        totals: { ...totals({ focusSec: 150 * H, paidSec: 160 * H }), people: 1 },
        trackedTotals: { ...totals({ focusSec: 270 * H, breakSec: 20 * H }), people: 2 },
      }),
    );
    const tile = screen.getByText("Paid time, for payroll").parentElement as HTMLElement;
    expect(tile).toHaveTextContent("160h 00m");
    const figures = screen.getAllByLabelText(FIGURES)[0];
    expect(within(figures).getByText("270h 00m")).toBeInTheDocument();
    expect(within(figures).getByText("20h 00m")).toBeInTheDocument();
  });

  it("a paused person's rows carry the exact label, in the ranking and in the time per person", () => {
    showTeam(report({ rows: [paused] }));
    expect(screen.getAllByText(LABEL).length).toBeGreaterThanOrEqual(4);
  });

  it("the banner says who, with the label exact and no sentence running into it", () => {
    showTeam(report({ rows: [paused, row("Devi", totals(), standing())] }));
    const banner = screen.getByRole("note");
    expect(within(banner).getByText(LABEL)).toBeInTheDocument();
    expect(banner).toHaveTextContent("2 people are listed with this label.");
    expect(banner).toHaveTextContent("left out of Paid time, for payroll, and of the Excel");
  });

  it("nobody paused: no banner and no label", () => {
    showTeam(report({ rows: [row("Asha", totals())] }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
  });

  it("someone back in payroll says which days are left out; someone fully paused does not", () => {
    const resumed = row(
      "Chitra",
      totals(),
      standing({ paused: false, pausedDays: 5, pausedFrom: "2026-10-01", pausedTo: "2026-10-05" }),
    );
    const oneDay = row(
      "Devi",
      totals(),
      standing({ paused: false, pausedDays: 1, pausedFrom: "2026-10-05", pausedTo: "2026-10-05" }),
    );
    showTeam(report({ rows: [paused, resumed, oneDay] }));
    expect(screen.getAllByText("5 days left out, between 1 Oct and 5 Oct").length).toBe(4);
    expect(screen.getAllByText("1 day left out, 5 Oct").length).toBe(4);
    expect(screen.queryByText(/20 days left out/)).not.toBeInTheDocument();
  });

  const timeTable = () =>
    screen
      .getAllByRole("table")
      .find((t) => within(t).queryByRole("columnheader", { name: "Working" })) as HTMLElement;

  it("the time per person: working, focus, idle, break and meeting, per person", () => {
    showTeam(report({ rows: [row("Asha", totals())] }));
    expect(
      within(timeTable())
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Person", ...FIVE]);
    const cells = within(within(timeTable()).getAllByRole("row")[1])
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(cells).toEqual(["105h 00m", "120h 00m", "2h 00m", "10h 00m", "5h 00m"]);
  });

  it("no agent reported: Idle says No data; a month locked before 3.2 has no Working either", () => {
    const old = totals({ idleSec: null });
    delete old.availableSec;
    showTeam(report({ rows: [row("Asha", old)] }));
    const cells = within(within(timeTable()).getAllByRole("row")[1])
      .getAllByRole("cell")
      .map((c) => c.textContent);
    expect(cells).toEqual(["No data", "120h 00m", "No data", "10h 00m", "5h 00m"]);
  });

  it("4.0: a Manager without the activity grant sees no idle, in the headline or the table", () => {
    session.grants = NO_GRANTS;
    showTeam(report({ rows: [row("Asha", totals())] }));
    expect(screen.queryByLabelText(FIGURES)).not.toBeInTheDocument();
    expect(figuresIn(document.body, FOUR_LABEL).terms).toEqual([
      "Working",
      "Focus",
      "Break",
      "Meeting",
    ]);
    expect(
      within(timeTable())
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Person", "Working", "Focus", "Break", "Meeting"]);
  });
});

describe("Team day (3.6)", () => {
  const showDay = (rows: { person: ReportPerson; summary: PersonDaySummary }[]) => {
    mocked.useTeamDayReport.mockReturnValue(query({ date: "2026-10-20", rows }));
    return render(<TeamDayView params={{ date: "2026-10-20" }} back={null} autoPrint={false} />);
  };
  const cardOf = (name: string) =>
    screen
      .getAllByRole("listitem")
      .find((li) => within(li).queryByRole("link", { name })) as HTMLElement;

  it("a paused person carries the label on the card and on the row; nobody else does", () => {
    showDay([
      { person: person("bala", "Bala"), summary: summary({ payrollPaused: true }) },
      { person: person("asha", "Asha"), summary: summary() },
    ]);
    expect(within(cardOf("Bala")).getByText(LABEL)).toBeInTheDocument();
    expect(within(cardOf("Asha")).queryByText(LABEL)).not.toBeInTheDocument();
    const tableRow = screen.getByRole("rowheader", { name: /Bala/ });
    expect(within(tableRow).getByText(LABEL)).toBeInTheDocument();
    // 4.0: payroll is paid time, which a paused day does not have.
    expect(
      within(screen.getByRole("row", { name: /Bala/ })).getByText("Paused"),
    ).toBeInTheDocument();
  });

  it("the card shows the five figures in order, and the table the same columns", () => {
    showDay([{ person: person("asha", "Asha"), summary: summary({ idleSec: 600 }) }]);
    expect(figuresIn(cardOf("Asha"))).toEqual({
      terms: FIVE,
      values: ["8h 00m", "8h 00m", "10m", "1h 00m", "1h 00m"],
    });
    const heads = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(heads.filter((h) => FIVE.includes(h))).toEqual(FIVE);
  });

  it("no agent reported: No data, on the card and on the row", () => {
    showDay([{ person: person("bala", "Bala"), summary: summary({ idleSec: null }) }]);
    expect(figuresIn(cardOf("Bala")).values[2]).toBe("No data");
    const tableRow = screen.getByRole("row", { name: /Bala/ });
    expect(within(tableRow).getByText("No data")).toBeInTheDocument();
  });

  it("focus added by hand on a day with no session still shows on the card", () => {
    showDay([
      {
        person: person("bala", "Bala"),
        summary: summary({
          dayClass: "ABSENT",
          startedAt: null,
          endedAt: null,
          focusSec: 2 * H,
          availableSec: 0,
          meetingSec: 0,
          breakSec: 0,
        }),
      },
    ]);
    const card = cardOf("Bala");
    expect(card).toHaveTextContent("Did not start");
    expect(figuresIn(card).values[1]).toBe("2h 00m");
  });

  it("no session and no focus: nothing to add up on the card", () => {
    showDay([
      {
        person: person("bala", "Bala"),
        summary: summary({ dayClass: "ABSENT", startedAt: null, endedAt: null, focusSec: 0 }),
      },
    ]);
    expect(within(cardOf("Bala")).queryByLabelText(FIGURES)).not.toBeInTheDocument();
  });

  it("4.0: without the activity grant there is no Idle column and no idle figure", () => {
    session.grants = NO_GRANTS;
    showDay([{ person: person("asha", "Asha"), summary: summary({ idleSec: 600 }) }]);
    expect(screen.queryByRole("columnheader", { name: "Idle" })).not.toBeInTheDocument();
    expect(within(cardOf("Asha")).queryByLabelText(FIGURES)).not.toBeInTheDocument();
    expect(within(cardOf("Asha")).getByLabelText(FOUR_LABEL)).toBeInTheDocument();
  });
});

describe("Person day (3.6)", () => {
  function report(over: Partial<PersonDayReport> = {}): PersonDayReport {
    return {
      person: person("bala", "Bala"),
      summary: summary(),
      shift: null,
      timeline: [],
      skips: [],
      breaks: [],
      meetings: [],
      approvals: [],
      hourly: [],
      input: { activeSec: 6 * H, idleSec: 600, noDataSec: 0, availableSec: 7 * H },
      adjustments: [],
      punches: [],
      ...over,
    } as PersonDayReport;
  }
  const showPerson = (r: PersonDayReport) => {
    mocked.usePersonDayReport.mockReturnValue(query(r));
    return render(<PersonDayView userId="bala" date="2026-10-20" back={null} autoPrint={false} />);
  };
  const meeting = (kind: "STATUS" | "DECLARED") => ({
    id: kind,
    date: "2026-10-20",
    mode: "LIVE" as const,
    agenda: "",
    participants: [],
    startedAt: "2026-10-20T05:00:00.000Z",
    endedAt: "2026-10-20T06:00:00.000Z",
    inProgress: false,
    durationSec: H,
    approvalStatus: kind === "STATUS" ? ("NOT_REQUIRED" as const) : ("PENDING" as const),
    dueAt: null,
    decidedAt: null,
    decisionNote: null,
    decidedByName: null,
    kind,
    startSource: kind === "STATUS" ? ("BUTTON" as const) : null,
    endReason: kind === "STATUS" ? ("USER" as const) : null,
  });

  it("the five figures, in order, with idle from the day's input", () => {
    showPerson(report());
    expect(figuresIn(document.body)).toEqual({
      terms: FIVE,
      values: ["8h 00m", "8h 00m", "10m", "1h 00m", "1h 00m"],
    });
  });

  it("no agent reported on the day: Idle says No data", () => {
    showPerson(
      report({ input: { activeSec: 0, idleSec: 0, noDataSec: 8 * H, availableSec: 8 * H } }),
    );
    expect(figuresIn(document.body).values[2]).toBe("No data");
  });

  it("an agent reported and nobody was idle: a real zero", () => {
    showPerson(
      report({ input: { activeSec: 7 * H, idleSec: 0, noDataSec: 0, availableSec: 7 * H } }),
    );
    expect(figuresIn(document.body).values[2]).toBe("0m");
  });

  it("4.0: a paused day says so, exactly, and its paid time reads Paused", () => {
    showPerson(report({ summary: summary({ payrollPaused: true }) }));
    const banner = screen.getAllByText(LABEL)[0];
    expect(banner.parentElement).toHaveTextContent("its paid time is not calculated");
    expect(screen.queryByText("Paid time, for payroll")).not.toBeInTheDocument();
    const paid = screen.getByText("Paid time").parentElement as HTMLElement;
    expect(paid).toHaveTextContent("Paused");
  });

  it("an ordinary day has no such banner, and paid time is for payroll", () => {
    showPerson(report());
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
    const paid = screen.getByText("Paid time, for payroll").parentElement as HTMLElement;
    expect(paid).toHaveTextContent("9h 00m");
  });

  it("a status meeting shows what it is, and is not promised a rejection", () => {
    showPerson(report({ meetings: [meeting("STATUS")] }));
    expect(screen.getByText("In a meeting")).toBeInTheDocument();
    expect(screen.getByText("No approval needed")).toBeInTheDocument();
    expect(screen.getByText("Started with the button, ended by them")).toBeInTheDocument();
    expect(screen.queryByText(/unless rejected/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/no approval needed/).length).toBeGreaterThan(1);
  });

  it("a meeting that can be rejected still says so", () => {
    showPerson(report({ meetings: [meeting("DECLARED")] }));
    expect(screen.getAllByText(/focus time unless rejected/).length).toBe(3);
  });

  it("a day with both says both", () => {
    showPerson(report({ meetings: [meeting("DECLARED"), meeting("STATUS")] }));
    expect(screen.getAllByText(/time marked In a meeting always counts/).length).toBe(3);
  });

  it("4.0: without the activity grant the figures leave idle out", () => {
    session.grants = NO_GRANTS;
    showPerson(report());
    expect(screen.queryByLabelText(FIGURES)).not.toBeInTheDocument();
    expect(figuresIn(document.body, FOUR_LABEL).terms).toEqual([
      "Working",
      "Focus",
      "Break",
      "Meeting",
    ]);
  });
});

describe("Person month (3.6)", () => {
  function report(over: Partial<PersonMonthReport> = {}): PersonMonthReport {
    return {
      person: person("bala", "Bala"),
      month: "2026-10",
      locked: false,
      generatedAt: "2026-11-01T00:00:00.000Z",
      totals: totals({ pending: 0 }),
      days: [summary()],
      heatmap: [],
      ...over,
    };
  }
  const showMonth = (r: PersonMonthReport) => {
    mocked.usePersonMonthReport.mockReturnValue(query(r));
    return render(<PersonMonthView userId="bala" month="2026-10" back={null} autoPrint={false} />);
  };

  it("the five figures, in order", () => {
    showMonth(report());
    expect(figuresIn(document.body)).toEqual({
      terms: FIVE,
      values: ["105h 00m", "120h 00m", "2h 00m", "10h 00m", "5h 00m"],
    });
  });

  it("fully paused: the label on its own, and paid time reads Paused", () => {
    showMonth(report({ payroll: standing() }));
    const banner = screen.getAllByText(LABEL)[0];
    expect(banner.parentElement).toHaveTextContent(
      "Their days are tracked as usual and left out of payroll this month.",
    );
    // The tiles (the day table keeps its own column of the same name).
    const tiles = screen
      .getAllByText("Paid time")
      .filter((el) => el.tagName === "SPAN")
      .map((el) => el.parentElement as HTMLElement);
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) expect(tile).toHaveTextContent("Paused");
    expect(screen.queryByText("Paid time, for payroll")).not.toBeInTheDocument();
  });

  it("partly paused: which days, and what payroll counts", () => {
    showMonth(
      report({
        payroll: standing({
          paused: false,
          pausedDays: 5,
          pausedFrom: "2026-10-01",
          pausedTo: "2026-10-05",
          totals: totals({ paidSec: 40 * H }),
        }),
      }),
    );
    const banner = screen.getByText(LABEL);
    expect(banner.parentElement).toHaveTextContent("5 days of this month are left out of payroll");
    expect(screen.getByText(/40h 00m counted for payroll/)).toBeInTheDocument();
  });

  it("nobody paused: no banner", () => {
    showMonth(report());
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument();
    expect(screen.getByText("Paid time, for payroll")).toBeInTheDocument();
  });
});

describe("Monthly runs (3.6)", () => {
  const run = (summaryOf: Record<string, unknown>) => ({
    id: "r1",
    month: "2026-10",
    scope: "ALL",
    generatedAt: "2026-11-01T00:30:00.000Z",
    summary: summaryOf,
  });
  const showRuns = (r: ReturnType<typeof run>) => {
    mocked.useReportRuns.mockReturnValue(query([r]));
    mocked.useMonthLocks.mockReturnValue([query({ locked: false, pending: 0 })] as never);
    return render(<MonthlyRuns isSuperAdmin />);
  };

  it("says how many are left out of the run", () => {
    showRuns(run({ people: 3, payrollPaused: 2 }));
    expect(screen.getByText(/Everyone · 3 people · 2 payroll paused/)).toBeInTheDocument();
  });

  it("nobody left out: as it always read", () => {
    showRuns(run({ people: 3 }));
    expect(screen.getByText(/Everyone · 3 people/)).toBeInTheDocument();
    expect(screen.queryByText(/payroll paused/)).not.toBeInTheDocument();
  });
});

describe("Reports home (3.6)", () => {
  it("how the numbers work: time marked In a meeting cannot be rejected", () => {
    mocked.useReportRuns.mockReturnValue(query([]));
    mocked.useMonthLocks.mockReturnValue([] as never);
    render(<ReportsHome isSuperAdmin={false} />);
    expect(
      screen.getByText(/Time marked In a meeting needs no approval and always counts/),
    ).toBeInTheDocument();
  });
});
