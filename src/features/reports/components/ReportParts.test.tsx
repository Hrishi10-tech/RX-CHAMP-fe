import { render, screen } from "@testing-library/react";

import { ActivityGate, TimelineGate } from "./ReportParts";
import { useSession } from "@/features/auth/hooks/useSession";
import { NO_GRANTS } from "@/constants/roles";

jest.mock("@/features/auth/hooks/useSession", () => ({ useSession: jest.fn() }));

const session = useSession as jest.Mock;

function viewer(grants: Partial<typeof NO_GRANTS>) {
  session.mockReturnValue({ grants: { ...NO_GRANTS, ...grants } });
}

describe("report sections behind a grant (SPEC 1.2)", () => {
  it("draws the day's timeline only with the timeline grant", () => {
    viewer({ timeline: true });
    const { unmount } = render(<TimelineGate>TIMELINE</TimelineGate>);
    expect(screen.getByText("TIMELINE")).toBeInTheDocument();
    unmount();

    // Without it the server sends the timeline empty: one line instead of a bare bar.
    viewer({ activity: true });
    render(<TimelineGate>TIMELINE</TimelineGate>);
    expect(screen.queryByText("TIMELINE")).not.toBeInTheDocument();
    expect(screen.getByText("Ask your Admin for access to timelines.")).toBeInTheDocument();
  });

  it("shows keyboard and mouse activity only with the activity grant", () => {
    viewer({ timeline: true });
    render(<ActivityGate>ACTIVITY</ActivityGate>);
    expect(screen.queryByText("ACTIVITY")).not.toBeInTheDocument();
    expect(
      screen.getByText("Ask your Admin for access to keyboard and mouse activity."),
    ).toBeInTheDocument();
  });
});
