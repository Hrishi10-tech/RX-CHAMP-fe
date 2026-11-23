import { render, screen } from "@testing-library/react";

import { ActivityTimelineChart } from "./ActivityTimelineChart";
import { TopAppsWidget } from "./TopAppsWidget";

// W-17: a day with nothing recorded says so instead of an empty card or bare axes.
describe("productivity widgets on an empty day", () => {
  it("Top apps says no apps were recorded", () => {
    render(<TopAppsWidget data={[]} />);
    expect(screen.getByText("No apps recorded on this day.")).toBeInTheDocument();
  });

  it("the activity timeline says no activity was recorded", () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      activeSec: 0,
      idleSec: 0,
    }));
    render(<ActivityTimelineChart data={hours as never} />);
    expect(screen.getByText("No activity recorded on this day.")).toBeInTheDocument();
  });
});
