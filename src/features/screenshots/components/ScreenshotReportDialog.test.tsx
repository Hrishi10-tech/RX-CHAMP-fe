import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ScreenshotReportDialog } from "./ScreenshotReportDialog";
import * as api from "@/features/screenshots/api/exports";

jest.mock("@/features/screenshots/api/exports", () => ({
  estimateReport: jest.fn(),
  startReport: jest.fn(),
  getExport: jest.fn(),
  cancelExport: jest.fn(),
  downloadLink: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ScreenshotReportDialog open onClose={jest.fn()} userId="u1" userName="Asha Rao" />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("ScreenshotReportDialog", () => {
  it("counts the screenshots of a time window and starts the PDF", async () => {
    mocked.estimateReport.mockResolvedValue({
      total: 24,
      estimatedSec: 5,
      estimatedBytes: 3_360_000,
      periodLabel: "14 Oct 2026, 17:00 to 19:00",
    });
    mocked.startReport.mockResolvedValue({
      id: "r1",
      kind: "PERSON_REPORT",
      status: "QUEUED",
      title: "Screenshot report, 14 Oct 2026, 17:00 to 19:00",
      userId: "u1",
      month: null,
      total: 24,
      done: 0,
      missing: 0,
      progress: { fraction: 0, etaSec: null, elapsedSec: 0 },
      stage: "Waiting for another export to finish",
      bytes: 0,
      fileName: null,
      downloadable: false,
      complete: false,
      error: null,
      createdAt: "2026-10-15T05:00:00.000Z",
      startedAt: null,
      finishedAt: null,
      downloadedAt: null,
      expiresAt: null,
    });
    mocked.getExport.mockImplementation(() => mocked.startReport.mock.results[0].value);
    renderDialog();
    await userEvent.click(screen.getByRole("radio", { name: /time on a date/i }));
    expect(screen.getByLabelText("From")).toHaveValue("17:00");
    expect(screen.getByLabelText("To")).toHaveValue("19:00");
    expect(
      await screen.findByText(/24 screenshots in 14 Oct 2026, 17:00 to 19:00/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mocked.estimateReport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userId: "u1",
          mode: "TIME_WINDOW",
          fromTime: "17:00",
          toTime: "19:00",
        }),
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: /make the pdf/i }));
    expect(mocked.startReport).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "TIME_WINDOW" }),
    );
    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
  });

  it("will not start a report with no screenshots", async () => {
    mocked.estimateReport.mockResolvedValue({
      total: 0,
      estimatedSec: 2,
      estimatedBytes: 0,
      periodLabel: "1 Oct 2026",
    });
    renderDialog();
    expect(await screen.findByText("No screenshots in 1 Oct 2026.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /make the pdf/i })).toBeDisabled();
  });
});
