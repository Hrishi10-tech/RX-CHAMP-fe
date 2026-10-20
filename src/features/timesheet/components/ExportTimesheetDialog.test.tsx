import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExportTimesheetDialog } from "./ExportTimesheetDialog";
import * as api from "@/features/timesheet/api/timesheet";
import * as pdf from "@/features/timesheet/lib/pdf";
import type { Timesheet } from "@/features/timesheet/types";

jest.mock("@/features/timesheet/api/timesheet", () => ({
  ...jest.requireActual("@/features/timesheet/api/timesheet"),
  getTimesheet: jest.fn(),
  downloadTimesheetXlsx: jest.fn(),
}));
jest.mock("@/features/timesheet/lib/pdf", () => ({
  ...jest.requireActual("@/features/timesheet/lib/pdf"),
  saveTimesheetPdf: jest.fn(),
}));
jest.mock("@/lib/time/businessTime", () => ({
  ...jest.requireActual("@/lib/time/businessTime"),
  todayKey: () => "2026-10-19",
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const getTimesheet = api.getTimesheet as jest.Mock;
const downloadXlsx = api.downloadTimesheetXlsx as jest.Mock;
const savePdf = pdf.saveTimesheetPdf as jest.Mock;

const SHEET: Timesheet = {
  person: {
    id: "u1",
    name: "Asha K",
    email: null,
    designation: null,
    department: null,
    organisation: null,
  },
  range: { from: "2026-10-01", to: "2026-10-19" },
  rows: [],
  totals: api.totalsOf([]),
};

function renderDialog() {
  render(<ExportTimesheetDialog open onClose={jest.fn()} userId="u1" userName="Asha K" />);
}

beforeEach(() => {
  jest.clearAllMocks();
  savePdf.mockResolvedValue(1);
});

describe("ExportTimesheetDialog (SPEC 7.3)", () => {
  it("asks for the whole range in one request and draws the PDF from it", async () => {
    getTimesheet.mockResolvedValue(SHEET);
    renderDialog();
    expect(screen.getByText(/1 Oct 2026 – 19 Oct 2026/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Download PDF/ }));
    await waitFor(() => expect(savePdf).toHaveBeenCalledTimes(1));
    expect(getTimesheet).toHaveBeenCalledTimes(1);
    expect(getTimesheet).toHaveBeenCalledWith(
      "u1",
      "2026-10-01",
      "2026-10-19",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(savePdf).toHaveBeenCalledWith(
      SHEET,
      "rx-vision-timesheet-asha-k-2026-10-01-to-2026-10-19.pdf",
    );
  });

  it("shows the server's message and can always be tried again", async () => {
    getTimesheet
      .mockRejectedValueOnce(new Error("Range is longer than 366 days"))
      .mockResolvedValueOnce(SHEET);
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: /Download PDF/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Range is longer than 366 days");
    // Nothing latched: the button works again.
    const again = screen.getByRole("button", { name: /Download PDF/ });
    expect(again).toBeEnabled();
    await userEvent.click(again);
    await waitFor(() => expect(savePdf).toHaveBeenCalledTimes(1));
    expect(getTimesheet).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("downloads the server's Excel for the same range", async () => {
    downloadXlsx.mockResolvedValue("asha.xlsx");
    renderDialog();
    await userEvent.click(screen.getByRole("button", { name: /Download Excel/ }));
    await waitFor(() =>
      expect(downloadXlsx).toHaveBeenCalledWith("u1", "2026-10-01", "2026-10-19", "Asha K"),
    );
    expect(getTimesheet).not.toHaveBeenCalled();
  });
});
