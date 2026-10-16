import { render, screen } from "@testing-library/react";

import { LiveStatusBadge } from "./LiveStatusBadge";
import { ActivityStatusBadge } from "@/features/activity/components/ActivityStatusBadge";
import type { ActivityStatus } from "@/features/activity/types";
import type { LiveStatus } from "@/features/analytics/types";

describe("presence status badges", () => {
  it("shows NOT_STARTED as Not started", () => {
    render(<LiveStatusBadge status="NOT_STARTED" />);
    expect(screen.getByText("Not started")).toBeInTheDocument();
  });

  it("still renders a status it does not know", () => {
    render(<LiveStatusBadge status={"ON_LEAVE" as LiveStatus} />);
    expect(screen.getByText("On leave")).toBeInTheDocument();
  });

  it("reads NOT_STARTED from the activity status too", () => {
    render(<ActivityStatusBadge status={"NOT_STARTED" as ActivityStatus} />);
    expect(screen.getByText("Not started")).toBeInTheDocument();
  });
});
