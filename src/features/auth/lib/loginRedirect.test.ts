import { NO_GRANTS } from "@/constants/roles";
import { afterLoginPath, loginHref } from "./loginRedirect";

describe("after signing in", () => {
  it("goes back to the page that asked, when the role may open it", () => {
    expect(afterLoginPath("/dashboard/approvals?page=2", "MANAGER")).toBe(
      "/dashboard/approvals?page=2",
    );
    expect(afterLoginPath("/dashboard/reports/team?month=2026-09", "ADMIN")).toBe(
      "/dashboard/reports/team?month=2026-09",
    );
    expect(afterLoginPath("/dashboard/organisations", "SUPER_ADMIN")).toBe(
      "/dashboard/organisations",
    );
  });

  it("goes home when the page is not this role's", () => {
    expect(afterLoginPath("/dashboard/settings", "MANAGER")).toBe("/dashboard/overview");
    expect(afterLoginPath("/dashboard/organisations", "ADMIN")).toBe("/dashboard/overview");
  });

  it("keeps a manager without grants off the Team page", () => {
    expect(afterLoginPath("/dashboard/team", "MANAGER", NO_GRANTS)).toBe("/dashboard/overview");
    expect(afterLoginPath("/dashboard/team", "MANAGER", { ...NO_GRANTS, timeline: true })).toBe(
      "/dashboard/team",
    );
  });

  it("sends Staff to the sign-in page that tells them to use the app", () => {
    expect(afterLoginPath("/dashboard/approvals", "USER")).toBe("/auth/login?reason=staff");
    expect(afterLoginPath(null, "USER")).toBe("/auth/login?reason=staff");
  });

  it("goes home without a redirect, or with one that is not a dashboard page", () => {
    expect(afterLoginPath(null, "MANAGER")).toBe("/dashboard/overview");
    expect(afterLoginPath("/auth/login?redirect=%2Fdashboard", "MANAGER")).toBe(
      "/dashboard/overview",
    );
    expect(afterLoginPath("/dashboardish", "MANAGER")).toBe("/dashboard/overview");
  });

  it.each([
    "https://evil.test/dashboard",
    "//evil.test/dashboard",
    "/\\evil.test/dashboard",
    "/%5Cevil.test",
    "/\t/evil.test/dashboard",
    "javascript:alert(1)",
  ])("never leaves the site: %p", (redirect) => {
    expect(afterLoginPath(redirect, "SUPER_ADMIN")).toBe("/dashboard/overview");
  });
});

describe("loginHref", () => {
  it("remembers a dashboard page", () => {
    expect(loginHref("/dashboard/team")).toBe("/auth/login?redirect=%2Fdashboard%2Fteam");
  });

  it("is the plain sign-in page for anything else", () => {
    expect(loginHref("/auth/login")).toBe("/auth/login");
    expect(loginHref("//evil.test/dashboard")).toBe("/auth/login");
    expect(loginHref(undefined)).toBe("/auth/login");
  });
});
