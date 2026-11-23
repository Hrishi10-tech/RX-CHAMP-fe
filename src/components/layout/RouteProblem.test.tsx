import { fireEvent, render, screen } from "@testing-library/react";

import { RouteError, RouteNotFound } from "./RouteProblem";

// U-3: a crash or a wrong address shows the product's own page, with a way forward.
describe("route problem pages", () => {
  it("an error says so, offers a retry and a way home", () => {
    const retry = jest.fn();
    render(<RouteError onRetry={retry} home="/dashboard" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("a wrong address says the page does not exist and leads home", () => {
    render(<RouteNotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
    expect(screen.getByText("This page does not exist.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
