import { afterLoginPath, loginHref } from "./loginRedirect";

describe("after signing in", () => {
  it("goes back to the page that asked, when the role may open it", () => {
    expect(afterLoginPath("/dashboard/approvals?page=2", "MANAGER")).toBe(
      "/dashboard/approvals?page=2",
    );
    expect(afterLoginPath("/dashboard/reports/team?month=2026-09", "SUPER_ADMIN")).toBe(
      "/dashboard/reports/team?month=2026-09",
    );
  });

  it("goes home when the page is not this role's", () => {
    expect(afterLoginPath("/dashboard/approvals", "USER")).toBe("/dashboard/me");
    expect(afterLoginPath("/dashboard/settings", "MANAGER")).toBe("/dashboard/manager");
  });

  it("goes home without a redirect, or with one that is not a dashboard page", () => {
    expect(afterLoginPath(null, "MANAGER")).toBe("/dashboard/manager");
    expect(afterLoginPath("/auth/login?redirect=%2Fdashboard", "MANAGER")).toBe(
      "/dashboard/manager",
    );
    expect(afterLoginPath("/dashboardish", "MANAGER")).toBe("/dashboard/manager");
  });

  it.each([
    "https://evil.test/dashboard",
    "//evil.test/dashboard",
    "/\\evil.test/dashboard",
    "/%5Cevil.test",
    "/\t/evil.test/dashboard",
    "javascript:alert(1)",
  ])("never leaves the site: %p", (redirect) => {
    expect(afterLoginPath(redirect, "SUPER_ADMIN")).toBe("/dashboard/admin");
  });
});

describe("loginHref", () => {
  it("remembers a dashboard page", () => {
    expect(loginHref("/dashboard/team-today")).toBe(
      "/auth/login?redirect=%2Fdashboard%2Fteam-today",
    );
  });

  it("is the plain sign-in page for anything else", () => {
    expect(loginHref("/auth/login")).toBe("/auth/login");
    expect(loginHref("//evil.test/dashboard")).toBe("/auth/login");
    expect(loginHref(undefined)).toBe("/auth/login");
  });
});
