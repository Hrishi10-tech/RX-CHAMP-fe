import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ArchivesView } from "./ArchivesView";
import * as api from "@/features/screenshots/api/exports";
import type { ExportJobView, MonthArchiveView } from "@/features/screenshots/api/exports";

jest.mock("@/features/screenshots/api/exports", () => ({
  listArchives: jest.fn(),
  startArchive: jest.fn(),
  startPurge: jest.fn(),
  getExport: jest.fn(),
  cancelExport: jest.fn(),
  downloadLink: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

const mocked = api as jest.Mocked<typeof api>;

function job(over: Partial<ExportJobView> = {}): ExportJobView {
  return {
    id: "a1",
    kind: "MONTH_ARCHIVE",
    status: "DONE",
    title: "Screenshot archive, September 2026",
    userId: null,
    month: "2026-09",
    total: 120,
    done: 120,
    missing: 0,
    progress: { fraction: 1, etaSec: 0, elapsedSec: 40 },
    stage: "Ready to download",
    bytes: 12_000_000,
    fileName: "RX-Vision-screenshots-2026-09.zip",
    downloadable: true,
    complete: true,
    error: null,
    createdAt: "2026-10-02T05:00:00.000Z",
    startedAt: "2026-10-02T05:00:00.000Z",
    finishedAt: "2026-10-02T05:00:40.000Z",
    downloadedAt: null,
    expiresAt: "2026-10-09T05:00:40.000Z",
    ...over,
  };
}

function month(over: Partial<MonthArchiveView> = {}): MonthArchiveView {
  return {
    month: "2026-09",
    label: "September 2026",
    ended: true,
    screenshots: 120,
    dueBy: "2026-11-01",
    overdue: false,
    latestArchive: null,
    qualifyingArchive: null,
    deletable: 0,
    newerThanArchive: 0,
    canDelete: false,
    deleteBlockedBy: "NO_ARCHIVE",
    deleteBlockedText: "Create the archive of this month first.",
    lastPurge: null,
    running: null,
    ...over,
  };
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ArchivesView />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("ArchivesView", () => {
  it("holds Delete until there is an archive, and says why", async () => {
    mocked.listArchives.mockResolvedValue([
      month(),
      month({ month: "2026-11", label: "November 2026", ended: false }),
    ]);
    renderView();
    const sept = (await screen.findByRole("heading", { name: "September 2026" })).closest(
      "li",
    ) as HTMLElement;
    expect(within(sept).getByRole("button", { name: /delete month/i })).toBeDisabled();
    expect(within(sept).getByText("Create the archive of this month first.")).toBeInTheDocument();
    expect(within(sept).getByText(/due by 1 Nov 2026/i)).toBeInTheDocument();
    // The month still running can be archived but not deleted.
    const nov = screen.getByRole("heading", { name: "November 2026" }).closest("li") as HTMLElement;
    expect(within(nov).getByText("In progress")).toBeInTheDocument();
    expect(within(nov).queryByRole("button", { name: /delete month/i })).toBeNull();
    expect(within(nov).getByRole("button", { name: /create archive/i })).toBeEnabled();
  });

  it("starts an archive and shows its progress", async () => {
    mocked.listArchives.mockResolvedValue([month()]);
    mocked.startArchive.mockResolvedValue(
      job({ status: "RUNNING", done: 10, downloadable: false }),
    );
    mocked.getExport.mockResolvedValue(
      job({
        status: "RUNNING",
        done: 60,
        progress: { fraction: 0.5, etaSec: 30, elapsedSec: 30 },
        stage: "Adding screenshot 61 of 120",
        downloadable: false,
      }),
    );
    mocked.cancelExport.mockResolvedValue(job({ status: "CANCELLED" }));
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: /create archive/i }));
    expect(mocked.startArchive).toHaveBeenCalledWith("2026-09");
    expect(await screen.findByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("60 of 120 screenshots")).toBeInTheDocument();
    expect(screen.getByText("Under a minute left")).toBeInTheDocument();
    // Closing the window cancels the archive.
    await userEvent.click(screen.getByRole("button", { name: /cancel and close/i }));
    await waitFor(() => expect(mocked.cancelExport).toHaveBeenCalledWith("a1"));
  });

  it("deletes only after the archive is confirmed as kept and the month typed", async () => {
    const archive = job({ downloadedAt: "2026-10-02T06:00:00.000Z" });
    mocked.listArchives.mockResolvedValue([
      month({
        latestArchive: archive,
        qualifyingArchive: archive,
        deletable: 120,
        canDelete: true,
        deleteBlockedBy: null,
        deleteBlockedText: null,
      }),
    ]);
    mocked.startPurge.mockResolvedValue(
      job({ id: "p1", kind: "MONTH_PURGE", status: "QUEUED", done: 0 }),
    );
    mocked.getExport.mockResolvedValue(
      job({
        id: "p1",
        kind: "MONTH_PURGE",
        status: "DONE",
        title: "Delete September 2026 screenshots",
        stage: "Deleted 120 screenshots",
      }),
    );
    renderView();
    await userEvent.click(await screen.findByRole("button", { name: /delete month/i }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /delete for good/i });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/type september 2026/i), "september 2026");
    expect(confirm).toBeDisabled();
    await userEvent.click(within(dialog).getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(mocked.startPurge).toHaveBeenCalledWith("2026-09");
    expect(await screen.findByText("Deleted 120 screenshots.")).toBeInTheDocument();
  });

  it("says when the archive was made before the month ended", async () => {
    const early = job({
      startedAt: "2026-09-20T05:00:00.000Z",
      finishedAt: "2026-09-20T05:01:00.000Z",
    });
    mocked.listArchives.mockResolvedValue([
      month({
        latestArchive: early,
        deleteBlockedBy: "ARCHIVE_BEFORE_MONTH_END",
        deleteBlockedText:
          "The archive was made before the month ended. Create a new archive now that it has.",
      }),
    ]);
    renderView();
    expect(
      await screen.findByText(/made before the month ended, so it does not allow deleting/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create a new archive/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /download/i })).toBeEnabled();
  });
});
