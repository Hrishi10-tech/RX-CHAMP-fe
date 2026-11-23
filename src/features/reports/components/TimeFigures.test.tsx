import { render, screen, within } from "@testing-library/react";

import { PayrollPausedChip, TimeFigures } from "./TimeFigures";
import { timeFigures } from "@/features/reports/lib/timeFigures";

describe("TimeFigures", () => {
  it("shows meeting next to working, focus, idle and break, in that order", () => {
    render(
      <TimeFigures
        figures={timeFigures({
          Working: 28800,
          Focus: 28800,
          Idle: 600,
          Break: 2700,
          Meeting: 3600,
        })}
      />,
    );
    const list = screen.getByLabelText("Working, focus, idle, break and meeting time");
    expect(
      within(list)
        .getAllByRole("term")
        .map((t) => t.textContent),
    ).toEqual(["Working", "Focus", "Idle", "Break", "Meeting"]);
    expect(
      within(list)
        .getAllByRole("definition")
        .map((d) => d.textContent),
    ).toEqual(["8h 00m", "8h 00m", "10m", "45m", "1h 00m"]);
  });

  it("says when idle could not be read", () => {
    render(
      <TimeFigures
        compact
        figures={timeFigures({ Working: 0, Focus: 0, Idle: null, Break: 0, Meeting: 0 })}
      />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});

describe("PayrollPausedChip", () => {
  it("reads exactly as the brief says", () => {
    render(<PayrollPausedChip />);
    expect(screen.getByText("Payroll paused · biometric integration pending")).toBeInTheDocument();
  });

  it("uses the server's wording when it has it", () => {
    render(<PayrollPausedChip label="From the server" />);
    expect(screen.getByText("From the server")).toBeInTheDocument();
  });
});
