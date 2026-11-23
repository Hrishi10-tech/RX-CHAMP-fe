import { act, render } from "@testing-library/react";

import { PageTitle, pageHeading, titleFor } from "./PageTitle";

jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard/team-today" }));

// U-2: one title per page, from the page's own heading.
describe("PageTitle", () => {
  it("names the page, then the product", () => {
    expect(titleFor("Team today")).toBe("Team today · RX Vision");
    expect(titleFor("  Leave \n balances ")).toBe("Leave balances · RX Vision");
    expect(titleFor(null)).toBe("RX Vision");
  });

  it("reads the h1, or the name a page gives itself", () => {
    document.body.innerHTML = "<main><h1>Hello, Vikram</h1></main>";
    expect(pageHeading()).toBe("Hello, Vikram");
    document.body.innerHTML = '<main><h1 data-page-title="My dashboard">Hello, Vikram</h1></main>';
    expect(pageHeading()).toBe("My dashboard");
  });

  it("sets the document title, and follows a heading that arrives later", async () => {
    document.body.innerHTML = "";
    document.title = "RX Vision";
    render(<PageTitle />);
    expect(document.title).toBe("RX Vision");
    await act(async () => {
      const h1 = document.createElement("h1");
      h1.textContent = "Approvals";
      document.body.appendChild(h1);
      await Promise.resolve();
    });
    expect(document.title).toBe("Approvals · RX Vision");
  });
});
