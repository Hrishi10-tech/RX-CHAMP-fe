import { resolveReturnTo, withReturnTo } from "./returnTo";

/** Stands in for the URLSearchParams a page gets from useSearchParams(). */
function params(query: string) {
  return new URLSearchParams(query);
}

const FALLBACK = { href: "/dashboard/admin/team-management", label: "Team Management" };

describe("withReturnTo", () => {
  it("adds the origin and label to a plain link", () => {
    const href = withReturnTo("/dashboard/manager/activity/u-1", "/dashboard/manager", "My Team");
    const url = new URL(href, "https://x.test");

    expect(url.pathname).toBe("/dashboard/manager/activity/u-1");
    expect(url.searchParams.get("from")).toBe("/dashboard/manager");
    expect(url.searchParams.get("fromLabel")).toBe("My Team");
  });

  it("keeps a link's existing query intact", () => {
    const href = withReturnTo("/a?name=Uma%20C", "/b", "Back");
    const url = new URL(href, "https://x.test");

    expect(url.searchParams.get("name")).toBe("Uma C");
    expect(url.searchParams.get("from")).toBe("/b");
  });

  it("survives a round trip with characters that need escaping", () => {
    const from = "/dashboard/admin/team-management/organization/1/manager/2?org=A%20%26%20B";
    const href = withReturnTo("/target", from, "A & B");
    const url = new URL(href, "https://x.test");

    expect(resolveReturnTo(url.searchParams, FALLBACK)).toEqual({ href: from, label: "A & B" });
  });
});

describe("resolveReturnTo", () => {
  it("uses the caller's origin and label", () => {
    expect(
      resolveReturnTo(params("from=%2Fdashboard%2Fmanager&fromLabel=My%20Team"), FALLBACK),
    ).toEqual({ href: "/dashboard/manager", label: "My Team" });
  });

  it("falls back when arriving fresh — a reload or a bookmark", () => {
    expect(resolveReturnTo(params(""), FALLBACK)).toEqual(FALLBACK);
  });

  it("falls back to its own label when only the path is given", () => {
    expect(resolveReturnTo(params("from=%2Fdashboard%2Fmanager"), FALLBACK)).toEqual({
      href: "/dashboard/manager",
      label: FALLBACK.label,
    });
  });

  it("ignores a blank label rather than rendering an empty back link", () => {
    expect(resolveReturnTo(params("from=%2Fa&fromLabel=%20%20"), FALLBACK).label).toBe(
      FALLBACK.label,
    );
  });

  // The value is attacker-controllable — it comes off the URL — so a back link must
  // never be able to point off-site.
  it.each([
    ["absolute http", "https://evil.test/phish"],
    ["protocol-relative", "//evil.test/phish"],
    ["scheme-relative javascript", "javascript:alert(1)"],
    ["not a path", "dashboard/manager"],
  ])("refuses %s and falls back", (_label, from) => {
    expect(resolveReturnTo(params(`from=${encodeURIComponent(from)}`), FALLBACK)).toEqual(FALLBACK);
  });
});
